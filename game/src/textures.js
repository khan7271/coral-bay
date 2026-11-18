// textures.js — every texture is drawn in code on a canvas. No downloaded art.
// The ground texture doubles as the minimap base, so the map and the city agree.
import * as THREE from 'three';
import { CONFIG, PALETTE } from './config.js';

const WORLD = CONFIG.cityHalf * 2; // 640 m across
const PX = 1024; // texture pixels across the whole city

function toPx(v) {
  return ((v + CONFIG.cityHalf) / WORLD) * PX;
}

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// The whole city from above: asphalt roads, pale sidewalks, grass blocks,
// sand beach + teal ocean on the east, a park, crosswalks and lane dashes.
export function makeGroundTexture() {
  return canvasTexture(PX, (ctx) => {
    const s = CONFIG;
    // Base: grass blocks.
    ctx.fillStyle = '#4d7a45';
    ctx.fillRect(0, 0, PX, PX);
    // Ocean + sand on the east edge.
    ctx.fillStyle = '#1d6f8e';
    ctx.fillRect(toPx(s.beachX + 44), 0, PX - toPx(s.beachX + 44), PX);
    ctx.fillStyle = '#d9c08a';
    ctx.fillRect(toPx(s.beachX), 0, toPx(s.beachX + 44) - toPx(s.beachX), PX);
    // Park block (south-west) in a lighter green with paths.
    ctx.fillStyle = '#5d8f52';
    ctx.fillRect(toPx(-280), toPx(160), toPx(-200) - toPx(-280), toPx(240) - toPx(160));
    ctx.fillStyle = '#c9b489';
    ctx.fillRect(toPx(-244), toPx(160), 8, toPx(240) - toPx(160));
    ctx.fillRect(toPx(-280), toPx(196), toPx(-200) - toPx(-280), 8);
    // Sidewalks: pale strips around every road.
    ctx.fillStyle = '#8d8578';
    const roads = [];
    for (let v = -280; v <= 280; v += 80) roads.push(v);
    for (const v of roads) {
      ctx.fillRect(toPx(v - s.roadWidth / 2 - s.sidewalkWidth), 0, (s.roadWidth + 2 * s.sidewalkWidth) / WORLD * PX, PX);
      ctx.fillRect(0, toPx(v - s.roadWidth / 2 - s.sidewalkWidth), PX, (s.roadWidth + 2 * s.sidewalkWidth) / WORLD * PX);
    }
    // Roads: dark asphalt.
    ctx.fillStyle = '#2b2e33';
    for (const v of roads) {
      ctx.fillRect(toPx(v - s.roadWidth / 2), 0, s.roadWidth / WORLD * PX, PX);
      ctx.fillRect(0, toPx(v - s.roadWidth / 2), PX, s.roadWidth / WORLD * PX);
    }
    // Centre lane dashes.
    ctx.fillStyle = '#d8c95a';
    for (const v of roads) {
      for (let d = -300; d < 300; d += 24) {
        ctx.fillRect(toPx(v) - 1.5, toPx(d), 3, 12);
        ctx.fillRect(toPx(d), toPx(v) - 1.5, 12, 3);
      }
    }
    // Crosswalks at every intersection.
    ctx.fillStyle = '#e8e8e8';
    for (const a of roads) {
      for (const b of roads) {
        for (let k = -2; k <= 2; k += 1) {
          ctx.fillRect(toPx(a + k * 3) - 2, toPx(b - s.roadWidth / 2 - 1), 4, 6);
          ctx.fillRect(toPx(a + k * 3) - 2, toPx(b + s.roadWidth / 2 - 5), 4, 6);
          ctx.fillRect(toPx(a - s.roadWidth / 2 - 1), toPx(b + k * 3) - 2, 6, 4);
          ctx.fillRect(toPx(a + s.roadWidth / 2 - 5), toPx(b + k * 3) - 2, 6, 4);
        }
      }
    }
    // Pier planks jutting into the ocean at z = 0.
    ctx.fillStyle = '#7a5c38';
    ctx.fillRect(toPx(280), toPx(-8), toPx(320) - toPx(280), toPx(8) - toPx(-8));
  });
}

// A building facade: lit windows on a coloured wall, ground-floor storefront.
export function makeFacadeTexture(baseColor, variant, litRatio) {
  return canvasTexture(256, (ctx) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    // Slight vertical shading.
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // Window grid.
    const cols = 4 + (variant % 3);
    const rows = 6 + (variant % 4);
    const cw = 256 / cols;
    const ch = 200 / rows;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const lit = ((r * 7 + c * 13 + variant * 5) % 10) / 10 < litRatio;
        ctx.fillStyle = lit ? '#ffd98a' : '#20242e';
        ctx.fillRect(c * cw + cw * 0.22, 12 + r * ch + ch * 0.2, cw * 0.56, ch * 0.6);
      }
    }
    // Storefront band at the bottom.
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(0, 212, 256, 44);
    ctx.fillStyle = variant % 2 ? '#3fae8a' : '#c25a3a';
    ctx.fillRect(8, 220, 240, 6);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(variant % 2 ? 'OPEN' : '24 HRS', 12, 246);
  });
}

// A shop sign board (diner, garage, bank, pier, safehouse, hospital, PD).
export function makeSignTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = fg;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Small radial glow used for the mission beacon and muzzle flash.
export function makeGlowTexture() {
  return canvasTexture(128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,210,90,0.7)');
    g.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

export { PALETTE };
