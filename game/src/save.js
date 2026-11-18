// save.js — localStorage save: cash, story progress, position and health.
const KEY = 'coralbay-save-v1';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      cash: Math.floor(p.cash),
      missionIndex: G.missions.index,
      health: p.health,
      armor: p.armor,
      x: p.pos.x,
      z: p.pos.z,
      hour: G.hour,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.cash !== 'number' || typeof d.missionIndex !== 'number') return null;
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
  } catch {
    // ignore
  }
}
