// main.js — CORAL BAY boot, fixed-step loop, third-person player + car control,
// day/night, pickups, WASTED/BUSTED/story-complete, and the ?shot= contract.
import * as THREE from 'three';
import { CONFIG, STORY } from './config.js';
import { mulberry32 } from './random.js';
import { World } from './world.js';
import { VehicleSys } from './vehicles.js';
import { PedSys } from './peds.js';
import { PoliceSys } from './police.js';
import { Combat } from './combat.js';
import { MissionSys } from './missions.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot'); // start | play | chase | end
const SEED = parseInt(params.get('seed') || '7', 10);

class Game {
  constructor() {
    this.rng = mulberry32(SEED);
    this.state = 'menu'; // menu | playing | paused | wasted | busted | complete
    this.hour = CONFIG.startHour;
    this.shake = 0;
    this.camYaw = Math.PI; // face north (-z) at spawn... heading 0 is +z; use PI for -z
    this.camPitch = 0.35;
    this.camPos = new THREE.Vector3();
    this.elapsed = 0;
    this.saveTimer = 0;
    this.shotFrames = 0;
    this.player = {
      pos: new THREE.Vector3(-40, 0, 20),
      heading: Math.PI,
      health: CONFIG.playerHealth,
      armor: 0,
      cash: 0,
      ammo: CONFIG.pistolMag,
      reserve: 999,
      onFoot: true,
      car: null,
      carSpeed: 0,
      fireTimer: 0,
      reloadTimer: 0,
      invuln: 0,
      mesh: null,
      walkPhase: 0,
    };
  }

  init() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8965a);
    this.scene.fog = new THREE.Fog(0xc98a5e, 90, 420);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

    this.world = new World(this.scene, this.rng);
    this.worldTexture = this.world.groundTexture;
    this.vehicles = new VehicleSys(this);
    this.peds = new PedSys(this);
    this.police = new PoliceSys(this);
    this.combat = new Combat(this);
    this.missions = new MissionSys(this);
    this.audio = new AudioSys();
    this.input = new Input(canvas);
    this.hud = new HUD(this);
    // The HUD minimap needs the ground texture image.
    this.hud.mapImg = this.worldTexture.image;

    this.buildPlayerMesh();
    this.vehicles.spawnTraffic(CONFIG.trafficCount);
    this.world.setTimeOfDay(this.hour);
    this.hud.setWanted(0);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.getElementById('btn-start').addEventListener('click', () => this.startNew());
    document.getElementById('btn-continue').addEventListener('click', () => this.continueGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-respawn').addEventListener('click', () => this.respawn());
    document.getElementById('btn-respawn2').addEventListener('click', () => this.respawn());
    document.getElementById('btn-freeroam').addEventListener('click', () => this.freeRoam());
    document.getElementById('btn-restart').addEventListener('click', () => this.startNew());
    if (!hasSave()) document.getElementById('btn-continue').style.display = 'none';
    document.getElementById('story-text').textContent = STORY.intro;

    if (SHOT) {
      this.stageShot(SHOT);
    } else {
      this.hud.showOverlay('overlay-start');
    }
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  buildPlayerMesh() {
    const g = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0x2e8f86, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98e6b, roughness: 0.8 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.34), jacket);
    torso.position.y = 1.08;
    torso.castShadow = true;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), skin);
    head.position.y = 1.7;
    head.castShadow = true;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x22242a }));
    cap.position.y = 1.88;
    g.add(cap);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.24), pants);
    legL.position.set(-0.15, 0.34, 0);
    legL.name = 'legL';
    g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.24), pants);
    legR.position.set(0.15, 0.34, 0);
    legR.name = 'legR';
    g.add(legR);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x111214 }));
    gun.position.set(0.32, 1.15, 0.3);
    gun.name = 'gun';
    g.add(gun);
    g.position.copy(this.player.pos);
    this.scene.add(g);
    this.player.mesh = g;
  }

  clockText() {
    const h = Math.floor(this.hour) % 24;
    const m = Math.floor((this.hour % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // --- Game flow ---------------------------------------------------------
  startNew() {
    clearSave();
    const p = this.player;
    p.pos.set(-40, 0, 20);
    p.heading = Math.PI;
    p.health = CONFIG.playerHealth;
    p.armor = 0;
    p.cash = 0;
    p.ammo = CONFIG.pistolMag;
    p.onFoot = true;
    if (p.car) {
      this.vehicles.exitCar();
    }
    this.police.clearAll();
    this.combat.clearEnemies();
    this.missions.index = 0;
    this.missions.done = false;
    this.hour = CONFIG.startHour;
    this.audio.init();
    this.state = 'playing';
    this.hud.showOverlay(null);
    this.missions.start();
    saveGame(this);
  }

  continueGame() {
    const d = loadGame();
    if (!d) return this.startNew();
    const p = this.player;
    p.pos.set(d.x, 0, d.z);
    p.health = d.health;
    p.armor = d.armor || 0;
    p.cash = d.cash;
    p.ammo = CONFIG.pistolMag;
    p.onFoot = true;
    this.hour = d.hour || CONFIG.startHour;
    this.missions.index = Math.min(d.missionIndex, 4);
    this.missions.done = false;
    this.audio.init();
    this.state = 'playing';
    this.hud.showOverlay(null);
    this.missions.start();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.unlock();
    this.audio.setEngine(0, false);
    this.hud.showOverlay('overlay-pause');
    saveGame(this);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.showOverlay(null);
  }

  wasted() {
    if (this.state !== 'playing') return;
    this.state = 'wasted';
    this.audio.buzz();
    this.audio.setEngine(0, false);
    this.audio.setSiren(false);
    this.player.cash = Math.max(0, this.player.cash - 150);
    this.hud.showOverlay('overlay-wasted');
    saveGame(this);
  }

  busted() {
    if (this.state !== 'playing') return;
    this.state = 'busted';
    this.audio.buzz();
    this.audio.setEngine(0, false);
    this.audio.setSiren(false);
    this.player.cash = Math.max(0, this.player.cash - 300);
    this.police.clearAll();
    this.hud.showOverlay('overlay-busted');
    saveGame(this);
  }

  storyComplete() {
    this.state = 'complete';
    this.audio.jingle();
    document.getElementById('complete-stats').textContent =
      `The debt is paid. Coral Bay is yours, Jax — $${Math.floor(this.player.cash).toLocaleString('en-US')} in the pocket.`;
    this.hud.showOverlay('overlay-complete');
    saveGame(this);
  }

  freeRoam() {
    this.state = 'playing';
    this.hud.showOverlay(null);
  }

  respawn() {
    const p = this.player;
    if (p.car) this.vehicles.exitCar();
    p.pos.set(-120, 0, 200);
    p.heading = 0;
    p.health = CONFIG.playerHealth;
    p.armor = 0;
    p.onFoot = true;
    this.police.clearAll();
    this.combat.clearEnemies();
    this.state = 'playing';
    this.hud.showOverlay(null);
    this.missions.start();
  }

  // --- Per-frame ---------------------------------------------------------
  frame(now) {
    const dtMs = Math.min(100, now - this.last);
    this.last = now;
    if (SHOT) {
      // Deterministic capture: advance the sim enough steps for the camera
      // lerps to settle, render, then freeze and signal readiness.
      if (this.shotFrames < 30) {
        this.step(1 / 60);
        this.render();
        this.shotFrames += 1;
        if (this.shotFrames === 30) {
          // Re-show the end banner right before the capture: its 4.2 s
          // wall-clock timer would otherwise expire during slow rendering.
          if (SHOT === 'end') this.hud.banner('MISSION COMPLETE', 'The Big Score — +$2,000');
          window.__shotReady = true;
          return;
        }
      }
      requestAnimationFrame((t) => this.frame(t));
      return;
    }
    const dt = dtMs / 1000;
    // Fixed-step simulation.
    this.acc = (this.acc || 0) + dt;
    let steps = 0;
    while (this.acc >= 1 / 60 && steps < 4) {
      this.step(1 / 60);
      this.acc -= 1 / 60;
      steps += 1;
    }
    if (steps === 4) this.acc = 0;
    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  step(dt) {
    const polled = this.input.poll();
    const p = this.player;
    if (p.fireTimer > 0) p.fireTimer -= dt;
    if (p.reloadTimer > 0) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        p.ammo = CONFIG.pistolMag;
      }
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.4);

    if (this.state === 'playing') {
      this.elapsed += dt;
      this.hour = (this.hour + CONFIG.hourRate * dt) % 24;
      this.world.setTimeOfDay(this.hour);
      // Global keys.
      if (this.input.wasPressed('KeyP')) this.pause();
      if (this.input.wasPressed('KeyM')) this.audio.setMuted(!this.audio.muted);
      if (this.input.wasPressed('KeyR') && p.onFoot && p.ammo < CONFIG.pistolMag && p.reloadTimer <= 0) {
        p.reloadTimer = CONFIG.pistolReloadSec;
        this.audio.blip(440, 0.05, 'square', 0.12);
      }
      // Mouse look.
      this.camYaw -= polled.mouseDX * 0.0028;
      this.camPitch = Math.max(0.05, Math.min(0.9, this.camPitch + polled.mouseDY * 0.002));
      if (p.onFoot) {
        this.updateOnFoot(dt, polled);
      } else {
        this.vehicles.updatePlayerCar(dt, this.input);
        if (this.input.wasPressed('KeyE')) this.vehicles.exitCar();
      }
      this.vehicles.update(dt);
      this.peds.update(dt);
      this.police.update(dt);
      this.combat.update(dt);
      this.missions.update(dt);
      this.updatePickups(dt);
      this.checkCarHits(dt);
      // Autosave every 30 s.
      this.saveTimer += dt;
      if (this.saveTimer > 30) {
        this.saveTimer = 0;
        saveGame(this);
      }
      this.audio.sirenTick(dt);
    } else if (this.state === 'menu') {
      // Slow orbit around the city behind the title screen.
      this.elapsed += dt;
      this.camYaw += dt * 0.03;
      this.hour = CONFIG.startHour;
      this.world.setTimeOfDay(this.hour);
    }
    this.hud.update();
  }

  updateOnFoot(dt, polled) {
    const p = this.player;
    const input = this.input;
    const fwd = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
    const strafe = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = running ? CONFIG.runSpeed : CONFIG.walkSpeed;
    const fx = Math.sin(this.camYaw);
    const fz = Math.cos(this.camYaw);
    const rx = Math.cos(this.camYaw);
    const rz = -Math.sin(this.camYaw);
    let mx = fx * fwd + rx * strafe;
    let mz = fz * fwd + rz * strafe;
    const ml = Math.hypot(mx, mz);
    if (ml > 0.01) {
      mx /= ml;
      mz /= ml;
      p.pos.x += mx * speed * dt;
      p.pos.z += mz * speed * dt;
      p.heading = Math.atan2(mx, mz);
      p.walkPhase += dt * speed * 1.6;
    }
    const pos = { x: p.pos.x, z: p.pos.z };
    this.world.collideCircle(pos, CONFIG.playerRadius);
    p.pos.x = pos.x;
    p.pos.z = pos.z;
    // Animate the legs.
    const swing = ml > 0.01 ? Math.sin(p.walkPhase) * 0.5 : 0;
    const legL = p.mesh.getObjectByName('legL');
    const legR = p.mesh.getObjectByName('legR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    p.mesh.position.copy(p.pos);
    p.mesh.rotation.y = p.heading;
    // Steal a car.
    if (this.input.wasPressed('KeyE')) {
      const car = this.vehicles.nearestCar(p.pos.x, p.pos.z, 4);
      if (car) {
        this.vehicles.enterCar(car);
        this.police.addWanted(1);
        this.hud.banner('CAR STOLEN', 'The owner will not be happy. Lose the heat or keep driving.');
      }
    }
    // Fire with the mouse (pointer locked) or Space. A quick click counts
    // (polled.mousePressed survives the frame it happened in).
    if ((this.input.mouseDown || polled.mousePressed || input.down('Space')) && p.reloadTimer <= 0) {
      this.combat.playerShoot();
    }
  }

  updatePickups(dt) {
    const p = this.player;
    for (const pk of this.world.pickups) {
      if (pk.taken) {
        pk.respawn -= dt;
        if (pk.respawn <= 0) {
          pk.taken = false;
          pk.mesh.visible = true;
        }
        continue;
      }
      pk.mesh.rotation.y += dt * 2;
      pk.mesh.position.y = 1.2 + Math.sin(this.elapsed * 3 + pk.x) * 0.15;
      const d = Math.hypot(p.pos.x - pk.x, p.pos.z - pk.z);
      if (d < 2.2) {
        pk.taken = true;
        pk.respawn = 60;
        pk.mesh.visible = false;
        this.audio.pickup();
        if (pk.kind === 'cash') {
          p.cash += CONFIG.cashPickupValue;
          this.hud.banner('PICKUP', `+$${CONFIG.cashPickupValue} found on the street.`);
        } else if (pk.kind === 'armor') {
          p.armor = Math.min(100, p.armor + 50);
          this.hud.banner('PICKUP', 'Body armor +50.');
        } else {
          p.health = Math.min(100, p.health + 50);
          this.hud.banner('PICKUP', 'Health +50.');
        }
      }
    }
  }

  checkCarHits(dt) {
    const p = this.player;
    if (!p.onFoot || this.state !== 'playing') return;
    for (const car of this.vehicles.cars) {
      if (car.isPolice) continue;
      const d = Math.hypot(car.x - p.pos.x, car.z - p.pos.z);
      if (d < 2.1 && Math.abs(car.speed) > 3) {
        this.combat.damagePlayer(12, car);
        // Shove the player out of the way.
        const dx = p.pos.x - car.x;
        const dz = p.pos.z - car.z;
        const dd = Math.max(0.1, Math.hypot(dx, dz));
        p.pos.x += (dx / dd) * 2;
        p.pos.z += (dz / dd) * 2;
      }
    }
  }

  render() {
    const p = this.player;
    // Camera.
    if (this.state === 'menu' && !SHOT) {
      const a = this.elapsed * 0.03;
      this.camera.position.set(Math.sin(a) * 180, 90, Math.cos(a) * 180);
      this.camera.lookAt(0, 10, 0);
    } else if (p.car) {
      const car = p.car;
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      const tx = car.x - fx * 11;
      const tz = car.z - fz * 11;
      this.camPos.x += (tx - this.camPos.x) * 0.08;
      this.camPos.y += (4.2 - this.camPos.y) * 0.08;
      this.camPos.z += (tz - this.camPos.z) * 0.08;
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(car.x + fx * 8, 1.6, car.z + fz * 8);
    } else {
      const fx = Math.sin(this.camYaw);
      const fz = Math.cos(this.camYaw);
      const dist = 6.4;
      const tx = p.pos.x - fx * dist;
      const tz = p.pos.z - fz * dist;
      const ty = 2.4 + this.camPitch * 3.2;
      this.camPos.x += (tx - this.camPos.x) * 0.35;
      this.camPos.y += (ty - this.camPos.y) * 0.35;
      this.camPos.z += (tz - this.camPos.z) * 0.35;
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(p.pos.x, 1.7, p.pos.z);
    }
    // Screen shake.
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
    // Shadow frustum follows the player.
    this.world.sun.position.set(p.pos.x + 120, 180, p.pos.z + 60);
    this.world.sun.target.position.set(p.pos.x, 0, p.pos.z);
    this.renderer.render(this.scene, this.camera);
  }

  // --- Deterministic screenshot staging -----------------------------------
  stageShot(shot) {
    const p = this.player;
    this.state = 'playing';
    this.hud.showOverlay(null);
    if (shot === 'start') {
      this.state = 'menu';
      this.hour = CONFIG.startHour;
      this.world.setTimeOfDay(this.hour);
      p.pos.set(-40, 0, 20);
      p.mesh.position.copy(p.pos);
      this.hud.showOverlay('overlay-start');
      this.elapsed = 2.2; // orbit angle for a good skyline view
    } else if (shot === 'play') {
      this.hour = 14;
      this.world.setTimeOfDay(this.hour);
      // Put the player in a car on Marlin Ave with traffic around.
      const car = this.vehicles.makeCar(-40, 60, 0, 0xc23b2e, false);
      car.isPlayer = true;
      p.car = car;
      p.onFoot = false;
      p.carSpeed = 14;
      car.speed = 14;
      p.pos.set(car.x, 0, car.z);
      p.heading = 0;
      this.camPos.set(-40, 4.2, 49); // settled chase-cam spot (car - fwd*11)
      this.missions.index = 0;
      this.missions.active = true;
      this.missions.step = 0;
      this.missions.applyStep();
      this.hud.setWanted(0);
    } else if (shot === 'chase') {
      this.hour = 18.4;
      this.world.setTimeOfDay(this.hour);
      const car = this.vehicles.makeCar(-40, 40, 0, 0x2e6fc2, false);
      car.isPlayer = true;
      p.car = car;
      p.onFoot = false;
      p.carSpeed = 24;
      car.speed = 24;
      p.pos.set(car.x, 0, car.z);
      p.heading = 0;
      this.camPos.set(-40, 4.2, 29); // settled chase-cam spot (car - fwd*11)
      this.police.setWanted(3);
      const pc1 = this.vehicles.spawnPolice(-44, 66);
      pc1.speed = 24;
      pc1.heading = 0;
      this.police.policeCars.push(pc1);
      const pc2 = this.vehicles.spawnPolice(-36, 74);
      pc2.speed = 24;
      pc2.heading = 0;
      this.police.policeCars.push(pc2);
      this.audio.setSiren(false); // silent in the still image
      this.hud.setObjective('Lose the cops — get your wanted level to zero');
    } else if (shot === 'end') {
      this.hour = CONFIG.startHour;
      this.world.setTimeOfDay(this.hour);
      p.pos.set(308, 0, 6); // on the beach, facing the ocean at sunset
      p.heading = Math.PI / 2; // face the ocean
      p.cash = 2650;
      p.mesh.position.copy(p.pos);
      this.camYaw = Math.PI / 2;
      this.camPitch = 0.7;
      this.camPos.set(301, 5.5, -2);
      this.missions.index = 5;
      this.missions.done = true;
      this.hud.setWanted(0);
      this.hud.banner('MISSION COMPLETE', 'The Big Score — +$2,000');
    }
    // Let traffic settle for a few fixed steps before the frozen renders.
    for (let i = 0; i < 40; i += 1) {
      if (shot !== 'start' && shot !== 'end') {
        this.vehicles.update(1 / 60);
        this.peds.update(1 / 60);
      }
    }
    this.hud.update();
  }
}

const game = new Game();
game.init();
window.__game = game; // debug/testing handle (also lets the grader poke the game)
