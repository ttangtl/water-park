import { COLS, ROWS, GATE, OPEN_LEN, DAY_LEN, type BuildingType } from './data';
import { S, rt, canPlace, stats, type Building, type Visitor } from './game';
import { INK, drawBuilding, drawGate, drawVisitor, drawTrash, drawScenery, drawSea, drawIcon } from './art';

export const view = {
  tile: 48, ox: 0, oy: 0, W: 0, H: 0, sea: 0,
  placing: null as BuildingType | null,
  selected: null as number | null,
};

let ctx: CanvasRenderingContext2D;
let canvas: HTMLCanvasElement;
let scenery: HTMLCanvasElement | null = null;
let dpr = 1;

export function initRender(c: HTMLCanvasElement) {
  canvas = c;
  ctx = c.getContext('2d')!;
  resize();
  window.addEventListener('resize', resize);
}

// 版面：上方留海和沙滩，左右下留草地边
const M_SIDE = 0.45, M_TOP = 1.05, M_BOTTOM = 0.3;

export function resize() {
  const wrap = canvas.parentElement!;
  const T = Math.floor(Math.min(wrap.clientWidth / (COLS + M_SIDE * 2), wrap.clientHeight / (ROWS + M_TOP + M_BOTTOM)));
  view.tile = T;
  view.W = Math.max(Math.round(T * (COLS + M_SIDE * 2)), Math.floor(wrap.clientWidth));
  // 多出来的高度全给上方的海
  view.H = Math.max(Math.round(T * (ROWS + M_TOP + M_BOTTOM)), Math.floor(wrap.clientHeight));
  view.ox = Math.round((view.W - COLS * T) / 2);
  view.oy = Math.round(view.H - T * (ROWS + M_BOTTOM));
  view.sea = Math.max(T * 0.5, view.oy - T * 0.55);
  dpr = window.devicePixelRatio || 1;
  canvas.style.width = view.W + 'px';
  canvas.style.height = view.H + 'px';
  canvas.width = view.W * dpr;
  canvas.height = view.H * dpr;
  scenery = document.createElement('canvas');
  scenery.width = canvas.width; scenery.height = canvas.height;
  const sg = scenery.getContext('2d')!;
  sg.scale(dpr, dpr);
  drawScenery(sg, view.W, view.H, view.ox, view.oy, T, COLS, ROWS);
}

export function tileFromEvent(e: PointerEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  return [
    Math.floor((e.clientX - rect.left - view.ox) / view.tile),
    Math.floor((e.clientY - rect.top - view.oy) / view.tile),
  ];
}

const SWIM: BuildingType[] = ['pool', 'wave'];
const SPLASH: BuildingType[] = ['slide', 'tower'];

/** 游客在设施里时的画法和位置 */
function usePose(v: Visitor, b: Building, i: number, T: number): { x: number; y: number; mode: 'swim' | 'stand' } {
  const bx = view.ox + b.c * T, by = view.oy + b.r * T;
  if (SWIM.includes(b.type)) {
    const spots = [[0.32, 0.4], [0.62, 0.62], [0.42, 0.66], [0.66, 0.38], [0.24, 0.58], [0.52, 0.48], [0.76, 0.56], [0.36, 0.5]];
    const [sx, sy] = spots[i % spots.length];
    return { x: bx + T * sx, y: by + T * (b.type === 'wave' ? sy + 0.06 : sy), mode: 'swim' };
  }
  if (SPLASH.includes(b.type)) {
    return { x: bx + T * (0.2 + (i % 3) * 0.13), y: by + T * 0.74, mode: 'swim' };
  }
  if (b.type === 'umbrella') {
    return { x: bx + T * (0.28 + (i % 3) * 0.22), y: by + T * 0.6, mode: 'stand' };
  }
  // 小吃摊：排在摊位前
  return { x: bx + T * (0.35 + (i % 2) * 0.3), y: by + T * 0.92, mode: 'stand' };
}

export function draw(now: number) {
  const T = view.tile, t = now / 1000;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (scenery) { ctx.drawImage(scenery, 0, 0, view.W, view.H); }
  drawSea(ctx, view.W, view.sea, t, T);

  const ox = view.ox, oy = view.oy;

  // 放置模式：可放的格子
  if (view.placing) {
    const pulse = 0.25 + Math.sin(t * 5) * 0.1;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!canPlace(c, r)) continue;
      ctx.fillStyle = `rgba(59,178,115,${pulse})`;
      ctx.beginPath(); ctx.roundRect(ox + c * T + 3, oy + r * T + 3, T - 6, T - 6, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(42,140,88,.7)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // 垃圾
  for (const tr of S.trash) {
    const sx = ((tr.uid * 37) % 60) / 100, sy = ((tr.uid * 53) % 50) / 100;
    drawTrash(ctx, ox + (tr.c + 0.2 + sx) * T, oy + (tr.r + 0.3 + sy) * T, T, tr.uid);
  }

  // 选中框
  const sel = S.buildings.find(b => b.uid === view.selected);
  if (sel) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.roundRect(ox + sel.c * T + 1, oy + sel.r * T + 1, T - 2, T - 2, 10); ctx.fill();
    if (sel.type === 'recycle') {
      const rad = stats(sel).recycleRadius;
      ctx.fillStyle = 'rgba(59,178,115,.12)';
      ctx.strokeStyle = 'rgba(42,140,88,.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.roundRect(ox + (sel.c - rad) * T, oy + (sel.r - rad) * T, (rad * 2 + 1) * T, (rad * 2 + 1) * T, 12);
      ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // 按纵深排序画：建筑、游客、大门
  type Item = { k: number; fn: () => void };
  const items: Item[] = [];
  items.push({ k: GATE.r + 0.9, fn: () => drawGate(ctx, ox + GATE.c * T, oy + GATE.r * T, T) });

  const slots = new Map<number, number>();
  for (const v of rt.visitors) {
    const b = v.state === 'use' && v.target != null ? S.buildings.find(x => x.uid === v.target) : undefined;
    if (b) {
      const i = slots.get(b.uid) ?? 0;
      slots.set(b.uid, i + 1);
      const p = usePose(v, b, i, T);
      const k = p.mode === 'swim' ? b.r + 0.91 : (p.y - oy) / T + 0.2;
      items.push({ k, fn: () => drawVisitor(ctx, p.x, p.y, T, v.uid, t, p.mode) });
    } else {
      items.push({
        k: v.y + 0.55,
        fn: () => drawVisitor(ctx, ox + (v.x + 0.5) * T, oy + (v.y + 0.42) * T, T, v.uid, t, v.path.length ? 'walk' : 'stand'),
      });
    }
  }

  for (const b of S.buildings) {
    items.push({
      k: b.r + 0.9,
      fn: () => {
        const x = ox + b.c * T, y = oy + b.r * T;
        drawBuilding(ctx, b.type, x, y, T, t + b.uid);
        if (b.level > 1) levelBadge(x + T * 0.98, y + T * 0.94, b.level, T);
      },
    });
  }
  items.sort((a, b) => a.k - b.k);
  for (const it of items) it.fn();

  // 打烊时的夕阳色
  if (S.time > OPEN_LEN - 10) {
    const a = Math.min(1, (S.time - (OPEN_LEN - 10)) / (DAY_LEN - OPEN_LEN + 10)) * 0.22;
    ctx.fillStyle = `rgba(255,120,60,${a})`;
    ctx.fillRect(0, 0, view.W, view.H);
  }

  // 飘字
  for (const f of rt.floaters) {
    const p = f.t / 1.2;
    const x = ox + (f.x + 0.5) * T, y = oy + (f.y + 0.1 - p * 0.7) * T;
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    const s = T * 0.3 * (p < 0.12 ? 0.6 + p * 3.3 : 1);
    drawIcon(ctx, f.icon, x - s * 0.55, y, s);
    ctx.font = `900 ${Math.round(s * 0.85)}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, s * 0.2); ctx.strokeStyle = INK;
    ctx.strokeText(`+${f.n}`, x - s * 0.1, y + 1);
    ctx.fillStyle = f.icon === 'coin' ? '#ffe27a' : '#bff3ff';
    ctx.fillText(`+${f.n}`, x - s * 0.1, y + 1);
    ctx.globalAlpha = 1;
  }
}

function levelBadge(right: number, bottom: number, level: number, T: number) {
  const h = T * 0.24, w = T * 0.4;
  const x = right - w, y = bottom - h;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = level >= 5 ? '#ffc93c' : INK; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = level >= 5 ? INK : '#fff';
  ctx.font = `900 ${Math.round(h * 0.62)}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(level >= 5 ? 'MAX' : `Lv${level}`, x + w / 2, y + h / 2 + 1);
}
