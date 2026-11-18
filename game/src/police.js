// police.js — the wanted system: stars, police interceptors that chase and ram,
// foot cops that try to bust the player, and the slow decay back to clean.
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
    this.copGroup = new THREE.Group();
    G.scene.add(this.copGroup);
  }

  addWanted(n) {
    this.wanted = Math.max(0, Math.min(CONFIG.maxWanted, this.wanted + n));
    this.decayTimer = 0;
    this.G.hud.setWanted(this.wanted);
  }

  setWanted(n) {
    this.wanted = Math.max(0, Math.min(CONFIG.maxWanted, n));
    this.decayTimer = 0;
    this.G.hud.setWanted(this.wanted);
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
    // Despawn extra cars when the heat drops.
    while (this.policeCars.length > wantCars) {
      const car = this.policeCars.pop();
      G.vehicles.removeCar(car);
    }
    if (this.wanted === 0 && this.policeCars.length === 0) {
      G.audio.setSiren(false);
    }

    // Police cars chase the player and ram.
    for (const car of this.policeCars) {
      const tx = player.pos.x;
      const tz = player.pos.z;
      const dist = Math.hypot(tx - car.x, tz - car.z);
      const targetSpeed = Math.min(30, 13 + this.wanted * 3.2);
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
      // Steer with a little prediction of where the player is going.
      const px = tx + Math.sin(player.heading) * (player.car ? player.carSpeed : 0) * 0.35;
      const pz = tz + Math.cos(player.heading) * (player.car ? player.carSpeed : 0) * 0.35;
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
      // Ram the player's car: shove it and shake the camera.
      if (player.car && dist < 3.6) {
        const dx = player.car.x - car.x;
        const dz = player.car.z - car.z;
        const d = Math.max(0.1, Math.hypot(dx, dz));
        player.car.x += (dx / d) * 1.4;
        player.car.z += (dz / d) * 1.4;
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
      if (dist > 2) {
        cop.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.z += Math.cos(cop.heading) * cop.speed * dt;
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
    for (const cop of this.cops) this.copGroup.remove(cop.mesh);
    this.cops = [];
    this.setWanted(0);
    G.audio.setSiren(false);
  }
}
