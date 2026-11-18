// vehicles.js — box-built cars, traffic AI that loops city blocks, arcade
// player-car physics, and police interceptors.
import * as THREE from 'three';
import { CONFIG, PALETTE } from './config.js';
import { pick, range } from './random.js';

const CAR_COLORS = PALETTE.carPaint;
const ROADS = [];
for (let v = -280; v <= 280; v += 80) ROADS.push(v);

export function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: isPolice ? PALETTE.policeWhite : color,
    roughness: 0.35,
    metalness: 0.5,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.2, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e2233, roughness: 0.1, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.58, 2.2), glass);
  cabin.position.set(0, 1.12, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  if (isPolice) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.42), new THREE.MeshStandardMaterial({ color: PALETTE.policeBlack, roughness: 0.5 }));
    skirt.position.y = 0.32;
    group.add(skirt);
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.4), dark);
    barBase.position.set(0, 1.5, -0.2);
    group.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }));
    red.position.set(-0.28, 1.5, -0.2);
    red.name = 'lightRed';
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 2 }));
    blue.position.set(0.28, 1.5, -0.2);
    blue.name = 'lightBlue';
    group.add(blue);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    group.add(w);
  }
  // Headlights.
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffedb0, emissiveIntensity: 1.2 });
  for (const wx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), hlMat);
    hl.position.set(wx, 0.6, 2.22);
    group.add(hl);
  }
  return group;
}

export class VehicleSys {
  constructor(G) {
    this.G = G;
    this.cars = []; // traffic + police; player car is G.player.car
    this.spawnTimer = 0;
  }

  makeCar(x, z, heading, color, isPolice) {
    const mesh = buildCarMesh(color, isPolice);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    this.G.scene.add(mesh);
    const car = {
      mesh, x, z, heading,
      speed: 0,
      color,
      isPolice: !!isPolice,
      isPlayer: false,
      route: null,
      routeIdx: 0,
      wait: 0,
      flash: 0,
      dead: false,
    };
    return car;
  }

  spawnTraffic(n) {
    const G = this.G;
    for (let i = 0; i < n; i += 1) {
      const { bx, bz } = G.world.randomBlock();
      const loop = G.world.blockLoop(bx, bz);
      const start = loop[Math.floor(G.rng() * loop.length)];
      const car = this.makeCar(start.x + range(G.rng, -3, 3), start.z + range(G.rng, -3, 3), G.rng() * Math.PI * 2, pick(G.rng, CAR_COLORS), false);
      car.route = loop;
      car.routeIdx = 0;
      car.speed = CONFIG.trafficSpeed * range(G.rng, 0.85, 1.1);
      this.cars.push(car);
    }
    // Parked cars along the roads, so stealing one is always possible.
    // (wait is effectively infinite; update() skips parked cars before
    // touching their null route, and exitCar hands them a route again.)
    for (let i = 0; i < 6; i += 1) {
      const road = ROADS[Math.floor(G.rng() * ROADS.length)];
      const along = range(G.rng, -260, 260);
      const side = G.rng() > 0.5 ? 1 : -1;
      const horizontal = G.rng() > 0.5;
      const x = horizontal ? along : road + side * 9;
      const z = horizontal ? road + side * 9 : along;
      const heading = horizontal
        ? (G.rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2)
        : (G.rng() > 0.5 ? 0 : Math.PI);
      const parked = this.makeCar(x, z, heading, pick(G.rng, CAR_COLORS), false);
      parked.route = null;
      parked.wait = 1e9;
      this.cars.push(parked);
    }
  }

  spawnPolice(x, z) {
    const car = this.makeCar(x, z, 0, 0, true);
    car.speed = 0;
    this.cars.push(car);
    return car;
  }

  removeCar(car) {
    this.G.scene.remove(car.mesh);
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
  }

  // Steering helper: turn heading toward a target point.
  steerToward(car, tx, tz, dt, maxTurn) {
    const dx = tx - car.x;
    const dz = tz - car.z;
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-maxTurn * dt, Math.min(maxTurn * dt, diff));
    car.heading += turn;
    return Math.abs(diff);
  }

  update(dt) {
    const G = this.G;
    // Traffic: follow their block loop, brake for the car ahead.
    for (const car of this.cars) {
      if (car.isPolice) continue;
      if (car.wait > 0) {
        car.wait -= dt;
        continue;
      }
      const target = car.route[car.routeIdx];
      const dx = target.x - car.x;
      const dz = target.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) {
        car.routeIdx = (car.routeIdx + 1) % car.route.length;
        // Sometimes switch to a neighbouring block's loop.
        if (G.rng() < 0.25) {
          const cur = car.route[car.routeIdx];
          const nb = G.world.nearestNode(cur.x, cur.z);
          const bx = Math.round((nb.x - 40) / 80) * 80;
          const bz = Math.round((nb.z - 40) / 80) * 80;
          car.route = G.world.blockLoop(Math.max(-240, Math.min(160, bx)), Math.max(-240, Math.min(240, bz)));
          car.routeIdx = 0;
        }
        continue;
      }
      // Brake if another car is close ahead.
      let blocked = false;
      for (const other of this.cars) {
        if (other === car) continue;
        const ox = other.x - car.x;
        const oz = other.z - car.z;
        const od = Math.hypot(ox, oz);
        if (od < 7 && od > 0.01) {
          const fx = Math.sin(car.heading);
          const fz = Math.cos(car.heading);
          if ((ox * fx + oz * fz) / od > 0.7) {
            blocked = true;
            break;
          }
        }
      }
      // Also brake for the player car ahead.
      const pc = G.player.car;
      if (pc) {
        const ox = pc.x - car.x;
        const oz = pc.z - car.z;
        const od = Math.hypot(ox, oz);
        if (od < 7 && od > 0.01) {
          const fx = Math.sin(car.heading);
          const fz = Math.cos(car.heading);
          if ((ox * fx + oz * fz) / od > 0.7) blocked = true;
        }
      }
      const targetSpeed = blocked ? 0 : CONFIG.trafficSpeed;
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2);
      this.steerToward(car, target.x, target.z, dt, 1.6);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      const p = { x: car.x, z: car.z };
      if (G.world.collideCircle(p, 1.6)) {
        car.x = p.x;
        car.z = p.z;
        car.speed *= 0.5;
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
    // Police light flash.
    for (const car of this.cars) {
      if (!car.isPolice) continue;
      car.flash += dt * 6;
      const on = Math.sin(car.flash) > 0;
      const red = car.mesh.getObjectByName('lightRed');
      const blue = car.mesh.getObjectByName('lightBlue');
      if (red) red.material.emissiveIntensity = on ? 2.5 : 0.2;
      if (blue) blue.material.emissiveIntensity = on ? 0.2 : 2.5;
    }
  }

  // --- Player car -------------------------------------------------------
  enterCar(car) {
    const G = this.G;
    // Traffic cars become the player's; remove from traffic list.
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
    car.isPlayer = true;
    G.player.car = car;
    G.player.onFoot = false;
    G.player.carSpeed = 0;
    G.audio.setEngine(0, true);
    return car;
  }

  exitCar() {
    const G = this.G;
    const car = G.player.car;
    if (!car) return;
    car.isPlayer = false;
    car.speed = 0;
    // Park it beside the player and hand it back to traffic.
    car.route = G.world.blockLoop(
      Math.max(-240, Math.min(160, Math.round((car.x - 40) / 80) * 80)),
      Math.max(-240, Math.min(240, Math.round((car.z - 40) / 80) * 80)),
    );
    car.routeIdx = 0;
    this.cars.push(car);
    G.player.car = null;
    G.player.onFoot = true;
    G.player.pos.set(car.x + 2.5, 0, car.z + 1.5);
    G.audio.setEngine(0, false);
  }

  updatePlayerCar(dt, input) {
    const G = this.G;
    const car = G.player.car;
    if (!car) return;
    const fwd = input.down('KeyW') || input.down('ArrowUp');
    const back = input.down('KeyS') || input.down('ArrowDown');
    const left = input.down('KeyA') || input.down('ArrowLeft');
    const right = input.down('KeyD') || input.down('ArrowRight');
    const handbrake = input.down('Space');
    let speed = G.player.carSpeed;
    if (fwd) speed += CONFIG.carAccel * dt;
    if (back) speed -= (speed > 0.5 ? CONFIG.carBrake : CONFIG.carAccel * 0.7) * dt;
    if (handbrake) speed *= Math.max(0, 1 - dt * 3);
    // Drag + off-road slowdown.
    speed -= speed * 0.35 * dt;
    if (!G.world.isOnRoad(car.x, car.z)) speed -= speed * 0.8 * dt;
    speed = Math.max(-CONFIG.carMaxReverse, Math.min(CONFIG.carMaxSpeed, speed));
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    const spdF = Math.min(1, Math.abs(speed) / 12);
    car.heading += steer * CONFIG.carTurn * spdF * dt * (speed >= 0 ? 1 : -1);
    const nx = car.x + Math.sin(car.heading) * speed * dt;
    const nz = car.z + Math.cos(car.heading) * speed * dt;
    const p = { x: nx, z: nz };
    if (G.world.collideCircle(p, 1.7)) {
      if (Math.abs(speed) > 8) {
        G.audio.thud();
        G.hud.flashDamage();
      }
      speed *= -0.25;
    } else {
      car.x = p.x;
      car.z = p.z;
    }
    // Bump other cars aside.
    for (const other of this.cars) {
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const d = Math.hypot(dx, dz);
      if (d < 3.4 && d > 0.01) {
        const push = (3.4 - d) * 0.5;
        other.x += (dx / d) * push;
        other.z += (dz / d) * push;
        other.mesh.position.set(other.x, 0, other.z);
        speed *= 0.97;
      }
    }
    G.player.carSpeed = speed;
    car.speed = speed;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    G.player.pos.set(car.x, 0, car.z);
    G.player.heading = car.heading;
    G.audio.setEngine(Math.abs(speed) / CONFIG.carMaxSpeed, true);
  }

  // Nearest stealable (non-police) car within range of a point.
  nearestCar(x, z, maxDist) {
    let best = null;
    let bd = maxDist;
    for (const car of this.cars) {
      if (car.isPolice) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bd) {
        bd = d;
        best = car;
      }
    }
    return best;
  }
}
