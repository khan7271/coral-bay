// police.js — the wanted system: stars, police interceptors that chase and ram,
// foot cops that try to bust the player, and the slow decay back to clean.
//
// Polish pass: at 3+ stars the cops set a roadblock across the road ahead of
// the player; at 4+ stars interceptors PIT-manoeuvre (they aim ahead of the
// player and shove harder); foot cops sprint when far and walk when close;
// and every star gained plays a sting and switches the music to chase mode.
import * as THREE from 'three';
import { CONFIG } from './config.js';

export class PoliceSys {
  constructor(G) {
    this.G = G;
    this.wanted = 0;
    this.decayTimer = 0;
    this.spawnTimer = 0;
    this.policeCars = [];
    this.cops = []; // on-foot officers {mesh, x, z, heading, holdTimer}
    this.roadblock = null; // a parked interceptor across the road ahead
    this.copGroup = new THREE.Group();
    G.scene.add(this.copGroup);
  }

  addWanted(n) {
    const before = this.wanted;
    this.wanted = Math.max(0, Math.min(CONFIG.maxWanted, this.wanted + n));
    this.decayTimer = 0;
    if (this.wanted > before) this.onHeatUp();
    this.G.hud.setWanted(this.wanted);
  }

  setWanted(n) {
    const before = this.wanted;
    this.wanted = Math.max(0, Math.min(CONFIG.maxWanted, n));
    this.decayTimer = 0;
    if (this.wanted > before) this.onHeatUp();
    this.G.hud.setWanted(this.wanted);
  }

  // Heat went up: sting + chase music on.
  onHeatUp() {
    this.G.audio.wantedSting();
    this.G.audio.setChase(true);
  }

  makeCop(x, z) {
    const G = this.G;
    const g = new THREE.Group();
    const navy = new THREE.MeshStandardMaterial({ color: 0x1c2f6e, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98e6b, roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.34), navy);
    torso.position.y = 1.05;
    torso.castShadow = true;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
    head.position.y = 1.68;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 10), navy);
    cap.position.y = 1.86;
    g.add(cap);
    g.position.set(x, 0, z);
    this.copGroup.add(g);
    return { mesh: g, x, z, heading: 0, holdTimer: 0, speed: 5.2 };
  }

  // Park an interceptor sideways across the road ahead of the player.
  placeRoadblock() {
    const G = this.G;
    const player = G.player;
    // Ahead of the player along their heading, snapped to the nearest road.
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    const ax = player.pos.x + fx * 45;
    const az = player.pos.z + fz * 45;
    const node = G.world.nearestNode(ax, az);
    const horizontal = Math.abs(node.x - ax) < Math.abs(node.z - az);
    const bx = horizontal ? node.x : node.x + (ax > node.x ? 9 : -9);
    const bz = horizontal ? node.z + (az > node.z ? 9 : -9) : node.z;
    const car = G.vehicles.spawnPolice(bx, bz);
    car.heading = horizontal ? Math.PI / 2 : 0; // sideways across the road
    car.mesh.rotation.y = car.heading;
    car.speed = 0;
    car.roadblock = true;
    this.roadblock = car;
    this.policeCars.push(car);
  }

  clearRoadblock() {
    if (!this.roadblock) return;
    const G = this.G;
    G.vehicles.removeCar(this.roadblock);
    const i = this.policeCars.indexOf(this.roadblock);
    if (i >= 0) this.policeCars.splice(i, 1);
    this.roadblock = null;
  }

  update(dt) {
    const G = this.G;
    const player = G.player;
    if (G.state !== 'playing') return;

    // Decay: no new crime for a while drops a star.
    if (this.wanted > 0) {
      this.decayTimer += dt;
      if (this.decayTimer > CONFIG.wantedDecaySec) {
        this.decayTimer = 0;
        this.setWanted(this.wanted - 1);
      }
    }
    // Clean again: chase music off.
    if (this.wanted === 0) G.audio.setChase(false);

    // Spawn interceptors to match the wanted level (1 car per star, max 4).
    this.spawnTimer -= dt;
    const wantCars = Math.min(this.wanted, CONFIG.maxPoliceCars);
    if (this.wanted > 0 && this.policeCars.length < wantCars && this.spawnTimer <= 0) {
      this.spawnTimer = 2.5;
      const a = G.rng() * Math.PI * 2;
      const d = 55 + G.rng() * 25;
      const x = Math.max(-300, Math.min(300, player.pos.x + Math.cos(a) * d));
      const z = Math.max(-300, Math.min(300, player.pos.z + Math.sin(a) * d));
      const car = G.vehicles.spawnPolice(x, z);
      this.policeCars.push(car);
      G.audio.setSiren(true);
    }
    // Despawn extra cars when the heat drops. The roadblock is exempt: it
    // is an extra car on top of the wanted-level count, so the loop pops
    // the last chaser instead of the parked roadblock.
    while (this.policeCars.length > wantCars + (this.roadblock ? 1 : 0)) {
      let idx = this.policeCars.length - 1;
      while (idx >= 0 && this.policeCars[idx] === this.roadblock) idx -= 1;
      if (idx < 0) break;
      const car = this.policeCars[idx];
      this.policeCars.splice(idx, 1);
      G.vehicles.removeCar(car);
    }
    if (this.wanted === 0 && this.policeCars.length === 0) {
      G.audio.setSiren(false);
    }

    // Roadblock: one parked interceptor across the road at 3+ stars.
    if (this.wanted >= CONFIG.roadblockMinStars && !this.roadblock) {
      this.placeRoadblock();
    } else if (this.wanted < CONFIG.roadblockMinStars && this.roadblock) {
      this.clearRoadblock();
    }

    // Police cars chase the player and ram.
    for (const car of this.policeCars) {
      if (car.roadblock) continue; // parked sideways; it waits for you
      const tx = player.pos.x;
      const tz = player.pos.z;
      const dist = Math.hypot(tx - car.x, tz - car.z);
      const targetSpeed = Math.min(26 + this.wanted * 2, 13 + this.wanted * 3.2);
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
      // Steer with a little prediction of where the player is going. At 4+
      // stars the cops PIT: they aim further ahead and cut across the nose.
      const lookAhead = this.wanted >= 4 ? 0.7 : 0.35;
      const px = tx + Math.sin(player.heading) * (player.car ? player.carSpeed : 0) * lookAhead;
      const pz = tz + Math.cos(player.heading) * (player.car ? player.carSpeed : 0) * lookAhead;
      G.vehicles.steerToward(car, px, pz, dt, 2.4);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      const p = { x: car.x, z: car.z };
      if (G.world.collideCircle(p, 1.7)) {
        car.x = p.x;
        car.z = p.z;
        car.speed *= 0.6;
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      // Ram the player's car: shove it and shake the camera. Harder at
      // higher wanted levels (the PIT shove).
      if (player.car && dist < 3.6) {
        const dx = player.car.x - car.x;
        const dz = player.car.z - car.z;
        const d = Math.max(0.1, Math.hypot(dx, dz));
        const shove = 1.4 + this.wanted * 0.3;
        player.car.x += (dx / d) * shove;
        player.car.z += (dz / d) * shove;
        player.carSpeed *= 0.85;
        G.audio.thud();
        G.hud.flashDamage();
        G.shake = Math.max(G.shake, 0.35);
      }
      // Ram the player on foot: knock health down.
      if (player.onFoot && dist < 2.2) {
        G.combat.damagePlayer(14 * dt * 4, car);
      }
    }

    // Foot cops at 3+ stars: spawn near the player, run at them, hold to bust.
    if (this.wanted >= 3 && this.cops.length < this.wanted - 1) {
      const a = G.rng() * Math.PI * 2;
      const cop = this.makeCop(
        Math.max(-300, Math.min(300, player.pos.x + Math.cos(a) * 30)),
        Math.max(-300, Math.min(300, player.pos.z + Math.sin(a) * 30)),
      );
      this.cops.push(cop);
    }
    for (let i = this.cops.length - 1; i >= 0; i -= 1) {
      const cop = this.cops[i];
      if (this.wanted < 3) {
        this.copGroup.remove(cop.mesh);
        this.cops.splice(i, 1);
        continue;
      }
      const dx = player.pos.x - cop.x;
      const dz = player.pos.z - cop.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = want - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      // Sprint while far away, ease off when close enough to grab.
      const runSpeed = dist > 15 ? 6.8 : 5.2;
      if (dist > 2) {
        cop.x += Math.sin(cop.heading) * runSpeed * dt;
        cop.z += Math.cos(cop.heading) * runSpeed * dt;
        cop.holdTimer = 0;
      } else if (player.onFoot) {
        cop.holdTimer += dt;
        if (cop.holdTimer > CONFIG.bustedHoldSec) {
          G.busted();
          return;
        }
      }
      const p = { x: cop.x, z: cop.z };
      G.world.collideCircle(p, 0.5);
      cop.x = p.x;
      cop.z = p.z;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = cop.heading;
    }
  }

  clearAll() {
    const G = this.G;
    for (const car of this.policeCars) G.vehicles.removeCar(car);
    this.policeCars = [];
    this.roadblock = null;
    for (const cop of this.cops) this.copGroup.remove(cop.mesh);
    this.cops = [];
    this.setWanted(0);
    G.audio.setSiren(false);
    G.audio.setChase(false);
  }
}
