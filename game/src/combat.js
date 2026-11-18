// combat.js — the player's pistol (hitscan), mission thugs that shoot back,
// tracers, muzzle flash and the WASTED check.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { range } from './random.js';

export class Combat {
  constructor(G) {
    this.G = G;
    this.enemies = []; // {mesh, x, z, heading, health, shootTimer, dead}
    this.tracers = [];
    this.flash = null;
    this.flashLight = null;
    this.raycaster = new THREE.Raycaster();
    this.buildFlash();
  }

  buildFlash() {
    const G = this.G;
    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.flashLight = new THREE.PointLight(0xffd98a, 0, 18);
    G.scene.add(this.flash);
    G.scene.add(this.flashLight);
    this.flashTimer = 0;
  }

  spawnThug(x, z) {
    const G = this.G;
    const g = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0x5a2a2a, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xb07a55, roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.36), jacket);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.name = 'torso';
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
    head.position.y = 1.68;
    head.name = 'head';
    g.add(head);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x111214 }));
    gun.position.set(0.3, 1.15, 0.4);
    g.add(gun);
    g.position.set(x, 0, z);
    G.scene.add(g);
    const e = { mesh: g, x, z, heading: 0, health: CONFIG.thugHealth, shootTimer: 1 + G.rng() * 1.5, dead: false, bar: null };
    // Health bar sprite above the head.
    const barGeo = new THREE.PlaneGeometry(1.1, 0.12);
    const barMat = new THREE.MeshBasicMaterial({ color: 0xe84b4b, side: THREE.DoubleSide });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, 2.15, 0);
    g.add(bar);
    e.bar = bar;
    this.enemies.push(e);
    return e;
  }

  clearEnemies() {
    for (const e of this.enemies) this.G.scene.remove(e.mesh);
    this.enemies = [];
  }

  // Player fires the pistol from the camera through the crosshair.
  playerShoot() {
    const G = this.G;
    const p = G.player;
    if (p.ammo <= 0) {
      G.audio.blip(220, 0.05, 'square', 0.15);
      return;
    }
    if (p.fireTimer > 0 || p.reloadTimer > 0) return;
    p.ammo -= 1;
    p.fireTimer = CONFIG.pistolFireGap;
    G.audio.shot();
    G.peds.scare(p.pos.x, p.pos.z, 40);
    if (G.police.wanted < 1) G.police.addWanted(1);
    // Muzzle flash at the camera.
    const cam = G.camera;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const origin = cam.position.clone().add(dir.clone().multiplyScalar(1.2));
    this.flash.position.copy(origin);
    this.flash.lookAt(origin.clone().add(dir));
    this.flash.material.opacity = 0.95;
    this.flashLight.position.copy(origin);
    this.flashLight.intensity = 26;
    this.flashTimer = 0.06;
    // Raycast against enemies, peds and the world.
    this.raycaster.set(cam.position, dir);
    this.raycaster.far = CONFIG.pistolRange;
    const targets = [];
    for (const e of this.enemies) if (!e.dead) targets.push(e.mesh);
    for (const ped of G.peds.peds) if (!ped.dead) targets.push(ped.mesh);
    const hits = this.raycaster.intersectObjects(targets, true);
    let end = origin.clone().add(dir.clone().multiplyScalar(CONFIG.pistolRange));
    if (hits.length > 0) {
      const hit = hits[0];
      end = hit.point.clone();
      let obj = hit.object;
      while (obj && !obj.userData.owner) obj = obj.parent;
      // Walk up to the group root and find its owner via traversal instead.
      let root = hit.object;
      while (root.parent && root.parent !== G.scene) root = root.parent;
      const enemy = this.enemies.find((e) => e.mesh === root);
      const ped = G.peds.peds.find((q) => q.mesh === root);
      if (enemy) {
        enemy.health -= CONFIG.pistolDamage;
        enemy.bar.scale.x = Math.max(0, enemy.health / CONFIG.thugHealth);
        G.hud.hitmarker(false);
        if (enemy.health <= 0) {
          enemy.dead = true;
          enemy.mesh.rotation.x = -Math.PI / 2;
          enemy.mesh.position.y = 0.3;
          G.hud.hitmarker(true);
          G.player.cash += 25;
        }
      } else if (ped) {
        G.peds.kill(ped);
        G.police.addWanted(1);
        G.hud.hitmarker(false);
      } else {
        // Hit the world: a puff of dust is too much; just end the tracer.
      }
    }
    this.addTracer(origin, end);
    G.shake = Math.max(G.shake, 0.08);
  }

  addTracer(a, b) {
    const G = this.G;
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    G.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
  }

  damagePlayer(amount, from) {
    const G = this.G;
    const p = G.player;
    if (G.state !== 'playing' || p.invuln > 0) return;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, amount);
      p.armor -= absorbed;
      amount -= absorbed;
    }
    p.health -= amount;
    p.invuln = 0.25;
    G.hud.flashDamage();
    G.shake = Math.max(G.shake, 0.25);
    if (p.health <= 0) {
      p.health = 0;
      G.wasted();
    }
  }

  update(dt) {
    const G = this.G;
    // Muzzle flash fade.
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flash.material.opacity = 0;
        this.flashLight.intensity = 0;
      }
    }
    // Tracers fade.
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        G.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
    // Thugs: walk toward the player and shoot with inaccuracy.
    const p = G.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = p.pos.x - e.x;
      const dz = p.pos.z - e.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = want - e.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      e.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      if (dist > 9) {
        e.x += Math.sin(e.heading) * 3.4 * dt;
        e.z += Math.cos(e.heading) * 3.4 * dt;
        const pp = { x: e.x, z: e.z };
        G.world.collideCircle(pp, 0.5);
        e.x = pp.x;
        e.z = pp.z;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 42) {
        e.shootTimer = 1.1 + G.rng() * 0.9;
        // Inaccurate: hits ~55% at close range, less far away.
        const hitChance = Math.max(0.2, 0.65 - dist * 0.01);
        if (G.rng() < hitChance) {
          this.damagePlayer(CONFIG.thugDamage, e);
          G.audio.blip(140, 0.08, 'square', 0.2);
        } else {
          G.audio.blip(300, 0.05, 'square', 0.08);
        }
        const from = new THREE.Vector3(e.x, 1.4, e.z);
        const to = new THREE.Vector3(p.pos.x, 1.2, p.pos.z);
        this.addTracer(from, to);
      }
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = e.heading;
      if (e.bar) e.bar.lookAt(G.camera.position);
    }
  }
}
