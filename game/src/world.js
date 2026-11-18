// world.js — builds Coral Bay: ground, roads, buildings, beach, ocean, props,
// the road graph traffic drives on, collision boxes and pickups.
//
// Polish pass: the beach gets umbrella meshes to match its ground texture,
// sidewalks get hydrants and benches, the diner gets a neon sign that glows
// at dusk, Big Sal's compound stands on the north edge, and street pickups
// now include ammo crates.
import * as THREE from 'three';
import { CONFIG, PALETTE, LANDMARKS } from './config.js';
import { makeGroundTexture, makeFacadeTexture, makeSignTexture, makeNeonSignTexture, makeGlowTexture } from './textures.js';
import { pick, range, rangeInt } from './random.js';

const ROADS = [];
for (let v = -280; v <= 280; v += 80) ROADS.push(v);
const BLOCKS = [];
for (let v = -240; v <= 240; v += 80) BLOCKS.push(v);

export class World {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = []; // {minX,maxX,minZ,maxZ}
    this.pickups = []; // {mesh, kind, x, z, taken, respawn}
    this.lampMats = [];
    this.beacon = null;
    this.beaconLight = null;
    this.sun = null;
    this.hemi = null;
    this.build();
  }

  build() {
    const rng = this.rng;
    const scene = this.scene;

    // Ground: one textured plane for the whole city.
    const groundTex = makeGroundTexture();
    this.groundTexture = groundTex;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.cityHalf * 2, CONFIG.cityHalf * 2),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ocean: a big teal plane east of the beach, slightly below the sand.
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(360, CONFIG.cityHalf * 2 + 80),
      new THREE.MeshStandardMaterial({ color: PALETTE.ocean, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(CONFIG.oceanX + 180, -0.4, 0);
    scene.add(ocean);

    // Lights.
    this.hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 0.9);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(PALETTE.sunDusk, 1.6);
    this.sun.position.set(120, 180, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -160;
    this.sun.shadow.camera.right = 160;
    this.sun.shadow.camera.top = 160;
    this.sun.shadow.camera.bottom = -160;
    this.sun.shadow.camera.far = 600;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Buildings, one (or two) per block.
    const facadeMats = [];
    for (let v = 0; v < 6; v += 1) {
      const base = '#' + new THREE.Color(pick(rng, PALETTE.buildingBase)).getHexString();
      facadeMats.push(new THREE.MeshStandardMaterial({ map: makeFacadeTexture(base, v, 0.45), roughness: 0.9 }));
    }
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 1 });
    const landmarkByBlock = {};
    for (const [key, lm] of Object.entries(LANDMARKS)) {
      landmarkByBlock[`${lm.x},${lm.z}`] = { key, ...lm };
    }
    let bIndex = 0;
    for (const bx of BLOCKS) {
      for (const bz of BLOCKS) {
        // East column is beach — no buildings. South-west block is the park.
        if (bx >= 240) continue;
        if (bx === -240 && bz === 200) continue;
        const lm = landmarkByBlock[`${bx},${bz}`];
        const w = lm ? 44 : range(rng, 30, 46);
        const d = lm ? 40 : range(rng, 30, 46);
        const distC = Math.hypot(bx, bz);
        const h = lm ? (lm.key === 'bank' ? 30 : 16) : range(rng, 12, 14 + Math.max(0, 34 - distC * 0.09));
        const mat = facadeMats[bIndex % facadeMats.length];
        bIndex += 1;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(bx, h / 2, bz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1, d + 1), roofMat);
        roof.position.set(bx, h + 0.5, bz);
        scene.add(roof);
        // Roof clutter: AC units.
        for (let k = 0; k < 2; k += 1) {
          const ac = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 3), roofMat);
          ac.position.set(bx + range(rng, -w / 4, w / 4), h + 1.8, bz + range(rng, -d / 4, d / 4));
          scene.add(ac);
        }
        this.colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
        if (lm) this.addSign(lm, bx, h, bz, w);
      }
    }

    // Park trees + benches in the south-west block.
    for (let i = 0; i < 14; i += 1) {
      this.addPalm(-240 + range(rng, -28, 28), 200 + range(rng, -32, 32));
    }
    for (let i = 0; i < 6; i += 1) {
      this.addBench(-240 + range(rng, -26, 26), 200 + range(rng, -30, 30));
    }
    // Palms along the beach.
    for (let z = -280; z <= 280; z += 40) {
      this.addPalm(262 + range(rng, -4, 4), z + range(rng, -8, 8));
    }
    // Beach umbrellas on the sand, matching the dots in the ground texture.
    for (let i = 0; i < 10; i += 1) {
      this.addUmbrella(258 + (i % 2) * 16, -240 + i * 52, pick(rng, PALETTE.umbrella));
    }
    // Hydrants at scattered intersection corners (small red cylinders).
    const hydMat = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.6 });
    for (let i = 0; i < 12; i += 1) {
      const a = pick(rng, ROADS);
      const b = pick(rng, ROADS);
      const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8), hydMat);
      hyd.position.set(a + 9, 0.45, b - 9);
      hyd.castShadow = true;
      scene.add(hyd);
    }
    // Street lamps at every other intersection corner.
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.6, metalness: 0.6 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc95e, emissiveIntensity: 1.4 });
    this.lampMats.push(bulbMat);
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6, 6);
    const bulbGeo = new THREE.SphereGeometry(0.35, 8, 6);
    for (const a of ROADS) {
      for (const b of ROADS) {
        if ((a + b) % 160 !== 0) continue;
        const pole = new THREE.Mesh(poleGeo, lampMat);
        pole.position.set(a + 9, 3, b + 9);
        scene.add(pole);
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(a + 9, 6.1, b + 9);
        scene.add(bulb);
      }
    }
    // Pier planks + posts at the east edge.
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 1 });
    const pier = new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 16), pierMat);
    pier.position.set(282, 0.8, 0);
    pier.castShadow = true;
    scene.add(pier);
    for (let x = 266; x <= 300; x += 11) {
      for (const dz of [-7, 7]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 6), pierMat);
        post.position.set(x, -0.8, dz);
        scene.add(post);
      }
    }

    // Mission beacon: a glowing column + light, moved by the mission system.
    const glowTex = makeGlowTexture();
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 42, 12, 1, true),
      new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffd25a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.beacon.position.set(0, 21, 0);
    this.beacon.visible = false;
    scene.add(this.beacon);
    this.beaconLight = new THREE.PointLight(0xffd25a, 30, 40);
    this.beaconLight.position.set(0, 6, 0);
    this.beaconLight.visible = false;
    scene.add(this.beaconLight);

    this.spawnPickups();
  }

  addSign(lm, bx, h, bz, w) {
    const colors = {
      diner: ['#c25a3a', '#fff2d0'],
      garage: ['#2e6fc2', '#ffffff'],
      bank: ['#3a3d44', '#ffd25a'],
      safehouse: ['#3ba86b', '#ffffff'],
      hospital: ['#e8e8e8', '#c23b2e'],
      policeHQ: ['#1c2f6e', '#ffffff'],
      compound: ['#4a2a5a', '#ffd25a'],
    };
    // The diner gets a neon sign that glows at dusk instead of a flat board.
    if (lm.key === 'diner') {
      const tex = makeNeonSignTexture("MAMA ROSA'S", '#ff7a5c');
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(26, 6.5),
        new THREE.MeshBasicMaterial({ map: tex, transparent: false }),
      );
      sign.position.set(bx, Math.min(h - 2, 12), bz + 21);
      this.scene.add(sign);
      return;
    }
    const [bg, fg] = colors[lm.key] || ['#333333', '#ffffff'];
    const tex = makeSignTexture(lm.name.toUpperCase(), bg, fg);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(30, w), 5.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: false }),
    );
    // Face the nearest road (south side of the building).
    sign.position.set(bx, Math.min(h - 2, 12), bz + 21);
    this.scene.add(sign);
  }

  addPalm(x, z) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4f, roughness: 1 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.castShadow = true;
    this.scene.add(trunk);
    for (let i = 0; i < 5; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 4), leafMat);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 1.2, 7.6, z + Math.sin(a) * 1.2);
      leaf.rotation.z = Math.cos(a) * 0.9;
      leaf.rotation.x = -Math.sin(a) * 0.9;
      this.scene.add(leaf);
    }
  }

  // A park bench: two slats on a frame.
  addBench(x, z) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 1 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.6), wood);
    seat.position.set(x, 0.55, z);
    seat.castShadow = true;
    this.scene.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.1), wood);
    back.position.set(x, 0.95, z - 0.28);
    this.scene.add(back);
  }

  // A beach umbrella: a tilted cone on a pole.
  addUmbrella(x, z, color) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.8 }),
    );
    pole.position.set(x, 1.2, z);
    this.scene.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.0, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    );
    top.position.set(x, 2.8, z);
    top.castShadow = true;
    this.scene.add(top);
  }

  spawnPickups() {
    const defs = [];
    for (let i = 0; i < 8; i += 1) defs.push('cash');
    defs.push('armor', 'armor', 'health', 'health', 'ammo', 'ammo');
    const colors = { cash: 0x37d67a, armor: 0x4b8ad9, health: 0xe84b6b, ammo: 0xffa02e };
    const taken = new Set();
    for (const kind of defs) {
      let x = 0;
      let z = 0;
      for (let tries = 0; tries < 20; tries += 1) {
        x = Math.round((this.rng() * 2 - 1) * 280 / 80) * 80 + (this.rng() > 0.5 ? 10 : -10);
        z = Math.round((this.rng() * 2 - 1) * 280 / 80) * 80 + (this.rng() > 0.5 ? 10 : -10);
        const key = `${x},${z}`;
        if (!taken.has(key) && Math.abs(x) < 250 && Math.abs(z) < 300) {
          taken.add(key);
          break;
        }
      }
      const color = colors[kind];
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.4, 0.4),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 }),
      );
      mesh.position.set(x, 1.2, z);
      mesh.rotation.y = 0.6;
      this.scene.add(mesh);
      this.pickups.push({ mesh, kind, x, z, taken: false, respawn: 0 });
    }
  }

  // Circle vs building AABB: push the circle out, return true on hit.
  collideCircle(p, r) {
    let hit = false;
    for (const c of this.colliders) {
      const nx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - nx;
      const dz = p.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          p.x = nx + (dx / d) * r;
          p.z = nz + (dz / d) * r;
        } else {
          // Centre inside the box: push out along the smallest axis.
          const l = p.x - c.minX;
          const rr = c.maxX - p.x;
          const t = p.z - c.minZ;
          const b = c.maxZ - p.z;
          const m = Math.min(l, rr, t, b);
          if (m === l) p.x = c.minX - r;
          else if (m === rr) p.x = c.maxX + r;
          else if (m === t) p.z = c.minZ - r;
          else p.z = c.maxZ + r;
        }
      }
    }
    // World bounds.
    p.x = Math.max(-308, Math.min(308, p.x));
    p.z = Math.max(-308, Math.min(308, p.z));
    return hit;
  }

  isOnRoad(x, z) {
    for (const v of ROADS) {
      if (Math.abs(x - v) < CONFIG.roadWidth / 2 + 1) return true;
      if (Math.abs(z - v) < CONFIG.roadWidth / 2 + 1) return true;
    }
    return false;
  }

  // Nearest intersection node to a point.
  nearestNode(x, z) {
    let best = null;
    let bd = Infinity;
    for (const a of ROADS) {
      for (const b of ROADS) {
        const d = (x - a) * (x - a) + (z - b) * (z - b);
        if (d < bd) {
          bd = d;
          best = { x: a, z: b };
        }
      }
    }
    return best;
  }

  // A loop route around one city block (its four corners, on the roads).
  blockLoop(bx, bz) {
    const hw = CONFIG.roadSpacing / 2; // 40
    return [
      { x: bx - hw, z: bz - hw },
      { x: bx + hw, z: bz - hw },
      { x: bx + hw, z: bz + hw },
      { x: bx - hw, z: bz + hw },
    ];
  }

  randomBlock() {
    const bx = BLOCKS[Math.floor(this.rng() * BLOCKS.length)];
    const bz = BLOCKS[Math.floor(this.rng() * BLOCKS.length)];
    return { bx, bz };
  }

  setBeacon(x, z, visible) {
    this.beacon.visible = visible;
    this.beaconLight.visible = visible;
    if (visible) {
      this.beacon.position.set(x, 21, z);
      this.beaconLight.position.set(x, 6, z);
    }
  }

  // Time of day: hour 0-24. Returns 0 (day) .. 1 (full night).
  setTimeOfDay(hour) {
    const scene = this.scene;
    // Sun elevation: peaks at 13:00, sets ~19:00, rises ~06:00.
    const dayFrac = Math.max(0, Math.min(1, (hour - 6) / 13));
    const night = hour < 6 || hour >= 19 ? 1 : hour >= 17.5 ? (hour - 17.5) / 1.5 : 0;
    const dusk = hour >= 16.5 && hour < 19 ? 1 - Math.abs(hour - 17.66) / 1.5 : 0;
    const sky = new THREE.Color(PALETTE.skyDay).lerp(new THREE.Color(PALETTE.skyDusk), Math.max(0, dusk));
    sky.lerp(new THREE.Color(PALETTE.skyNight), night);
    scene.background = sky;
    scene.fog = new THREE.Fog(sky.getHex(), 90, 420);
    const sunCol = new THREE.Color(PALETTE.sunDay).lerp(new THREE.Color(PALETTE.sunDusk), Math.max(0, dusk));
    this.sun.color.copy(sunCol);
    this.sun.intensity = 1.7 * (1 - night) + 0.12;
    this.hemi.intensity = 0.9 * (1 - night) + 0.25;
    const ang = (dayFrac * Math.PI * 0.9) + 0.1;
    this.sun.position.set(Math.cos(ang) * 220, Math.sin(ang) * 200 + 20, 90);
    for (const m of this.lampMats) m.emissiveIntensity = 0.4 + night * 1.6;
    return night;
  }
}
