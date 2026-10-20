import {
  COLS, ROWS, GATE, DAY_LEN, OPEN_LEN, TICKET, SAVE_KEY, MAX_LEVEL, START,
  MATS, MAT_IDS, BUILDING_IDS, def,
  type Mat, type Cost, type BuildingType,
} from './data';

export interface Building {
  uid: number; type: BuildingType; c: number; r: number;
  level: number; earned: number; cd: number;
}
export interface Trash { uid: number; c: number; r: number }

export interface Visitor {
  uid: number;
  x: number; y: number; // 浮点格坐标（格中心为整数）
  path: [number, number][];
  state: 'walk' | 'use';
  leaving: boolean;
  target: number | null; // building uid
  timer: number;
  wants: number;
  money: number;
  used: number;
  frustrated: boolean;
  face: string;
}

export type FloatIcon = 'coin' | Mat;
export interface Floater { x: number; y: number; n: number; icon: FloatIcon; t: number }

export interface DayReport {
  day: number; income: number; visitors: number; rating: number; unlocked: BuildingType[];
}

export interface State {
  coins: number;
  mats: Record<Mat, number>;
  buildings: Building[];
  trash: Trash[];
  day: number;
  time: number;
  prices: Record<Mat, number>;
  nextUid: number;
  today: { income: number; visitors: number; happy: number; unhappy: number };
  totalVisitors: number;
  tutorial: number; // 新手引导进行到第几步，-1 = 已完成
}

const FACES = ['🧒', '👧', '👦', '👩', '👨', '🧑', '👵', '👴'];

// ---------- 运行时（不存档）----------
export let S: State = newState();
export const rt = {
  visitors: [] as Visitor[],
  floaters: [] as Floater[],
  spawnTimer: 2,
  speed: 1,
  onDayEnd: null as ((r: DayReport) => void) | null,
  onChange: null as (() => void) | null,
};

function newState(): State {
  const s: State = {
    coins: START.coins,
    mats: { ...START.mats },
    buildings: [],
    trash: [],
    day: 1,
    time: 0,
    prices: rollPrices(),
    nextUid: 1,
    today: { income: 0, visitors: 0, happy: 0, unhappy: 0 },
    totalVisitors: 0,
    tutorial: 0,
  };
  // 开局送一个泳池
  s.buildings.push({ uid: s.nextUid++, type: 'pool', c: 3, r: 5, level: 1, earned: 0, cd: 0 });
  return s;
}

function rollPrices(): Record<Mat, number> {
  const p = {} as Record<Mat, number>;
  for (const m of MAT_IDS) p[m] = Math.max(1, Math.round(MATS[m].price * (0.7 + Math.random() * 0.6)));
  return p;
}

// ---------- 存档 ----------
export function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* 隐私模式等 */ }
}
/** 读档；返回是否有旧存档 */
export function load(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      // 引导功能上线前的老存档不再弹引导
      S = { ...newState(), tutorial: -1, ...JSON.parse(raw) };
      return true;
    }
  } catch { S = newState(); }
  return false;
}
export function resetGame() {
  S = newState();
  rt.visitors = [];
  rt.floaters = [];
  save();
}

// ---------- 资源 ----------
export function canAfford(cost: Cost): boolean {
  for (const [k, v] of Object.entries(cost)) {
    const have = k === 'coins' ? S.coins : S.mats[k as Mat];
    if (have < (v ?? 0)) return false;
  }
  return true;
}
function pay(cost: Cost) {
  for (const [k, v] of Object.entries(cost)) {
    if (k === 'coins') S.coins -= v ?? 0;
    else S.mats[k as Mat] -= v ?? 0;
  }
}
function refund(cost: Cost, ratio: number) {
  for (const [k, v] of Object.entries(cost)) {
    const n = Math.floor((v ?? 0) * ratio);
    if (k === 'coins') S.coins += n;
    else S.mats[k as Mat] += n;
  }
}
export function buy(m: Mat, n: number): boolean {
  const total = S.prices[m] * n;
  if (S.coins < total) return false;
  S.coins -= total;
  S.mats[m] += n;
  rt.onChange?.();
  return true;
}

// ---------- 建筑 ----------
export function buildingAt(c: number, r: number) {
  return S.buildings.find(b => b.c === c && b.r === r);
}
export function isUnlocked(t: BuildingType) { return S.day >= def(t).unlockDay; }

export function canPlace(c: number, r: number) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  if (c === GATE.c && r === GATE.r) return false;
  return !buildingAt(c, r);
}

export function place(t: BuildingType, c: number, r: number): boolean {
  const d = def(t);
  if (!canPlace(c, r) || !canAfford(d.cost) || !isUnlocked(t)) return false;
  pay(d.cost);
  S.buildings.push({ uid: S.nextUid++, type: t, c, r, level: 1, earned: 0, cd: 0 });
  // 压在新建筑下的垃圾直接清掉
  S.trash = S.trash.filter(x => !(x.c === c && x.r === r));
  rt.onChange?.();
  return true;
}

export function stats(b: Building) {
  const d = def(b.type);
  const L = b.level - 1;
  return {
    fee: Math.round(d.fee * (1 + 0.3 * L)),
    capacity: d.capacity + L,
    appeal: d.appeal * (1 + 0.5 * L),
    useTime: d.useTime,
    recycleEvery: Math.max(0.8, 2.5 - 0.4 * L),
    recycleRadius: 2 + (b.level >= 3 ? 1 : 0),
  };
}

export function upgradeCost(b: Building): Cost | null {
  if (b.level >= MAX_LEVEL) return null;
  const c: Cost = {};
  for (const [k, v] of Object.entries(def(b.type).cost)) {
    c[k as keyof Cost] = Math.ceil((v ?? 0) * 0.8 * b.level);
  }
  return c;
}
export function upgrade(b: Building): boolean {
  const cost = upgradeCost(b);
  if (!cost || !canAfford(cost)) return false;
  pay(cost);
  b.level++;
  rt.onChange?.();
  return true;
}
export function demolish(b: Building) {
  refund(def(b.type).cost, 0.5);
  S.buildings = S.buildings.filter(x => x !== b);
  for (const v of rt.visitors) if (v.target === b.uid) { v.target = null; v.state = 'walk'; chooseNext(v); }
  rt.onChange?.();
}

export function parkAppeal() {
  return S.buildings.reduce((a, b) => a + stats(b).appeal, 0);
}
export function cleanliness() {
  return Math.max(0.2, 1 - S.trash.length * 0.04);
}

// ---------- 垃圾 ----------
function dropTrash(c: number, r: number) {
  if (S.trash.length >= 60) return;
  if (!inBounds(c, r) || buildingAt(c, r)) return;
  S.trash.push({ uid: S.nextUid++, c, r });
}
/** 玩家点格子捡垃圾，手动分拣成塑料 */
export function collectTrashAt(c: number, r: number): number {
  const before = S.trash.length;
  S.trash = S.trash.filter(x => !(x.c === c && x.r === r));
  const n = before - S.trash.length;
  if (n > 0) {
    S.mats.plastic += n;
    float(c, r, n, 'plastic');
    rt.onChange?.();
  }
  return n;
}

// ---------- 寻路 ----------
function inBounds(c: number, r: number) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; }
function walkable(c: number, r: number) { return inBounds(c, r) && !buildingAt(c, r); }
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function bfs(sc: number, sr: number, goal: (c: number, r: number) => boolean): [number, number][] | null {
  const key = (c: number, r: number) => r * COLS + c;
  const prev = new Map<number, number>();
  const q: [number, number][] = [[sc, sr]];
  prev.set(key(sc, sr), -1);
  while (q.length) {
    const [c, r] = q.shift()!;
    if (goal(c, r)) {
      const path: [number, number][] = [];
      let k = key(c, r);
      while (k !== key(sc, sr)) { path.unshift([k % COLS, Math.floor(k / COLS)]); k = prev.get(k)!; }
      return path;
    }
    for (const [dc, dr] of DIRS) {
      const nc = c + dc, nr = r + dr;
      if (!walkable(nc, nr) || prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), key(c, r));
      q.push([nc, nr]);
    }
  }
  return null;
}

// ---------- 游客 ----------
function tileOf(v: Visitor): [number, number] { return [Math.round(v.x), Math.round(v.y)]; }

export function occupancy(b: Building) {
  return rt.visitors.filter(v => v.target === b.uid).length;
}

function goLeave(v: Visitor) {
  v.leaving = true;
  v.target = null;
  const [c, r] = tileOf(v);
  const p = bfs(c, r, (x, y) => x === GATE.c && y === GATE.r);
  if (p) { v.path = p; v.state = 'walk'; }
  else finishVisitor(v);
}

function chooseNext(v: Visitor) {
  const closing = S.time >= OPEN_LEN;
  if (closing || v.wants <= 0) return goLeave(v);
  const [c, r] = tileOf(v);
  const cands = S.buildings
    .filter(b => def(b.type).kind !== 'util')
    .map(b => ({ b, st: stats(b) }))
    .filter(({ b, st }) => st.fee <= v.money && occupancy(b) < st.capacity);
  // 按吸引力加权随机，挑到走不过去的就换一个
  while (cands.length) {
    const total = cands.reduce((a, x) => a + x.st.appeal, 0);
    let roll = Math.random() * total;
    let i = 0;
    for (; i < cands.length - 1; i++) { roll -= cands[i].st.appeal; if (roll <= 0) break; }
    const { b } = cands[i];
    const p = bfs(c, r, (x, y) => Math.abs(x - b.c) + Math.abs(y - b.r) === 1);
    if (p) { v.target = b.uid; v.path = p; v.state = 'walk'; return; }
    cands.splice(i, 1);
  }
  v.frustrated = true;
  goLeave(v);
}

function finishVisitor(v: Visitor) {
  rt.visitors = rt.visitors.filter(x => x !== v);
  if (v.used > 0 && !v.frustrated) S.today.happy++;
  else S.today.unhappy++;
}

function spawn() {
  if (!walkable(GATE.c, GATE.r)) return;
  const v: Visitor = {
    uid: S.nextUid++, x: GATE.c, y: GATE.r, path: [], state: 'walk', leaving: false,
    target: null, timer: 0,
    wants: 2 + Math.floor(Math.random() * 3),
    money: Math.round(15 + Math.random() * 35 + S.day * 4),
    used: 0, frustrated: false,
    face: FACES[Math.floor(Math.random() * FACES.length)],
  };
  earn(TICKET, GATE.c, GATE.r);
  S.today.visitors++;
  S.totalVisitors++;
  rt.visitors.push(v);
  chooseNext(v);
}

function earn(n: number, c: number, r: number) {
  if (n <= 0) return;
  S.coins += n;
  S.today.income += n;
  float(c, r, n, 'coin');
}

function float(c: number, r: number, n: number, icon: FloatIcon) {
  rt.floaters.push({ x: c, y: r, n, icon, t: 0 });
}

const SPEED = 2; // 格/秒

function updateVisitor(v: Visitor, dt: number) {
  if (v.state === 'use') {
    v.timer -= dt;
    if (v.timer <= 0) {
      const b = S.buildings.find(x => x.uid === v.target);
      v.target = null;
      v.wants--;
      v.used++;
      if (b && Math.random() < def(b.type).trash) dropTrash(...tileOf(v));
      chooseNext(v);
    }
    return;
  }
  // walk
  if (v.path.length) {
    const [tc, tr] = v.path[0];
    const dx = tc - v.x, dy = tr - v.y;
    const dist = Math.hypot(dx, dy);
    const step = SPEED * dt;
    if (dist <= step) {
      v.x = tc; v.y = tr; v.path.shift();
      // 路被新建筑挡住了就重新规划
      if (v.path.length && !walkable(...v.path[0])) {
        if (v.leaving) goLeave(v); else { v.target = null; chooseNext(v); }
      }
    } else { v.x += dx / dist * step; v.y += dy / dist * step; }
    return;
  }
  // 到达
  if (v.leaving) return finishVisitor(v);
  const b = S.buildings.find(x => x.uid === v.target);
  if (!b) { v.target = null; return chooseNext(v); }
  const st = stats(b);
  if (st.fee > v.money) { v.target = null; return chooseNext(v); }
  v.money -= st.fee;
  b.earned += st.fee;
  earn(st.fee, b.c, b.r);
  v.state = 'use';
  v.timer = st.useTime;
}

// ---------- 主循环 ----------
export function tick(dtReal: number) {
  const dt = Math.min(dtReal, 0.1) * rt.speed;
  S.time += dt;

  // 刷游客
  if (S.time < OPEN_LEN) {
    const appeal = parkAppeal();
    if (appeal > 0) {
      rt.spawnTimer -= dt;
      if (rt.spawnTimer <= 0) {
        rt.spawnTimer = 8 / (1 + appeal / 8) / cleanliness();
        const maxV = 3 + Math.floor(appeal * 0.7);
        if (rt.visitors.length < maxV) spawn();
      }
    }
  }

  for (const v of [...rt.visitors]) updateVisitor(v, dt);

  // 回收站
  for (const b of S.buildings) {
    if (b.type !== 'recycle') continue;
    b.cd -= dt;
    if (b.cd > 0) continue;
    const st = stats(b);
    b.cd = st.recycleEvery;
    const t = S.trash.find(x => Math.max(Math.abs(x.c - b.c), Math.abs(x.r - b.r)) <= st.recycleRadius);
    if (t) {
      S.trash = S.trash.filter(x => x !== t);
      S.mats.plastic++;
      float(b.c, b.r, 1, 'plastic');
    }
  }

  for (const f of rt.floaters) f.t += dtReal;
  rt.floaters = rt.floaters.filter(f => f.t < 1.2);

  if (S.time >= DAY_LEN) endDay();
}

function endDay() {
  for (const v of [...rt.visitors]) finishVisitor(v);
  const t = S.today;
  const served = t.happy + t.unhappy;
  const report: DayReport = {
    day: S.day,
    income: t.income,
    visitors: t.visitors,
    rating: Math.round(100 * cleanliness() * (served ? t.happy / served : 1)),
    unlocked: BUILDING_IDS.filter(id => def(id).unlockDay === S.day + 1),
  };
  S.day++;
  S.time = 0;
  S.prices = rollPrices();
  S.today = { income: 0, visitors: 0, happy: 0, unhappy: 0 };
  rt.spawnTimer = 2;
  save();
  rt.onDayEnd?.(report);
}
