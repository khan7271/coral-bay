// missions.js — the story chain: five missions, each a list of steps with a
// beacon marker, objective text and a cash reward. Completing all five wins.
import { MISSIONS } from './config.js';

export class MissionSys {
  constructor(G) {
    this.G = G;
    this.index = 0; // mission index
    this.step = 0; // step index inside the mission
    this.stepTimer = 0; // for timed steps (survive / grab)
    this.guardsSpawned = false;
    this.active = false; // a mission is currently running
    this.done = false; // whole story finished
    this.marker = null; // {x, z, radius, label}
  }

  get mission() {
    return MISSIONS[this.index];
  }

  get stepDef() {
    return this.mission ? this.mission.steps[this.step] : null;
  }

  start() {
    const G = this.G;
    if (this.done || this.index >= MISSIONS.length) return;
    this.active = true;
    this.step = 0;
    this.stepTimer = 0;
    this.guardsSpawned = false;
    const m = this.mission;
    G.hud.banner(`MISSION — ${m.name}`, m.brief);
    G.hud.setObjective(this.stepDef ? this.stepDef.label : '');
    this.applyStep();
  }

  applyStep() {
    const G = this.G;
    const s = this.stepDef;
    if (!s) return;
    this.stepTimer = 0;
    if (s.kind === 'goto' || s.kind === 'gotoCar' || s.kind === 'collect' || s.kind === 'grab') {
      this.marker = { x: s.x, z: s.z, radius: s.radius, label: s.label };
      G.world.setBeacon(s.x, s.z, true);
    } else {
      this.marker = null;
      G.world.setBeacon(0, 0, false);
    }
    if (s.kind === 'survive' && s.stars) {
      G.police.setWanted(s.stars);
    }
    if (s.guards && !this.guardsSpawned) {
      this.guardsSpawned = true;
      for (let i = 0; i < s.guards; i += 1) {
        G.combat.spawnThug(s.x + (i - 0.5) * 8, s.z + 6);
      }
    }
    G.hud.setObjective(s.label);
  }

  advance() {
    const G = this.G;
    const m = this.mission;
    this.step += 1;
    if (this.step >= m.steps.length) {
      // Mission complete.
      G.player.cash += m.reward;
      G.audio.jingle();
      G.hud.banner('MISSION COMPLETE', `${m.name} — +$${m.reward}`);
      G.hud.setObjective('');
      G.world.setBeacon(0, 0, false);
      this.marker = null;
      this.active = false;
      this.index += 1;
      if (this.index >= MISSIONS.length) {
        this.done = true;
        G.storyComplete();
      } else {
        // Next mission starts on a short beat so the player can breathe.
        setTimeout(() => {
          if (G.state === 'playing') this.start();
        }, 2500);
      }
      return;
    }
    this.applyStep();
  }

  fail(reason) {
    const G = this.G;
    G.audio.buzz();
    G.hud.banner('MISSION FAILED', reason);
    this.active = false;
    this.marker = null;
    G.world.setBeacon(0, 0, false);
    setTimeout(() => {
      if (G.state === 'playing') this.start();
    }, 2500);
  }

  update(dt) {
    const G = this.G;
    if (!this.active || G.state !== 'playing') return;
    const s = this.stepDef;
    if (!s) return;
    const p = G.player;

    if (s.kind === 'goto' || s.kind === 'collect' || s.kind === 'grab') {
      const d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
      if (s.kind === 'grab') {
        if (d < s.radius) {
          this.stepTimer += dt;
          G.hud.setProgress(this.stepTimer / (s.seconds || 4), 'Grabbing the cash…');
          if (this.stepTimer >= (s.seconds || 4)) {
            G.hud.setProgress(0, '');
            this.advance();
          }
        } else {
          this.stepTimer = 0;
          G.hud.setProgress(0, '');
        }
        return;
      }
      if (d < s.radius) {
        if (s.kind === 'collect') {
          G.audio.pickup();
          p.cash += 25;
        }
        this.advance();
      }
    } else if (s.kind === 'gotoCar') {
      if (p.car) {
        const d = Math.hypot(p.car.x - s.x, p.car.z - s.z);
        if (d < s.radius) this.advance();
      }
    } else if (s.kind === 'steal') {
      if (p.car) this.advance();
    } else if (s.kind === 'survive') {
      this.stepTimer += dt;
      G.hud.setProgress(this.stepTimer / (s.seconds || 60), 'Survive the heat…');
      if (this.stepTimer >= (s.seconds || 60)) {
        G.hud.setProgress(0, '');
        this.advance();
      }
    } else if (s.kind === 'loseheat') {
      if (G.police.wanted === 0) this.advance();
    }
  }

  // Distance to the current marker, for the HUD.
  markerDistance() {
    const G = this.G;
    if (!this.marker) return null;
    const d = Math.hypot(G.player.pos.x - this.marker.x, G.player.pos.z - this.marker.z);
    return { ...this.marker, dist: Math.round(d) };
  }
}
