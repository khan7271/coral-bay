# CORAL BAY — an open-world crime story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/khan7271/coral-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/khan7271/coral-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A complete open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Playable in a
desktop browser from static files — no network, no install.

**The story:** Jax Carter comes home to Coral Bay owing $50,000 to Big Sal.
Six missions take him from a diner errand to a bank heist at Coral Bay Trust
and a final settle-up at Sal's compound: steal a car, run three drops past
armed guards, survive a 3-star heat wave, grab the vault cash, then hand
over the cut and walk away clean.

## How to play

Open `game/index.html` in a desktop browser, or serve the `game/` folder with
any static server (`node serve.ts` → http://localhost:8080).

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse | Look & aim (click the game to lock the mouse) |
| Mouse wheel | Zoom the camera in / out |
| Click / Space | Shoot the pistol |
| E | Steal / enter a car, exit a car |
| H | Horn (while driving — scares peds aside) |
| R | Reload (draws from a finite reserve) |
| Shift | Run (widens the camera FOV a touch) |
| P | Pause (progress saves) |
| M | Mute |

## What's in the game

- **A city on foot and by car** — Coral Bay is 640×640 m of roads, blocks,
  buildings, a beach with umbrellas, an ocean and a pier, with a full
  day/night cycle.
- **Traffic and pedestrians** — sedans, yellow taxis and vans drive the road
  loops; pedestrians stroll the sidewalks, jog, idle as beach tourists, dodge
  fast cars and flee when shots ring out. The streets stay populated: a dead
  ped is replaced after a while.
- **Cars to steal** — walk up to any parked or moving car and press E. The
  owner (and the police) will not be happy. Hard crashes leave your car
  smoking; brake lights flare when you brake.
- **Wanted level and police** — 0–5 stars. Police interceptors chase and ram
  (at 4+ stars they PIT-manoeuvre); at 3+ stars they set a roadblock across
  the road ahead, and foot cops sprint in to hold you until you're BUSTED.
  Heat decays when you stay clean, with a sting and chase music while hot.
- **Missions and a story** — 6 story missions with beacons, step counters,
  guards (including heavy enforcers in the finale), timed survivals and cash
  rewards. Going down fails the active mission. Finish all six to pay the debt.
- **Combat** — hitscan pistol with tracers, muzzle flash and hitmarkers;
  headshots deal double damage; armed thugs shoot back; health, armor, cash
  and ammo pickups around the city.
- **HUD with minimap** — live minimap (roads, landmarks, mission marker,
  pickups, police, foot cops, thugs, player arrow with a red ring at 3+
  stars), health/armor bars, cash (flashes green on gains), clock, wanted
  stars, objective text with step counter, and mission banners.
- **Start and save** — title screen, new game / continue, autosave every
  30 s and on pause, localStorage save (v2, migrates v1), run stats (distance,
  shots, cars stolen, play time) on the story-complete screen, WASTED/BUSTED
  respawns at the hospital.
- **Polish** — synthesized WebAudio (engine, shots, sirens, horn, reload
  clicks, wanted stings, cash register, jingles, ambient music with a chase
  layer), screen shake, damage vignette, procedural textures (including a
  neon diner sign), beach umbrellas, park benches, hydrants, and dusk lighting.

## Tech

- three.js 0.187.0 (vendored under `game/vendor/three/`, MIT)
- Plain ES modules, no build step, no network requests at runtime
- Node 22 entrypoint `main.ts` builds the submission dossier via the kit's
  `buildDossier` (`vendor/makefun-game.ts`, unchanged from the kit)

## Screenshots

All four are real renders of the game's own code (`?shot=start|play|chase|end`):

1. Title screen over the Coral Bay skyline at dusk
2. Driving a stolen car down Marlin Ave
3. A 3-star police chase at dusk
4. Mission complete at the Coral Bay pier

## Originality

Coral Bay, its characters (Jax Carter, Big Sal, Mama Rosa, Eddie), its story,
its art, its sound and its music are entirely original — nothing is taken
from Rockstar Games or any other commercial game.

## License

MIT — see [LICENSE](LICENSE).
