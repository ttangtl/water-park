// 手绘风格的程序化美术：所有建筑、游客、图标都在这里画，不依赖图片素材。
import type { BuildingType, Mat } from './data';

export const INK = '#21405a';
export const PAL = {
  aqua: '#1fb5c9', aquaLight: '#6fdcec', aquaDeep: '#1585a8',
  coral: '#ff7a59', coralDeep: '#e2563a', sun: '#ffc93c', sunDeep: '#e9a80c',
  sand: '#f7e7c4', sandDeep: '#ecd4a2', palm: '#3bb273', palmDeep: '#2a8c58',
  pink: '#ff6f91', cream: '#fffaf0', steel: '#9fb0bf', steelDeep: '#6f8396',
};

type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function rr(g: C, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
function fillStroke(g: C, fill: string | CanvasGradient, lw: number) {
  g.fillStyle = fill; g.fill();
  g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
}
function shadow(g: C, cx: number, cy: number, rx: number, ry: number, a = 0.18) {
  g.fillStyle = `rgba(33,64,90,${a})`;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
}
/** 粗描边彩管（滑梯管道） */
function tube(g: C, path: (g: C) => void, T: number, color: string) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = INK; g.lineWidth = T * 0.2; path(g); g.stroke();
  g.strokeStyle = color; g.lineWidth = T * 0.14; path(g); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = T * 0.035; path(g); g.stroke();
}
function water(g: C, x: number, y: number, w: number, h: number, r: number, t: number, deep = false, waves = 2) {
  rr(g, x, y, w, h, r);
  const grad = g.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, deep ? '#3aa8e8' : PAL.aquaLight);
  grad.addColorStop(1, deep ? '#1661b0' : PAL.aquaDeep);
  g.save();
  g.fillStyle = grad; g.fill();
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,.6)';
  g.lineWidth = Math.max(1, h * 0.06);
  g.lineCap = 'round';
  for (let i = 0; i < waves; i++) {
    const yy = y + h * ((i + 0.6) / (waves + 0.4)) + Math.sin(t * 1.6 + i) * h * 0.04;
    g.beginPath();
    for (let k = 0; k <= 12; k++) {
      const xx = x + (w * k) / 12;
      const off = Math.sin(k * 1.3 + t * (deep ? 3 : 2) + i * 2) * h * (deep ? 0.07 : 0.04);
      k ? g.lineTo(xx, yy + off) : g.moveTo(xx, yy + off);
    }
    g.stroke();
  }
  // 高光
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.beginPath(); g.ellipse(x + w * 0.28, y + h * 0.22, w * 0.18, h * 0.08, -0.2, 0, TAU); g.fill();
  g.restore();
  g.lineWidth = Math.max(1.5, w * 0.03); g.strokeStyle = INK; rr(g, x, y, w, h, r); g.stroke();
}

// ---------- 建筑 ----------
export function drawBuilding(g: C, type: BuildingType, x: number, y: number, T: number, t: number) {
  const lw = Math.max(1.5, T * 0.035);
  switch (type) {
    case 'pool': {
      shadow(g, x + T * 0.5, y + T * 0.9, T * 0.44, T * 0.08);
      rr(g, x + T * 0.06, y + T * 0.1, T * 0.88, T * 0.8, T * 0.18);
      fillStroke(g, '#ffffff', lw);
      g.fillStyle = '#dbe8ef'; rr(g, x + T * 0.08, y + T * 0.8, T * 0.84, T * 0.08, T * 0.06); g.fill();
      water(g, x + T * 0.15, y + T * 0.19, T * 0.7, T * 0.58, T * 0.12, t);
      // 扶梯
      g.strokeStyle = PAL.steelDeep; g.lineWidth = lw; g.lineCap = 'round';
      for (const dx of [0.66, 0.76]) { g.beginPath(); g.moveTo(x + T * dx, y + T * 0.13); g.lineTo(x + T * dx, y + T * 0.3); g.stroke(); }
      break;
    }
    case 'wave': {
      shadow(g, x + T * 0.5, y + T * 0.92, T * 0.46, T * 0.08);
      rr(g, x + T * 0.03, y + T * 0.08, T * 0.94, T * 0.84, T * 0.14);
      fillStroke(g, PAL.sand, lw);
      water(g, x + T * 0.1, y + T * 0.24, T * 0.8, T * 0.6, T * 0.1, t, true, 3);
      // 造浪机
      rr(g, x + T * 0.12, y + T * 0.03, T * 0.76, T * 0.2, T * 0.06);
      fillStroke(g, PAL.steel, lw);
      g.fillStyle = PAL.sun;
      for (let i = 0; i < 4; i++) { rr(g, x + T * (0.18 + i * 0.17), y + T * 0.08, T * 0.1, T * 0.1, T * 0.02); g.fill(); }
      // 小旗
      g.strokeStyle = INK; g.lineWidth = lw * 0.8;
      g.beginPath(); g.moveTo(x + T * 0.84, y + T * 0.05); g.lineTo(x + T * 0.84, y - T * 0.22); g.stroke();
      g.fillStyle = PAL.coral;
      g.beginPath(); g.moveTo(x + T * 0.84, y - T * 0.22);
      g.lineTo(x + T * (0.84 - 0.2 + Math.sin(t * 4) * 0.02), y - T * 0.15); g.lineTo(x + T * 0.84, y - T * 0.08); g.fill();
      break;
    }
    case 'slide': {
      shadow(g, x + T * 0.5, y + T * 0.92, T * 0.44, T * 0.08);
      water(g, x + T * 0.06, y + T * 0.56, T * 0.52, T * 0.36, T * 0.1, t, false, 1);
      // 支架
      g.strokeStyle = INK; g.lineWidth = lw * 2.6; g.lineCap = 'round';
      const legs = [0.64, 0.86];
      for (const dx of legs) { g.beginPath(); g.moveTo(x + T * dx, y - T * 0.3); g.lineTo(x + T * dx, y + T * 0.88); g.stroke(); }
      g.strokeStyle = PAL.steel; g.lineWidth = lw * 1.4;
      for (const dx of legs) { g.beginPath(); g.moveTo(x + T * dx, y - T * 0.3); g.lineTo(x + T * dx, y + T * 0.88); g.stroke(); }
      g.lineWidth = lw;
      for (const yy of [0.1, 0.5]) { g.beginPath(); g.moveTo(x + T * 0.64, y + T * yy); g.lineTo(x + T * 0.86, y + T * (yy + 0.2)); g.stroke(); }
      rr(g, x + T * 0.56, y - T * 0.42, T * 0.38, T * 0.13, T * 0.04);
      fillStroke(g, PAL.coral, lw);
      tube(g, gg => {
        gg.beginPath();
        gg.moveTo(x + T * 0.62, y - T * 0.33);
        gg.bezierCurveTo(x + T * 0.1, y - T * 0.25, x + T * 0.95, y + T * 0.35, x + T * 0.3, y + T * 0.68);
      }, T, PAL.sun);
      break;
    }
    case 'snack': {
      shadow(g, x + T * 0.5, y + T * 0.9, T * 0.4, T * 0.07);
      rr(g, x + T * 0.14, y + T * 0.36, T * 0.72, T * 0.52, T * 0.06);
      fillStroke(g, PAL.cream, lw);
      rr(g, x + T * 0.24, y + T * 0.48, T * 0.52, T * 0.2, T * 0.03);
      fillStroke(g, '#5a7d94', lw * 0.8);
      g.fillStyle = PAL.pink; rr(g, x + T * 0.14, y + T * 0.72, T * 0.72, T * 0.16, T * 0.04); g.fill();
      g.lineWidth = lw; g.strokeStyle = INK; rr(g, x + T * 0.14, y + T * 0.36, T * 0.72, T * 0.52, T * 0.06); g.stroke();
      // 条纹遮篷 + 波浪边
      const ax = x + T * 0.08, aw = T * 0.84, ay = y + T * 0.22, ah = T * 0.16, n = 5;
      for (let i = 0; i < n; i++) {
        g.fillStyle = i % 2 ? '#ffffff' : PAL.pink;
        g.fillRect(ax + (aw * i) / n, ay, aw / n, ah);
        g.beginPath(); g.arc(ax + (aw * (i + 0.5)) / n, ay + ah, aw / n / 2, 0, Math.PI); g.fill();
      }
      g.lineWidth = lw; g.strokeStyle = INK;
      g.beginPath(); g.moveTo(ax, ay + ah); g.lineTo(ax, ay); g.lineTo(ax + aw, ay); g.lineTo(ax + aw, ay + ah);
      for (let i = n - 1; i >= 0; i--) g.arc(ax + (aw * (i + 0.5)) / n, ay + ah, aw / n / 2, 0, Math.PI, false);
      g.stroke();
      // 冰淇淋招牌
      const cx = x + T * 0.5, cy = y + T * 0.02;
      g.beginPath(); g.moveTo(cx - T * 0.09, cy + T * 0.04); g.lineTo(cx + T * 0.09, cy + T * 0.04); g.lineTo(cx, cy + T * 0.22); g.closePath();
      fillStroke(g, '#e8a75d', lw);
      g.beginPath(); g.arc(cx, cy, T * 0.1, 0, TAU); fillStroke(g, '#ffc2d4', lw);
      g.fillStyle = PAL.coral; g.beginPath(); g.arc(cx + T * 0.02, cy - T * 0.09, T * 0.03, 0, TAU); g.fill();
      break;
    }
    case 'umbrella': {
      shadow(g, x + T * 0.56, y + T * 0.66, T * 0.36, T * 0.14, 0.14);
      for (const dx of [0.14, 0.56]) {
        rr(g, x + T * dx, y + T * 0.6, T * 0.3, T * 0.18, T * 0.05);
        fillStroke(g, '#ffffff', lw * 0.8);
        g.fillStyle = PAL.aqua; g.fillRect(x + T * (dx + 0.05), y + T * 0.64, T * 0.2, T * 0.04);
      }
      g.strokeStyle = INK; g.lineWidth = lw * 1.2;
      g.beginPath(); g.moveTo(x + T * 0.5, y + T * 0.32); g.lineTo(x + T * 0.5, y + T * 0.7); g.stroke();
      const cx = x + T * 0.5, cy = y + T * 0.32, R = T * 0.4, segs = 8;
      g.save(); g.translate(cx, cy); g.scale(1, 0.55);
      for (let i = 0; i < segs; i++) {
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, (i / segs) * TAU, ((i + 1) / segs) * TAU); g.closePath();
        g.fillStyle = i % 2 ? '#ffffff' : PAL.coral; g.fill();
      }
      g.beginPath(); g.arc(0, 0, R, 0, TAU);
      g.restore();
      g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
      g.fillStyle = PAL.sun; g.beginPath(); g.arc(cx, cy - T * 0.01, T * 0.04, 0, TAU); g.fill(); g.stroke();
      break;
    }
    case 'recycle': {
      shadow(g, x + T * 0.5, y + T * 0.88, T * 0.34, T * 0.07);
      g.beginPath();
      g.moveTo(x + T * 0.22, y + T * 0.32); g.lineTo(x + T * 0.78, y + T * 0.32);
      g.lineTo(x + T * 0.72, y + T * 0.86); g.lineTo(x + T * 0.28, y + T * 0.86); g.closePath();
      fillStroke(g, PAL.palm, lw);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + T * 0.3, y + T * 0.36, T * 0.06, T * 0.44);
      rr(g, x + T * 0.15, y + T * 0.2, T * 0.7, T * 0.15, T * 0.05);
      fillStroke(g, PAL.palmDeep, lw);
      g.fillStyle = '#fff';
      g.font = `900 ${Math.round(T * 0.32)}px sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('♻', x + T * 0.5, y + T * 0.6);
      // 顶上冒出的瓶子
      rr(g, x + T * 0.54, y + T * 0.02, T * 0.12, T * 0.22, T * 0.03);
      fillStroke(g, '#8fdcf5', lw * 0.8);
      break;
    }
    case 'tower': {
      shadow(g, x + T * 0.5, y + T * 0.92, T * 0.46, T * 0.09);
      water(g, x + T * 0.04, y + T * 0.62, T * 0.5, T * 0.3, T * 0.1, t, false, 1);
      // 钢架塔
      g.lineCap = 'round';
      const L = 0.42, R = 0.92, top = -0.95;
      for (const [col, w] of [[INK, lw * 2.6], [PAL.steel, lw * 1.4]] as [string, number][]) {
        g.strokeStyle = col; g.lineWidth = w;
        for (const dx of [L, R]) { g.beginPath(); g.moveTo(x + T * dx, y + T * top); g.lineTo(x + T * dx, y + T * 0.9); g.stroke(); }
      }
      g.strokeStyle = PAL.steelDeep; g.lineWidth = lw * 0.8;
      for (let k = 0; k < 4; k++) {
        const y0 = top + 0.1 + k * 0.45, y1 = y0 + 0.45;
        g.beginPath(); g.moveTo(x + T * L, y + T * y0); g.lineTo(x + T * R, y + T * y1);
        g.moveTo(x + T * R, y + T * y0); g.lineTo(x + T * L, y + T * y1); g.stroke();
      }
      rr(g, x + T * 0.34, y + T * (top - 0.1), T * 0.66, T * 0.14, T * 0.04);
      fillStroke(g, PAL.aqua, lw);
      tube(g, gg => {
        gg.beginPath();
        gg.moveTo(x + T * 0.5, y + T * (top - 0.02));
        gg.bezierCurveTo(x - T * 0.05, y - T * 0.7, x + T * 1.05, y - T * 0.35, x + T * 0.6, y - T * 0.05);
        gg.bezierCurveTo(x + T * 0.1, y + T * 0.25, x + T * 0.55, y + T * 0.5, x + T * 0.28, y + T * 0.74);
      }, T, PAL.coral);
      // 旗
      g.strokeStyle = INK; g.lineWidth = lw * 0.8;
      g.beginPath(); g.moveTo(x + T * 0.92, y + T * (top - 0.1)); g.lineTo(x + T * 0.92, y + T * (top - 0.4)); g.stroke();
      g.fillStyle = PAL.sun;
      g.beginPath(); g.moveTo(x + T * 0.92, y + T * (top - 0.4));
      g.lineTo(x + T * (0.72 + Math.sin(t * 5) * 0.02), y + T * (top - 0.33)); g.lineTo(x + T * 0.92, y + T * (top - 0.26)); g.fill();
      break;
    }
  }
}

export function drawGate(g: C, x: number, y: number, T: number) {
  const lw = Math.max(1.5, T * 0.035);
  g.fillStyle = PAL.aqua; rr(g, x + T * 0.18, y + T * 0.1, T * 0.64, T * 0.86, T * 0.08); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 4; i++) g.fillRect(x + T * 0.22, y + T * (0.2 + i * 0.2), T * 0.56, T * 0.05);
  for (const dx of [0.04, 0.8]) {
    rr(g, x + T * dx, y + T * 0.05, T * 0.16, T * 0.9, T * 0.05);
    fillStroke(g, PAL.coral, lw);
  }
  rr(g, x - T * 0.04, y - T * 0.12, T * 1.08, T * 0.3, T * 0.1);
  fillStroke(g, PAL.sun, lw);
  g.fillStyle = INK;
  g.font = `900 ${Math.round(T * 0.2)}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('入 口', x + T * 0.5, y + T * 0.035);
}

// ---------- 游客 ----------
const SKIN = ['#f8d9bd', '#eec09a', '#d39a6f', '#9a6644'];
const SUIT = [PAL.coral, PAL.aqua, PAL.sun, PAL.palm, PAL.pink, '#6c7ee8'];
const HAIR = ['#3b2a20', '#6b4423', '#1d1d1d', '#c98b3c', '#9a9a9a'];

export function drawVisitor(g: C, x: number, y: number, T: number, uid: number, t: number, mode: 'walk' | 'stand' | 'swim') {
  const skin = SKIN[uid % SKIN.length], suit = SUIT[(uid * 7) % SUIT.length], hair = HAIR[(uid * 3) % HAIR.length];
  const ring = uid % 3 === 0;
  const s = T * 0.15; // 基本单位
  const lw = Math.max(1, T * 0.025);
  const ph = t * 12 + uid;
  if (mode === 'swim') {
    const by = y + Math.sin(t * 3 + uid) * s * 0.15;
    if (ring) {
      g.lineWidth = s * 0.45; g.strokeStyle = INK;
      g.beginPath(); g.ellipse(x, by + s * 0.35, s * 0.85, s * 0.4, 0, 0, TAU); g.stroke();
      g.lineWidth = s * 0.3; g.strokeStyle = PAL.coral; g.stroke();
    } else {
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = lw;
      g.beginPath(); g.ellipse(x, by + s * 0.45, s * 0.75, s * 0.25, 0, 0, TAU); g.stroke();
    }
    head(g, x, by, s, skin, hair, lw);
    return;
  }
  const bob = mode === 'walk' ? Math.abs(Math.sin(ph)) * s * 0.15 : 0;
  shadow(g, x, y + s * 1.05, s * 0.6, s * 0.2, 0.2);
  // 腿
  g.strokeStyle = INK; g.lineWidth = s * 0.32; g.lineCap = 'round';
  const sw = mode === 'walk' ? Math.sin(ph) * s * 0.25 : 0;
  g.beginPath(); g.moveTo(x - s * 0.2, y + s * 0.4 - bob); g.lineTo(x - s * 0.2 + sw, y + s * 0.95);
  g.moveTo(x + s * 0.2, y + s * 0.4 - bob); g.lineTo(x + s * 0.2 - sw, y + s * 0.95); g.stroke();
  g.strokeStyle = skin; g.lineWidth = s * 0.18; g.stroke();
  // 身体
  rr(g, x - s * 0.42, y - s * 0.25 - bob, s * 0.84, s * 0.75, s * 0.28);
  fillStroke(g, suit, lw);
  if (ring) {
    g.lineWidth = s * 0.34; g.strokeStyle = INK;
    g.beginPath(); g.ellipse(x, y + s * 0.2 - bob, s * 0.72, s * 0.3, 0, 0, TAU); g.stroke();
    g.lineWidth = s * 0.22; g.strokeStyle = (uid * 5) % 2 ? PAL.sun : '#ff5a5a'; g.stroke();
  }
  head(g, x, y - s * 0.62 - bob, s, skin, hair, lw);
}

function head(g: C, x: number, y: number, s: number, skin: string, hair: string, lw: number) {
  g.beginPath(); g.arc(x, y, s * 0.48, 0, TAU);
  fillStroke(g, skin, lw);
  g.fillStyle = hair;
  g.beginPath(); g.arc(x, y - s * 0.05, s * 0.5, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
  g.fillStyle = INK;
  g.beginPath(); g.arc(x - s * 0.16, y + s * 0.05, s * 0.06, 0, TAU); g.arc(x + s * 0.16, y + s * 0.05, s * 0.06, 0, TAU); g.fill();
}

// ---------- 垃圾 ----------
export function drawTrash(g: C, x: number, y: number, T: number, uid: number) {
  const s = T * 0.1, lw = Math.max(1, T * 0.022);
  shadow(g, x, y + s * 0.7, s * 0.8, s * 0.25, 0.15);
  if (uid % 2) {
    g.save(); g.translate(x, y); g.rotate(((uid % 5) - 2) * 0.35);
    g.beginPath(); g.moveTo(-s * 0.5, -s * 0.7); g.lineTo(s * 0.5, -s * 0.7); g.lineTo(s * 0.35, s * 0.6); g.lineTo(-s * 0.35, s * 0.6); g.closePath();
    fillStroke(g, '#ff5a5a', lw);
    g.fillStyle = '#fff'; g.fillRect(-s * 0.45, -s * 0.25, s * 0.85, s * 0.25);
    g.strokeStyle = INK; g.lineWidth = lw * 1.2; g.beginPath(); g.moveTo(s * 0.1, -s * 0.7); g.lineTo(s * 0.35, -s * 1.15); g.stroke();
    g.restore();
  } else {
    g.save(); g.translate(x, y); g.rotate((uid % 7) * 0.8);
    g.beginPath(); g.arc(0, -s * 0.5, s * 0.9, Math.PI * 0.15, Math.PI * 0.85);
    g.arc(0, -s * 0.9, s * 1.05, Math.PI * 0.8, Math.PI * 0.2, true); g.closePath();
    fillStroke(g, PAL.sun, lw);
    g.restore();
  }
}

// ---------- 场景（静态层：边框、草地、地砖）----------
export function drawScenery(g: C, W: number, H: number, ox: number, oy: number, T: number, cols: number, rows: number) {
  // 草地
  g.fillStyle = '#86d36f'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.08)';
  for (let i = -H; i < W; i += T * 0.5) { g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.lineTo(i + H + T * 0.25, 0); g.lineTo(i + T * 0.25, H); g.fill(); }
  // 沙滩 + 海（上沿）
  g.fillStyle = PAL.sand; g.fillRect(0, 0, W, oy - T * 0.08);
  // 地砖
  const gw = cols * T, gh = rows * T;
  rr(g, ox - 4, oy - 4, gw + 8, gh + 8, 10);
  g.fillStyle = PAL.sandDeep; g.fill();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ox + c * T, y = oy + r * T;
    g.fillStyle = (r + c) % 2 ? '#fbf0d6' : '#f6e6c3';
    g.fillRect(x, y, T, T);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 2, y + 2, T - 4, 2);
    g.fillStyle = 'rgba(180,140,80,.12)'; g.fillRect(x, y + T - 2, T, 2); g.fillRect(x + T - 2, y, 2, T);
  }
  g.lineWidth = 3; g.strokeStyle = INK; rr(g, ox - 4, oy - 4, gw + 8, gh + 8, 10); g.stroke();
  // 两侧栅栏桩
  g.fillStyle = '#ffffff'; g.lineWidth = 1.5; g.strokeStyle = INK;
  for (let y = oy + T * 0.3; y < oy + gh; y += T * 0.5) {
    for (const x of [ox - T * 0.22, ox + gw + T * 0.1]) { rr(g, x, y, T * 0.12, T * 0.26, 3); g.fill(); g.stroke(); }
  }
  // 棕榈树
  const palms: [number, number, number][] = [
    [ox - T * 0.15, oy + T * 1.2, 1], [ox + gw + T * 0.15, oy + T * 3.4, -1],
    [ox - T * 0.15, oy + T * 6.1, 1], [ox + gw + T * 0.15, oy + T * 8.2, -1],
  ];
  for (const [px, py, dir] of palms) palm(g, px, py, T * 0.9, dir);
}

/** 海浪层每帧画（会动） */
export function drawSea(g: C, W: number, seaH: number, t: number, T: number) {
  const grad = g.createLinearGradient(0, 0, 0, seaH);
  grad.addColorStop(0, '#2aa7d8'); grad.addColorStop(1, PAL.aquaLight);
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0);
  for (let x = W; x >= 0; x -= 6) g.lineTo(x, seaH + Math.sin(x * 0.05 + t * 1.5) * seaH * 0.08);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5;
  g.beginPath();
  for (let x = 0; x <= W; x += 6) {
    const y = seaH + Math.sin(x * 0.05 + t * 1.5) * seaH * 0.08;
    x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 97 + t * 14) % (W + 60)) - 30, y = seaH * (0.25 + ((i * 37) % 50) / 100);
    g.beginPath(); g.arc(x, y, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  }
  // 海面有空间时：浮标和帆船
  if (seaH > T * 1.4) {
    for (const [fx, fy] of [[0.18, 0.62], [0.5, 0.7], [0.82, 0.6]]) {
      const bx = W * fx, by = seaH * fy + Math.sin(t * 2 + fx * 9) * 2;
      g.beginPath(); g.arc(bx, by, T * 0.09, 0, TAU); fillStroke(g, PAL.coral, 2);
      g.fillStyle = '#fff'; g.fillRect(bx - T * 0.09, by - T * 0.025, T * 0.18, T * 0.05);
    }
    const sx = ((t * 9) % (W + T * 2)) - T, sy = seaH * 0.35 + Math.sin(t * 1.4) * 3;
    g.beginPath(); g.moveTo(sx - T * 0.4, sy); g.lineTo(sx + T * 0.4, sy); g.lineTo(sx + T * 0.28, sy + T * 0.18); g.lineTo(sx - T * 0.28, sy + T * 0.18); g.closePath();
    fillStroke(g, '#fff', 2);
    g.fillStyle = PAL.coral; g.fillRect(sx - T * 0.3, sy + T * 0.05, T * 0.6, T * 0.04);
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - T * 0.6); g.stroke();
    g.beginPath(); g.moveTo(sx + 2, sy - T * 0.58); g.lineTo(sx + T * 0.34, sy - T * 0.06); g.lineTo(sx + 2, sy - T * 0.06); g.closePath();
    fillStroke(g, PAL.sun, 2);
    g.beginPath(); g.moveTo(sx - 2, sy - T * 0.45); g.lineTo(sx - T * 0.26, sy - T * 0.06); g.lineTo(sx - 2, sy - T * 0.06); g.closePath();
    fillStroke(g, '#fff', 2);
  }
}

function palm(g: C, x: number, y: number, S: number, dir: number) {
  shadow(g, x + dir * S * 0.1, y + S * 0.42, S * 0.35, S * 0.1, 0.2);
  g.lineCap = 'round';
  g.strokeStyle = INK; g.lineWidth = S * 0.16;
  g.beginPath(); g.moveTo(x, y + S * 0.4); g.quadraticCurveTo(x + dir * S * 0.15, y, x + dir * S * 0.05, y - S * 0.45); g.stroke();
  g.strokeStyle = '#b07a45'; g.lineWidth = S * 0.1; g.stroke();
  const tx = x + dir * S * 0.05, ty = y - S * 0.45;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.62;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * S * 0.35, ty + Math.sin(a) * S * 0.35 - S * 0.08, tx + Math.cos(a) * S * 0.55, ty + Math.sin(a) * S * 0.55 + S * 0.12);
    g.quadraticCurveTo(tx + Math.cos(a) * S * 0.3, ty + Math.sin(a) * S * 0.3 + S * 0.05, tx, ty);
    g.fillStyle = i % 2 ? PAL.palm : PAL.palmDeep; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
  }
  g.fillStyle = '#8a5a2b';
  for (const dx of [-0.06, 0.06]) { g.beginPath(); g.arc(tx + S * dx, ty + S * 0.06, S * 0.06, 0, TAU); g.fill(); }
}

// ---------- 图标 ----------
export function drawIcon(g: C, kind: 'coin' | Mat, x: number, y: number, S: number) {
  const lw = Math.max(1.2, S * 0.07);
  switch (kind) {
    case 'coin': {
      g.beginPath(); g.arc(x, y, S * 0.42, 0, TAU); fillStroke(g, PAL.sun, lw);
      g.beginPath(); g.arc(x, y, S * 0.28, 0, TAU); g.lineWidth = lw * 0.8; g.strokeStyle = PAL.sunDeep; g.stroke();
      g.fillStyle = PAL.sunDeep;
      g.font = `900 ${Math.round(S * 0.36)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('¥', x, y + S * 0.02);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(x - S * 0.16, y - S * 0.2, S * 0.08, S * 0.05, -0.6, 0, TAU); g.fill();
      break;
    }
    case 'plastic': {
      rr(g, x - S * 0.07, y - S * 0.44, S * 0.14, S * 0.1, S * 0.02); fillStroke(g, PAL.coral, lw);
      g.beginPath();
      g.moveTo(x - S * 0.08, y - S * 0.34); g.lineTo(x + S * 0.08, y - S * 0.34);
      g.quadraticCurveTo(x + S * 0.24, y - S * 0.22, x + S * 0.24, y - S * 0.05);
      g.lineTo(x + S * 0.24, y + S * 0.36); g.quadraticCurveTo(x + S * 0.24, y + S * 0.44, x + S * 0.16, y + S * 0.44);
      g.lineTo(x - S * 0.16, y + S * 0.44); g.quadraticCurveTo(x - S * 0.24, y + S * 0.44, x - S * 0.24, y + S * 0.36);
      g.lineTo(x - S * 0.24, y - S * 0.05); g.quadraticCurveTo(x - S * 0.24, y - S * 0.22, x - S * 0.08, y - S * 0.34);
      g.closePath(); fillStroke(g, '#8fdcf5', lw);
      g.fillStyle = '#fff'; g.fillRect(x - S * 0.23, y + S * 0.02, S * 0.46, S * 0.16);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - S * 0.15, y - S * 0.15, S * 0.06, S * 0.12);
      break;
    }
    case 'metal': {
      g.beginPath();
      g.moveTo(x - S * 0.3, y - S * 0.1); g.lineTo(x + S * 0.3, y - S * 0.1);
      g.lineTo(x + S * 0.44, y + S * 0.28); g.lineTo(x - S * 0.44, y + S * 0.28); g.closePath();
      const gr = g.createLinearGradient(0, y - S * 0.1, 0, y + S * 0.28);
      gr.addColorStop(0, '#e3eaf0'); gr.addColorStop(1, PAL.steelDeep);
      fillStroke(g, gr, lw);
      g.beginPath();
      g.moveTo(x - S * 0.18, y - S * 0.38); g.lineTo(x + S * 0.24, y - S * 0.38);
      g.lineTo(x + S * 0.32, y - S * 0.12); g.lineTo(x - S * 0.26, y - S * 0.12); g.closePath();
      fillStroke(g, '#cfd9e1', lw);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x - S * 0.12, y - S * 0.32, S * 0.18, S * 0.04);
      break;
    }
    case 'wood': {
      rr(g, x - S * 0.4, y - S * 0.2, S * 0.7, S * 0.42, S * 0.08); fillStroke(g, '#b9773d', lw);
      g.strokeStyle = 'rgba(80,40,10,.35)'; g.lineWidth = lw * 0.7;
      g.beginPath(); g.moveTo(x - S * 0.32, y - S * 0.05); g.lineTo(x + S * 0.1, y - S * 0.05); g.moveTo(x - S * 0.25, y + S * 0.08); g.lineTo(x + S * 0.15, y + S * 0.08); g.stroke();
      g.beginPath(); g.ellipse(x + S * 0.3, y + S * 0.01, S * 0.14, S * 0.21, 0, 0, TAU); fillStroke(g, '#f0c98b', lw);
      g.strokeStyle = '#c99556'; g.lineWidth = lw * 0.6;
      g.beginPath(); g.ellipse(x + S * 0.3, y + S * 0.01, S * 0.07, S * 0.11, 0, 0, TAU); g.stroke();
      break;
    }
  }
}

const iconCache = new Map<string, string>();
/** 生成 DOM 用的图片 dataURL（材料图标 / 建筑缩略图） */
export function iconURL(kind: 'coin' | Mat, px = 48): string {
  const key = `i:${kind}:${px}`;
  if (!iconCache.has(key)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    drawIcon(cv.getContext('2d')!, kind, px / 2, px / 2, px * 0.95);
    iconCache.set(key, cv.toDataURL());
  }
  return iconCache.get(key)!;
}
export function thumbURL(type: BuildingType, px = 112): string {
  const key = `b:${type}:${px}`;
  if (!iconCache.has(key)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const g = cv.getContext('2d')!;
    const tall = type === 'tower' ? 0.5 : type === 'slide' ? 0.66 : 0.78;
    const T = px * tall;
    const topExtra = type === 'tower' ? 1.35 : type === 'slide' ? 0.45 : type === 'wave' ? 0.25 : 0.1;
    drawBuilding(g, type, (px - T) / 2, (px - T * (1 + topExtra)) / 2 + T * topExtra, T, 0.6);
    iconCache.set(key, cv.toDataURL());
  }
  return iconCache.get(key)!;
}
