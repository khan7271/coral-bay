// hud.js — the DOM HUD: minimap, health/armor, cash, wanted stars, objective,
// banners and the menu overlays. The minimap reuses the city's ground texture.
import { CONFIG } from './config.js';

export class HUD {
  constructor(G) {
    this.G = G;
    this.root = document.getElementById('hud');
    this.mapCanvas = document.getElementById('minimap');
    this.mapCtx = this.mapCanvas.getContext('2d');
    this.mapImg = null;
    this.bannerTimer = null;
    this.buildMapImage();
  }

  buildMapImage() {
    // Reuse the ground texture's canvas by re-rendering the same drawing:
    // simplest robust route — draw the ground from the live WebGL canvas is
    // not possible, so we snapshot the texture image once it exists.
    const G = this.G;
    const tex = G.worldTexture;
    if (tex && tex.image) {
      this.mapImg = tex.image;
    }
  }

  setWanted(n) {
    const el = document.getElementById('wanted');
    el.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
    el.classList.toggle('hot', n >= 3);
  }

  setObjective(text) {
    document.getElementById('objective').textContent = text || '';
  }

  setProgress(frac, label) {
    const bar = document.getElementById('progress');
    const fill = document.getElementById('progress-fill');
    const lab = document.getElementById('progress-label');
    if (!label) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'block';
    fill.style.width = `${Math.round(frac * 100)}%`;
    lab.textContent = label;
  }

  banner(title, sub) {
    const b = document.getElementById('banner');
    document.getElementById('banner-title').textContent = title;
    document.getElementById('banner-sub').textContent = sub || '';
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 4200);
  }

  hitmarker(kill) {
    const h = document.getElementById('hitmarker');
    h.classList.toggle('kill', !!kill);
    h.classList.remove('show');
    void h.offsetWidth; // restart the animation
    h.classList.add('show');
  }

  flashDamage() {
    const d = document.getElementById('damage');
    d.classList.remove('show');
    void d.offsetWidth;
    d.classList.add('show');
  }

  showOverlay(id) {
    for (const o of document.querySelectorAll('.overlay')) o.classList.remove('show');
    if (id) document.getElementById(id).classList.add('show');
  }

  update() {
    const G = this.G;
    const p = G.player;
    document.getElementById('health-fill').style.width = `${Math.max(0, p.health)}%`;
    document.getElementById('armor-fill').style.width = `${Math.max(0, p.armor)}%`;
    document.getElementById('cash').textContent = `$${Math.floor(p.cash).toLocaleString('en-US')}`;
    document.getElementById('ammo').textContent = p.car
      ? `${Math.abs(Math.round(p.carSpeed * 3.6))} km/h`
      : `${p.ammo} / ${p.reserve}`;
    document.getElementById('clock').textContent = G.clockText();
    document.getElementById('mission-label').textContent = G.missions.done
      ? 'STORY COMPLETE'
      : G.missions.mission
        ? `MISSION ${G.missions.index + 1}/5 — ${G.missions.mission.name}`
        : '';
    this.drawMinimap();
  }

  drawMinimap() {
    const G = this.G;
    const ctx = this.mapCtx;
    const S = 180;
    const half = CONFIG.cityHalf;
    const toMap = (v) => ((v + half) / (half * 2)) * S;
    ctx.clearRect(0, 0, S, S);
    if (this.mapImg) {
      ctx.drawImage(this.mapImg, 0, 0, S, S);
    } else {
      ctx.fillStyle = '#24303a';
      ctx.fillRect(0, 0, S, S);
    }
    const dot = (x, z, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toMap(x), toMap(z), r, 0, Math.PI * 2);
      ctx.fill();
    };
    // Mission marker: a pulsing yellow diamond.
    const md = G.missions.markerDistance();
    if (md) {
      const pulse = 5 + Math.sin(performance.now() / 250) * 2;
      ctx.fillStyle = '#ffd25a';
      ctx.beginPath();
      ctx.moveTo(toMap(md.x), toMap(md.z) - pulse);
      ctx.lineTo(toMap(md.x) + pulse, toMap(md.z));
      ctx.lineTo(toMap(md.x), toMap(md.z) + pulse);
      ctx.lineTo(toMap(md.x) - pulse, toMap(md.z));
      ctx.closePath();
      ctx.fill();
    }
    // Police cars: blue dots. Traffic: grey dots.
    for (const car of G.vehicles.cars) {
      dot(car.x, car.z, car.isPolice ? '#3b82ff' : '#9aa0a8', car.isPolice ? 4 : 2.5);
    }
    // Thugs: red dots.
    for (const e of G.combat.enemies) {
      if (!e.dead) dot(e.x, e.z, '#ff4444', 3);
    }
    // Player: white arrow pointing along heading.
    const px = toMap(G.player.pos.x);
    const pz = toMap(G.player.pos.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(Math.atan2(Math.sin(G.player.heading), Math.cos(G.player.heading)) + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // North tick.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', S / 2 - 4, 12);
  }
}
