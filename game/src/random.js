// random.js — tiny seeded RNG (mulberry32) so screenshots are deterministic,
// plus the small sampling helpers the systems share. Everything here is pure
// and seeded: the same seed always builds the same city.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function rangeInt(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// True with probability p (0..1). Used for rare events: a ped pausing,
// a traffic car switching loops, a thug's lucky shot.
export function coin(rng, p) {
  return rng() < p;
}

// Box-Muller gaussian, mean 0, std 1, clamped to [-2.5, 2.5] so a single
// draw can never throw a spawn wildly off. Used for thug scatter and
// pedestrian idle drift.
export function gauss(rng) {
  const u = Math.max(1e-9, rng());
  const v = Math.max(1e-9, rng());
  const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(-2.5, Math.min(2.5, g));
}

// Weighted pick: entries are [value, weight]. Falls back to the last entry
// when the weights sum to ~0, so a bad table can never return undefined.
export function weightedPick(rng, entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  if (total <= 0) return entries[entries.length - 1][0];
  let roll = rng() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
