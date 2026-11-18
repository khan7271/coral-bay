// save.js — localStorage save: cash, story progress, position, health and
// the run stats (distance driven, shots fired, cars stolen, play time).
// Save format v2; a v1 save is migrated in place so returning players keep
// their progress.
const KEY = 'coralbay-save-v2';
const OLD_KEY = 'coralbay-save-v1';

// A fresh, empty stats block. Stats are display-only — they never gate
// progress, so a corrupt block is dropped, never fatal.
export function blankStats() {
  return {
    distanceM: 0, // metres travelled (on foot + driving)
    shotsFired: 0,
    carsStolen: 0,
    playTimeSec: 0,
  };
}

export function saveGame(G) {
  try {
    const p = G.player;
    const s = G.stats || blankStats();
    const data = {
      version: 2,
      cash: Math.floor(p.cash),
      missionIndex: G.missions.index,
      health: p.health,
      armor: p.armor,
      x: p.pos.x,
      z: p.pos.z,
      hour: G.hour,
      stats: {
        distanceM: Math.floor(s.distanceM),
        shotsFired: s.shotsFired,
        carsStolen: s.carsStolen,
        playTimeSec: Math.floor(s.playTimeSec),
      },
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function sanitize(d) {
  if (!d || typeof d !== 'object') return null;
  if (typeof d.cash !== 'number' || typeof d.missionIndex !== 'number') return null;
  // Clamp the mission index to the story length; a save from an older
  // build (5 missions) stays valid now that the story has 6.
  d.missionIndex = Math.max(0, Math.min(d.missionIndex, 5));
  d.stats = { ...blankStats(), ...(d.stats || {}) };
  return d;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
    // Migrate a v1 save: same fields, no stats block, no version.
    const old = localStorage.getItem(OLD_KEY);
    if (!old) return null;
    const d = sanitize(JSON.parse(old));
    if (!d) return null;
    d.version = 2;
    localStorage.setItem(KEY, JSON.stringify(d));
    localStorage.removeItem(OLD_KEY);
    return d;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(OLD_KEY);
  } catch {
    // ignore
  }
}
