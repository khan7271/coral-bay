# CORAL BAY — an open-world crime story

[![make.fun](https://img.shields.io/badge/make.fun-bounty-ff6b35)](https://make.fun/bounty/gta6-01)
[![make.fun](https://img.shields.io/badge/built%20with-make.fun-7c3aed)](https://make.fun)

A complete open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Playable in a
desktop browser from static files — no network, no install.

**The story:** Jax Carter comes home to Coral Bay owing $50,000 to Big Sal.
Five missions take him from a diner errand to a bank heist at Coral Bay Trust:
steal a car, run three drops past armed guards, survive a 3-star heat wave,
then grab the cash and lose the cops for good.

## How to play

Open `game/index.html` in a desktop browser, or serve the `game/` folder with
any static server (`node serve.ts` → http://localhost:8080).

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse | Look & aim (click the game to lock the mouse) |
| Click / Space | Shoot the pistol |
| E | Steal / enter a car, exit a car |
| R | Reload |
| Shift | Run |
| P | Pause (progress saves) |
| M | Mute |

## What's in the game

- **A city on foot and by car** — Coral Bay is 640×640 m of roads, blocks,
  buildings, a beach, an ocean and a pier, with a full day/night cycle.
- **Traffic and pedestrians** — cars drive the road loops, pedestrians stroll
  the sidewalks and flee when shots ring out.
- **Cars to steal** — walk up to any parked or moving car and press E. The
  owner (and the police) will not be happy.
- **Wanted level and police** — 0–5 stars. Police interceptors chase and ram;
  at 3+ stars foot cops try to hold you until you're BUSTED. Heat decays
  when you stay clean.
- **Missions and a story** — 5 story missions with beacons, objectives,
  guards, timed survivals and cash rewards. Finish all five to pay the debt.
- **Combat** — hitscan pistol with tracers, muzzle flash and hitmarkers;
  armed thugs shoot back; health, armor and ammo pickups around the city.
- **HUD with minimap** — live minimap (roads, mission marker, police,
  thugs, player arrow), health/armor bars, cash, clock, wanted stars,
  objective text and mission banners.
- **Start and save** — title screen, new game / continue, autosave every
  30 s and on pause, localStorage save, WASTED/BUSTED respawns at the hospital.
- **Polish** — synthesized WebAudio (engine, shots, sirens, jingles, ambient
  music), screen shake, damage vignette, procedural textures and dusk lighting.

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
