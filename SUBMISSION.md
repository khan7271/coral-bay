# gta6-01 — CORAL BAY — READY TO SUBMIT (not yet submitted)

## Entry (LIVE, pushed)
- Repo: https://github.com/khan7271/coral-bay (public)
- Commit to submit: **505d8d9** (touch-up pass; see below) — supersedes
  aeddf2b (polish pass), ac8b186 (SPDX line in LICENSE) and cdb00be
  (game + screenshots).
- Title: CORAL BAY
- Competition: gta6-01 "Make GTA 6", $1,666, top 100 share (1st $500)
- Deadline: **2026-11-24T15:00:00Z** (Tue 2026-11-24 21:00 Dhaka)
- Payout wallet: 2QUmoJpZGqaBzPQnPmewbwbsq5AUtup2DmQs65mMyxJC
- GitHub About set: description, homepage https://make.fun/bounty/gta6-01,
  topics makefun, ai-agents, bounties, games
- .makefun/owner.json names the payout wallet.

## Game
CORAL BAY — original open-world crime story (Jax Carter owes Big Sal
$50,000). 640×640 m city: on-foot + car play, traffic AI (14 moving +
6 parked cars), 26 pedestrians who flee gunfire, car stealing (E),
0–5 star wanted level with police interceptors that chase/ram and foot
cops that hold to BUST at 3+ stars, 6 story missions (Homecoming,
Borrowed Wheels, The Drop, Heat Wave, The Big Score, Settling Up) with
beacons and cash rewards, pistol combat with finite reserve ammo (36,
ammo pickups, reload draws from reserve; tracers, muzzle flash,
hitmarkers, thugs shoot back), police roadblocks at 3+ stars and PIT
manoeuvres at 4+, taxis and vans with brake lights, horn (H) that
scares pedestrians, crash smoke, mouse-wheel camera zoom, sprint FOV
kick, and run stats shown on story completion, pickups (cash/armor/
health), HUD with live minimap, health/armor bars, cash, clock, wanted
stars, objectives, banners,
start/pause/WASTED/BUSTED/story-complete overlays, localStorage save
(autosave every 30 s + on pause), day/night cycle, synthesized WebAudio
(engine, shots, sirens, jingles, ambient music). ~2,900 lines in
game/src/{config,random,textures,audio,input,world,vehicles,peds,police,
combat,missions,hud,save,main}.js, authored in-session by builder
session 1c18f02a-8d51-4a1b-bbea-56cf509ac5d4. three.js 0.187.0 vendored.
No network at runtime.

## Verification (all done by the builder)
- Interactive smoke test (headless Chromium + SwiftShader): WALK PASS,
  STEAL PASS (parked car, wanted 1), SHOOT PASS (ammo 12→11),
  MISSION 1 PASS (advanced to mission 2, +$200), PAUSE/RESUME PASS,
  save file written. No page errors (only favicon 404).
- Polish pass (commit aeddf2b, 2026-11-18): 6th mission 'Settling Up'
  at Big Sal's compound; finite pistol reserve (36) with ammo pickups;
  police roadblocks at 3+ stars, PIT manoeuvres at 4+, foot-cop sprint;
  taxis and vans, brake lights, horn (H) that scares peds, crash smoke;
  peds: walkers/joggers/tourists, idle pauses, car dodging, respawn;
  HUD: minimap pickups/landmarks/foot cops, red ring at 3+ stars, ammo
  readout with reserve, cash flash on gains, step counters; mouse-wheel
  camera zoom, sprint FOV kick, run stats on completion; save format v2
  with stats + v1 migration; neon diner sign, beach umbrellas, benches,
  hydrants; live make.fun badges in README. Screenshots regenerated
  (see below) and the smoke test re-run green — WALK/STEAL/SHOOT/
  MISSION 1/PAUSE/RESUME all PASS.
- Bugs found and fixed in-session: wasPressed() never fired (poll()
  cleared the pressed set before the step read it); mission markers
  sat inside building footprints (moved to the road in front of each
  landmark); no parked cars existed to steal (6 added); chase-cam
  lerp hadn't settled in 2 frames (shot mode now runs 30 frames).
- Screenshots (real 1280×720 renders of the game's own code,
  `?shot=start|play|chase|end&seed=7`), regenerated after the polish
  pass: screenshots/1-start.jpg (85,664 B), 2-play.jpg (72,359 B),
  3-chase.jpg (76,040 B), 4-end.jpg (52,977 B) — all ≤256 KiB, visually
  checked.
- Dossier: `MAKEFUN_OUTPUT_DIR=out node main.ts` → out/dossier.json,
  schema makefun/dossier/v1, 4 images.
- Kit check (best-game-01 kit CLI, same harness family; the gta6-01 kit
  tarball 404s from the API): 4 passed — competition_open, snapshot
  (31 files, 2,587,125 bytes), license_osi (SPDX MIT), entrypoint
  (main.ts, node22). 1 failed — transcripts_present (parent bundles
  transcripts at submit time). The roblox kit CLI was also tried and is
  NOT applicable (it demands PLAY.json / Roblox Studio).
- vendor/makefun-game.ts sha256
  dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129
  (byte-identical to the gta6-01 kit manifest).

## For the parent (submit in the foreground)
- Prompt file: ~/workspace/makefun/gta6-bundles/prompt.txt — user's exact
  words "gta6 submit dew makefun a", origin handed-off.
- Bundle rule (from 2026-11-17): five agent facts — --harness-version
  "muse-spark-1.3", --effort, --prompt-file, --mcp none, --harness "Muse"
  --provider meta --model muse-spark-1.3, --redact "Tushar"
  --redact "TusharDeFi".
- Builder session id: 1c18f02a-8d51-4a1b-bbea-56cf509ac5d4. Usage rows:
  ~/workspace/makefun/gta6/muse-usage-gta6.jsonl (gitignored, in repo dir).
- Touch-up pass (commit 505d8d9, 2026-11-18, recorded under
  01a1ef84-0b78-718d-9315-8a54b298dc64): meta description + sharper
  title + noscript fallback in game/index.html; serve.ts answers 204
  for /favicon.ico (the two console 404s from earlier smoke tests are
  gone) and the startup log prints the URL; package.json gains a
  `screenshots` script; .gitignore gains per-entry comments + .DS_Store;
  this file updated with the polish record. Smoke test re-run after the
  touch-up: WALK/STEAL/SHOOT/MISSION 1/PAUSE/RESUME all PASS,
  ERRORS: none.
- Submit command pattern (foreground, per bestgame):
  `node cli/makefun.mjs submit --competition gta6-01 --recording <id>
  --repo-url https://github.com/khan7271/coral-bay --commit 505d8d9
  --title "CORAL BAY" --keypair ~/workspace/makefun/makefun-keypair.json
  --repo <repo>` with the transcript bundle attached.
- NEVER run `makefun profile`. Do NOT submit from background/scheduled jobs.
- Dev scripts (outside the repo): ~/workspace/makefun/coralbay-shots.mjs,
  ~/workspace/makefun/smoke-test.mjs, ~/workspace/makefun/diag.mjs.
  Local server: `node serve.ts` → http://localhost:8080 (stopped after build).
