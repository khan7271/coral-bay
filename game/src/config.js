// CORAL BAY — open-world crime game. All names, story, art and sound are original.
// config.js — one place for every tunable number, the palette and the story.
export const CONFIG = {
  // City: a 640x640 m grid. Roads run every 80 m; blocks hold buildings.
  cityHalf: 320,
  roadSpacing: 80,
  roadWidth: 14,
  sidewalkWidth: 4,
  blockSize: 62,
  // The beach + ocean sit on the east edge (x > 250).
  beachX: 252,
  oceanX: 296,
  // Player.
  walkSpeed: 6.5,
  runSpeed: 10.5,
  playerRadius: 0.6,
  playerHealth: 100,
  // Cars.
  carAccel: 16,
  carBrake: 28,
  carMaxSpeed: 34,
  carMaxReverse: 10,
  carTurn: 1.9,
  trafficSpeed: 8.5,
  trafficCount: 14,
  // Pedestrians.
  pedCount: 26,
  pedSpeed: 1.6,
  // Police / wanted.
  maxWanted: 5,
  wantedDecaySec: 26,
  maxPoliceCars: 4,
  bustedHoldSec: 1.6,
  // Combat.
  pistolDamage: 34,
  pistolMag: 12,
  pistolRange: 90,
  pistolFireGap: 0.22,
  pistolReloadSec: 1.5,
  thugHealth: 70,
  thugDamage: 9,
  // Pickups.
  cashPickupValue: 50,
  // Day cycle: game clock starts at 17:40 (dusk) and advances slowly.
  startHour: 17.66,
  hourRate: 0.004,
};

// Dusk-to-night palette (own look: warm sodium + teal ocean).
export const PALETTE = {
  skyDay: 0x87b5d6,
  skyDusk: 0xe8965a,
  skyNight: 0x0b1026,
  fogDay: 0x9db8c6,
  fogDusk: 0xc98a5e,
  fogNight: 0x0d1328,
  sunDay: 0xfff2d0,
  sunDusk: 0xffb36b,
  hemiSky: 0x8fb8d8,
  hemiGround: 0x3a2f28,
  road: 0x2b2e33,
  sidewalk: 0x8d8578,
  sand: 0xd9c08a,
  ocean: 0x1d6f8e,
  grass: 0x4a7a44,
  buildingBase: [0x9a7b5f, 0x7d8aa0, 0xa08a6a, 0x8a6f7d, 0x6f8a7a, 0xb08a5a],
  carPaint: [0xc23b2e, 0x2e6fc2, 0xe8b93b, 0x3ba86b, 0x8a8f96, 0x5a3ba8, 0xd8d8d8, 0x22242a],
  policeWhite: 0xe8e8e8,
  policeBlack: 0x1c1e24,
  pedShirt: [0xd95f4b, 0x4b8ad9, 0x7ad94b, 0xd9b84b, 0xb04bd9, 0x4bd9c2, 0xe8e8e8, 0x333333],
};

// The story — Jax Carter comes home to Coral Bay owing Big Sal fifty grand.
export const STORY = {
  title: 'CORAL BAY',
  tagline: 'Come home. Pay the debt. Own the city.',
  hero: 'Jax Carter',
  debt: 50000,
  intro:
    'Jax Carter did three years upstate and came home to Coral Bay with nothing ' +
    'but a busted phone and a $50,000 debt to Big Sal. Mama Rosa has work. ' +
    'Eddie needs a driver. And the Coral Bay Trust bank is just sitting there, ' +
    'waiting for someone with nothing left to lose.',
};

// Missions, in story order. Each mission is a list of steps; a step completes
// when the player reaches its marker (or fulfils its condition).
export const MISSIONS = [
  {
    id: 'homecoming',
    name: "Mama Rosa's Diner",
    brief: "Mama Rosa has work for you. Get to the diner on foot — it's on Marlin Ave.",
    reward: 200,
    steps: [
      // Marker sits on the road in front of the diner (z=-120), not inside
      // the building footprint, so the player can actually reach it.
      { kind: 'goto', label: "Reach Mama Rosa's Diner", x: -80, z: -120, radius: 6 },
    ],
  },
  {
    id: 'wheels',
    name: 'Borrowed Wheels',
    brief: 'Eddie needs a car, any car. Steal one off the street (E) and bring it to his garage.',
    reward: 400,
    steps: [
      { kind: 'steal', label: 'Steal a car (walk up to one and press E)' },
      { kind: 'gotoCar', label: "Deliver the car to Eddie's Garage", x: 80, z: 120, radius: 8 },
    ],
  },
  {
    id: 'drop',
    name: 'The Drop',
    brief: 'Three packages, three corners of the bay. Collect them all and bring them to the pier. Watch for Sal’s boys.',
    reward: 600,
    steps: [
      { kind: 'collect', label: 'Collect package 1/3 — Harbor Steps', x: -240, z: -200, radius: 5 },
      { kind: 'collect', label: 'Collect package 2/3 — Coral Park', x: 240, z: -200, radius: 5 },
      { kind: 'collect', label: 'Collect package 3/3 — Old Cannery (guarded)', x: -240, z: 120, radius: 5, guards: 2 },
      { kind: 'goto', label: 'Deliver the packages to the Pier', x: 250, z: 0, radius: 6 },
    ],
  },
  {
    id: 'heat',
    name: 'Heat Wave',
    brief: 'Sal tipped off the cops. Survive 60 seconds with a 3-star wanted level — then lose them.',
    reward: 800,
    steps: [
      { kind: 'survive', label: 'Survive the heat — 60 seconds', seconds: 60, stars: 3 },
      { kind: 'loseheat', label: 'Lose the cops — get your wanted level to zero' },
    ],
  },
  {
    id: 'score',
    name: 'The Big Score',
    brief: 'The Coral Bay Trust vault. Grab the cash, get out, and make it to the safehouse with the whole city on your tail.',
    reward: 2000,
    steps: [
      { kind: 'gotoCar', label: 'Drive to the Coral Bay Trust bank', x: 0, z: -40, radius: 8 },
      { kind: 'grab', label: 'Grab the cash from the vault', x: 0, z: -40, radius: 6, seconds: 4 },
      { kind: 'goto', label: 'Escape to the Safehouse', x: -240, z: 280, radius: 8 },
    ],
  },
];

// Landmark positions (must match the buildings the world builder places).
export const LANDMARKS = {
  diner: { x: -80, z: -160, name: "Mama Rosa's Diner" },
  garage: { x: 80, z: 80, name: "Eddie's Garage" },
  bank: { x: 0, z: -80, name: 'Coral Bay Trust' },
  pier: { x: 280, z: 0, name: 'Coral Pier' },
  safehouse: { x: -240, z: 240, name: 'Safehouse' },
  hospital: { x: -160, z: 160, name: 'Coral General' },
  policeHQ: { x: 160, z: 160, name: 'Coral Bay PD' },
};
