// peds.js — pedestrians strolling the sidewalks, fleeing when shots ring out.
import * as THREE from 'three';
import { CONFIG, PALETTE } from './config.js';
import { pick, range } from './random.js';

const ROADS = [];
for (let v = -280; v <= 280; v += 80) ROADS.push(v);

export class PedSys {
  constructor(G) {
    this.G = G;
    this.peds = [];
    this.group = new THREE.Group();
    G.scene.add(this.group);
    this.spawn(CONFIG.pedCount);
  }

  makePed(x, z) {
    const G = this.G;
    const shirt = pick(G.rng, PALETTE.pedShirt);
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc98e6b, roughness: 0.8 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), bodyMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMat);
    head.position.y = 1.65;
    head.castShadow = true;
    g.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.22), legMat);
    legL.position.set(-0.14, 0.33, 0);
    legL.name = 'legL';
    g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.22), legMat);
    legR.position.set(0.14, 0.33, 0);
    legR.name = 'legR';
    g.add(legR);
    g.position.set(x, 0, z);
    this.group.add(g);
    return {
      mesh: g, x, z,
      heading: G.rng() * Math.PI * 2,
      speed: CONFIG.pedSpeed * range(G.rng, 0.8, 1.2),
      target: null,
      flee: 0,
      walkPhase: G.rng() * 6,
      dead: false,
    };
  }

  spawn(n) {
    const G = this.G;
    for (let i = 0; i < n; i += 1) {
      // Start on a sidewalk beside a random road.
      const road = pick(G.rng, ROADS);
      const along = range(G.rng, -280, 280);
      const side = G.rng() > 0.5 ? 1 : -1;
      const x = G.rng() > 0.5 ? road + side * 10 : along;
      const z = G.rng() > 0.5 ? along : road + side * 10;
      const ped = this.makePed(x, z);
      ped.target = this.nextTarget(ped);
      this.peds.push(ped);
    }
  }

  // Next sidewalk waypoint: a nearby intersection corner.
  nextTarget(ped) {
    const G = this.G;
    const node = G.world.nearestNode(ped.x, ped.z);
    const dx = range(G.rng, -80, 80);
    const dz = range(G.rng, -80, 80);
    return {
      x: Math.max(-300, Math.min(300, node.x + dx)),
      z: Math.max(-300, Math.min(300, node.z + dz)),
    };
  }

  scare(x, z, radius) {
    for (const ped of this.peds) {
      if (ped.dead) continue;
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < radius) {
        ped.flee = 6;
        ped.target = {
          x: ped.x + (ped.x - x) * 2,
          z: ped.z + (ped.z - z) * 2,
        };
      }
    }
  }

  update(dt) {
    const G = this.G;
    for (const ped of this.peds) {
      if (ped.dead) continue;
      if (ped.flee > 0) ped.flee -= dt;
      const t = ped.target;
      const dx = t.x - ped.x;
      const dz = t.z - ped.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2) {
        ped.target = this.nextTarget(ped);
        continue;
      }
      const want = Math.atan2(dx, dz);
      let diff = want - ped.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ped.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const spd = ped.flee > 0 ? ped.speed * 2.6 : ped.speed;
      ped.x += Math.sin(ped.heading) * spd * dt;
      ped.z += Math.cos(ped.heading) * spd * dt;
      const p = { x: ped.x, z: ped.z };
      G.world.collideCircle(p, 0.5);
      ped.x = p.x;
      ped.z = p.z;
      ped.walkPhase += dt * spd * 2.2;
      const swing = Math.sin(ped.walkPhase) * 0.45;
      const legL = ped.mesh.getObjectByName('legL');
      const legR = ped.mesh.getObjectByName('legR');
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
    }
  }

  // The ped nearest a point (for shooting).
  nearest(x, z, maxDist) {
    let best = null;
    let bd = maxDist;
    for (const ped of this.peds) {
      if (ped.dead) continue;
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < bd) {
        bd = d;
        best = ped;
      }
    }
    return best;
  }

  kill(ped) {
    ped.dead = true;
    ped.mesh.rotation.x = -Math.PI / 2;
    ped.mesh.position.y = 0.3;
  }
}
