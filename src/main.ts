import './style.css';
import {
  MATS, MAT_IDS, BUILDING_IDS, DAY_LEN, OPEN_LEN, TICKET, def,
  type Cost, type Mat, type BuildingType,
} from './data';
import {
  S, rt, load, save, resetGame, tick, canAfford, buy, place, buildingAt, collectTrashAt,
  isUnlocked, stats, upgradeCost, upgrade, demolish, occupancy, parkAppeal, cleanliness,
  type DayReport,
} from './game';
import { initRender, draw, view, tileFromEvent, resize } from './render';
import { iconURL, thumbURL } from './art';
import { showStart, startTutorial, tutorialEvent } from './intro';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const resEl = $('#res'), dayEl = $('#day'), dayBar = $('#daybar'), hintEl = $('#hint');
const sheet = $('#sheet'), modal = $('#modal'), speedBtn = $('#speed');
const canvas = $<HTMLCanvasElement>('#cv');

type Tab = 'build' | 'market' | 'park' | 'building' | null;
let tab: Tab = null;
let paused = true; // 开始画面点了才开始跑
let hintTimer = 0;

// ---------- 工具 ----------
const ico = (k: 'coin' | Mat, cls = 'ico') => `<img class="${cls}" src="${iconURL(k)}" alt="">`;
const thumb = (t: BuildingType, cls = 'thumb') => `<img class="${cls}" src="${thumbURL(t)}" alt="">`;

function costHTML(cost: Cost) {
  return Object.entries(cost).map(([k, v]) => {
    const have = k === 'coins' ? S.coins : S.mats[k as Mat];
    const key = (k === 'coins' ? 'coin' : k) as 'coin' | Mat;
    return `<span class="${have < (v ?? 0) ? 'lack' : ''}">${ico(key)}${v}</span>`;
  }).join('');
}
function hint(text: string, sticky = false) {
  hintEl.textContent = text;
  hintEl.className = (text ? 'show ' : '') + (sticky ? 'sticky' : '');
  hintTimer = sticky ? Infinity : 2.5;
}
function lackText(cost: Cost) {
  const lack = Object.entries(cost)
    .filter(([k, v]) => (k === 'coins' ? S.coins : S.mats[k as Mat]) < (v ?? 0))
    .map(([k]) => (k === 'coins' ? '金币' : MATS[k as Mat].name));
  return `${lack.join('、')}不够` + (lack.some(x => x !== '金币') ? '，去「材料」买一些' : '');
}

// ---------- 顶栏 ----------
let lastRes = '';
const shown: Record<string, number> = {};
function renderTop() {
  const vals: [string, number][] = [['coin', S.coins], ...MAT_IDS.map(m => [m, S.mats[m]] as [string, number])];
  const html = vals.map(([k]) => `<span data-k="${k}">${ico(k as 'coin' | Mat)}<b></b></span>`).join('');
  if (html !== lastRes) { resEl.innerHTML = html; lastRes = html; }
  for (const [k, v] of vals) {
    const el = resEl.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    if (shown[k] !== v) {
      if (shown[k] !== undefined) {
        el.classList.remove('up', 'down');
        void el.offsetWidth;
        el.classList.add(v > shown[k] ? 'up' : 'down');
      }
      shown[k] = v;
      el.querySelector('b')!.textContent = String(v);
    }
  }
  const closing = S.time >= OPEN_LEN;
  dayEl.innerHTML = `<b>第${S.day}天</b><small>${closing ? '打烊中' : '营业中'}</small>`;
  dayBar.style.width = `${(S.time / DAY_LEN) * 100}%`;
  dayBar.classList.toggle('closing', closing);
}

// ---------- 底部面板 ----------
let lastSheet = '';
function renderSheet(force = false) {
  if (!tab) { sheet.classList.remove('open'); lastSheet = ''; return; }
  let html = '';
  if (tab === 'build') html = buildHTML();
  else if (tab === 'market') html = marketHTML();
  else if (tab === 'park') html = parkHTML();
  else if (tab === 'building') {
    const b = S.buildings.find(x => x.uid === view.selected);
    if (!b) return openTab(null);
    html = buildingHTML(b);
  }
  if (force || html !== lastSheet) { sheet.innerHTML = html; lastSheet = html; }
  sheet.classList.add('open');
}

const head = (title: string) => `<header class="sh"><h3>${title}</h3><button class="x" data-act="close" aria-label="关闭">✕</button></header>`;

function buildHTML() {
  const cards = BUILDING_IDS.map(id => {
    const d = def(id);
    if (!isUnlocked(id)) {
      return `<button class="card locked" data-act="pick" data-id="${id}">
        <div class="pic">${thumb(id)}<span class="lock">第${d.unlockDay}天</span></div>
        <div class="nm">${d.name}</div><div class="d">${d.desc}</div></button>`;
    }
    const info = d.kind === 'util' ? '自动回收垃圾' : d.kind === 'rest' ? `免费休息 · ${d.capacity}人`
      : `${ico('coin', 'ico sm')}${d.fee}/次 · ${d.capacity}人`;
    return `<button class="card ${canAfford(d.cost) ? '' : 'no'}" data-act="pick" data-id="${id}">
      <div class="pic k-${d.kind}">${thumb(id)}</div>
      <div class="nm">${d.name}</div>
      <div class="d">${info}</div>
      <div class="cost">${costHTML(d.cost)}</div></button>`;
  }).join('');
  return `${head('建造设施')}<div class="grid">${cards}</div>`;
}

function marketHTML() {
  const rows = MAT_IDS.map(m => {
    const p = S.prices[m], base = MATS[m].price;
    const trend = p < base ? `<em class="tag good">今日特价</em>` : p > base ? `<em class="tag bad">涨价了</em>` : '';
    return `<div class="row"><div class="bubble">${ico(m, 'ico lg')}</div>
      <div class="main"><b>${MATS[m].name}</b> ${trend}<small>库存 ${S.mats[m]} · 单价 ${ico('coin', 'ico sm')}${p}</small></div>
      <button class="btn ghost" data-act="buy" data-id="${m}" data-n="10" ${S.coins < p * 10 ? 'disabled' : ''}>×10</button>
      <button class="btn" data-act="buy" data-id="${m}" data-n="50" ${S.coins < p * 50 ? 'disabled' : ''}>×50</button></div>`;
  }).join('');
  return `${head('材料市场')}${rows}
    <p class="tip">价格每天变动。点地上的垃圾可以分拣出塑料 ${ico('plastic', 'ico sm')}</p>`;
}

function parkHTML() {
  const t = S.today;
  const top = [...S.buildings].sort((a, b) => b.earned - a.earned).slice(0, 5)
    .filter(b => b.earned > 0)
    .map((b, i) => `<div class="row"><span class="rank">${i + 1}</span>${thumb(b.type, 'thumb sm')}
      <div class="main"><b>${def(b.type).name}</b> <em class="tag">Lv${b.level}</em><small>累计收入 ${ico('coin', 'ico sm')}${b.earned}</small></div></div>`).join('');
  return `${head('我的乐园')}
    <div class="stats">
      <div><b>${t.income}</b><small>今日收入</small></div>
      <div><b>${t.visitors}</b><small>今日游客</small></div>
      <div><b>${rt.visitors.length}</b><small>园内人数</small></div>
      <div><b>${Math.round(parkAppeal())}</b><small>吸引力</small></div>
      <div><b>${Math.round(cleanliness() * 100)}%</b><small>清洁度</small></div>
      <div><b>${S.totalVisitors}</b><small>总游客</small></div>
    </div>
    <p class="tip">门票 ${ico('coin', 'ico sm')}${TICKET}/人。吸引力越高来的人越多；地上垃圾多了游客会变少。</p>
    ${top ? `<div class="sub">赚钱排行</div>${top}` : ''}
    <div class="actions"><button class="btn danger" data-act="reset">重新开始</button></div>`;
}

function buildingHTML(b: (typeof S.buildings)[number]) {
  const d = def(b.type), st = stats(b), up = upgradeCost(b);
  let body = '';
  if (d.kind === 'util') {
    body = `<div class="stats">
      <div><b>Lv${b.level}</b><small>等级</small></div>
      <div><b>${st.recycleEvery.toFixed(1)}s</b><small>捡一次</small></div>
      <div><b>${st.recycleRadius}格</b><small>范围</small></div></div>`;
  } else {
    body = `<div class="stats">
      <div><b>Lv${b.level}</b><small>等级</small></div>
      <div><b>${st.fee ? st.fee : '免费'}</b><small>每次收费</small></div>
      <div><b>${occupancy(b)}/${st.capacity}</b><small>使用中</small></div>
      <div><b>${Math.round(st.appeal)}</b><small>吸引力</small></div>
      <div><b>${b.earned}</b><small>累计收入</small></div>
      <div><b>${Math.round(d.trash * 100)}%</b><small>掉垃圾</small></div></div>`;
  }
  const upPart = up
    ? `<div class="uprow"><span>升级到 <b>Lv${b.level + 1}</b><small>收费、容量、吸引力提升</small></span><div class="cost">${costHTML(up)}</div></div>`
    : `<div class="uprow"><span><b>已满级</b> ★</span></div>`;
  return `<header class="sh">${thumb(b.type, 'thumb sm')}<h3>${d.name}</h3><button class="x" data-act="close" aria-label="关闭">✕</button></header>
    ${body}${upPart}
    <div class="actions">
      <button class="btn danger" data-act="demolish">拆除</button>
      ${up ? `<button class="btn go" data-act="upgrade" ${canAfford(up) ? '' : 'disabled'}>升级</button>` : ''}
    </div>`;
}

function openTab(t: Tab) {
  const prev = tab;
  tab = t;
  if (t === 'build' && prev !== 'build') tutorialEvent('open-build');
  if (prev === 'build' && t !== 'build' && !view.placing) tutorialEvent('close-build');
  if (t !== 'building') view.selected = null;
  document.querySelectorAll<HTMLButtonElement>('#bottom button')
    .forEach(btn => btn.classList.toggle('on', btn.dataset.tab === t));
  renderSheet(true);
}

function cancelPlacing() {
  view.placing = null;
  hint('');
  tutorialEvent('cancel');
}

// ---------- 事件 ----------
document.querySelectorAll<HTMLButtonElement>('#bottom button').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.tab as Tab;
    if (view.placing) cancelPlacing();
    openTab(tab === t ? null : t);
  });
});

sheet.addEventListener('click', e => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  if (act === 'close') return openTab(null);
  if (act === 'pick') {
    const t = id as BuildingType, d = def(t);
    if (!isUnlocked(t)) return hint(`${d.name}第 ${d.unlockDay} 天解锁`);
    if (!canAfford(d.cost)) return hint(lackText(d.cost));
    view.placing = t;
    openTab(null);
    hint(`点绿色格子放置「${d.name}」`, true);
    tutorialEvent('pick');
  }
  if (act === 'buy') {
    if (buy(id as Mat, Number(el.dataset.n))) renderSheet(true);
  }
  if (act === 'upgrade' || act === 'demolish') {
    const b = S.buildings.find(x => x.uid === view.selected);
    if (!b) return;
    if (act === 'upgrade') { if (upgrade(b)) hint(`${def(b.type).name}升到 Lv${b.level}！`); }
    else { demolish(b); openTab(null); hint('已拆除，返还了一半材料'); }
    renderSheet(true);
  }
  if (act === 'reset') {
    if (confirm('确定要清空存档重新开始吗？')) { resetGame(); openTab(null); startTutorial(); }
  }
});

canvas.addEventListener('pointerdown', e => {
  const [c, r] = tileFromEvent(e);
  if (view.placing) {
    const t = view.placing;
    if (place(t, c, r)) {
      hint(`${def(t).name}建好了！`);
      view.placing = null;
      save();
      tutorialEvent('placed');
    } else cancelPlacing();
    return;
  }
  const b = buildingAt(c, r);
  if (b) { view.selected = b.uid; openTab('building'); return; }
  if (collectTrashAt(c, r) > 0) return;
  if (tab) openTab(null);
});

speedBtn.addEventListener('click', () => {
  rt.speed = rt.speed === 1 ? 2 : rt.speed === 2 ? 4 : 1;
  speedBtn.textContent = `×${rt.speed}`;
  speedBtn.classList.toggle('fast', rt.speed > 1);
});

rt.onDayEnd = (r: DayReport) => {
  paused = true;
  const unlock = r.unlocked.length
    ? `<div class="unlock"><small>新设施解锁</small>${r.unlocked.map(id => `<span>${thumb(id, 'thumb sm')}${def(id).name}</span>`).join('')}</div>` : '';
  const stars = r.rating >= 85 ? 3 : r.rating >= 60 ? 2 : 1;
  modal.innerHTML = `<div class="box">
    <div class="ribbon">第 ${r.day} 天 打烊</div>
    <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('')}</div>
    <div class="stats">
      <div><b>${r.income}</b><small>收入</small></div>
      <div><b>${r.visitors}</b><small>游客</small></div>
      <div><b>${r.rating}%</b><small>满意度</small></div></div>
    ${unlock}<p class="tip">材料市场价格已更新</p>
    <button class="btn go big" id="next">开始第 ${r.day + 1} 天</button></div>`;
  modal.hidden = false;
  $('#next').onclick = () => { modal.hidden = true; paused = false; };
};

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------- 主循环 ----------
const hasSave = load();
initRender(canvas);
showStart(hasSave, fresh => {
  if (fresh) resetGame();
  paused = false;
  last = performance.now();
  setTimeout(startTutorial, 500);
});
requestAnimationFrame(resize);
let last = performance.now(), uiAcc = 0, saveAcc = 0;
function frame(now: number) {
  const dt = (now - last) / 1000;
  last = now;
  if (!paused) tick(dt);
  draw(now);
  uiAcc += dt; saveAcc += dt;
  if (hintTimer !== Infinity) { hintTimer -= dt; if (hintTimer <= 0 && hintEl.textContent) hint(''); }
  if (uiAcc > 0.2) { uiAcc = 0; renderTop(); renderSheet(); }
  if (saveAcc > 5) { saveAcc = 0; save(); }
  requestAnimationFrame(frame);
}
renderTop();
requestAnimationFrame(frame);

if (import.meta.env.PROD && location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

document.querySelectorAll<HTMLImageElement>('#bottom img').forEach(img => {
  img.src = img.dataset.thumb ? thumbURL(img.dataset.thumb as BuildingType) : iconURL(img.dataset.icon as Mat, 64);
});

// 开发调试：后台页面不跑 rAF 时可手动步进
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__wp = { tick, draw, S: () => S, rt };
}
