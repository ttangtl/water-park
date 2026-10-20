// 开始画面 + 新手引导
import { S, save } from './game';
import { thumbURL, iconURL } from './art';

// ---------- 开始画面 ----------
export function showStart(hasSave: boolean, onStart: (fresh: boolean) => void) {
  const el = document.createElement('div');
  el.id = 'start';
  const img = (t: Parameters<typeof thumbURL>[0], cls: string) => `<img class="${cls}" src="${thumbURL(t, 220)}" alt="">`;
  el.innerHTML = `
    <div class="sky"><i class="cloud c1"></i><i class="cloud c2"></i><i class="sun"></i></div>
    <div class="title">
      <h1><span>水</span><span>上</span><span>乐</span><span>园</span></h1>
      <p>用塑料、金属和木头，造一座海边乐园</p>
    </div>
    <div class="island">
      ${img('tower', 's-tower')}${img('wave', 's-wave')}${img('slide', 's-slide')}${img('umbrella', 's-umb')}${img('snack', 's-snack')}
      <div class="mats">
        <img src="${iconURL('plastic', 64)}" alt=""><img src="${iconURL('metal', 64)}" alt=""><img src="${iconURL('wood', 64)}" alt=""><img src="${iconURL('coin', 64)}" alt="">
      </div>
    </div>
    <div class="go">
      <button class="btn go big" data-a="go">${hasSave ? `继续营业 · 第${S.day}天` : '开始营业'}</button>
      ${hasSave ? `<button class="link" data-a="new">重新开一家</button>` : ''}
    </div>`;
  document.querySelector('#app')!.appendChild(el);
  el.addEventListener('click', e => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'new' && !confirm('确定要清空存档重新开始吗？')) return;
    el.classList.add('leave');
    setTimeout(() => el.remove(), 450);
    onStart(a === 'new');
  });
}

// ---------- 新手引导 ----------
type Ev = 'open-build' | 'close-build' | 'pick' | 'placed' | 'cancel';
interface Step { text: string; button?: string; target?: string; top?: boolean; on?: Ev }

const STEPS: Step[] = [
  { text: '欢迎来到你的水上乐园！游客会从<b>入口</b>进来，玩一次泳池就付一次钱。', button: '知道了', top: true },
  { text: '钱够了就扩建吧！点下面的<b>「建造」</b>。', target: '[data-tab="build"]', on: 'open-build' },
  { text: '选一个设施。<b>冰淇淋摊</b>和<b>遮阳伞</b>都很便宜。', top: true, on: 'pick' },
  { text: '点场地上<b>发绿光的格子</b>，把它放下。', top: true, on: 'placed' },
  { text: '建好了！地上的<b>垃圾</b>点一下能换塑料；材料不够就去<b>「材料」</b>买。', button: '开始经营', top: true },
];

let coach: HTMLElement | null = null;

export function tutorialActive() { return S.tutorial >= 0 && S.tutorial < STEPS.length; }

export function startTutorial() {
  if (!tutorialActive()) return;
  if (!coach) {
    coach = document.createElement('div');
    coach.id = 'coach';
    document.querySelector('#app')!.appendChild(coach);
    coach.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('[data-a="next"]')) go(S.tutorial + 1);
      if ((e.target as HTMLElement).closest('[data-a="skip"]')) go(-1);
    });
  }
  render();
}

function go(step: number) {
  S.tutorial = step >= STEPS.length ? -1 : step;
  save();
  render();
}

function render() {
  document.querySelectorAll('.tut-target').forEach(n => n.classList.remove('tut-target'));
  if (!coach) return;
  if (!tutorialActive()) { coach.classList.remove('show'); return; }
  const s = STEPS[S.tutorial];
  coach.className = `show ${s.top ? 'top' : ''}`;
  coach.innerHTML = `
    <img class="mascot" src="${thumbURL('umbrella', 96)}" alt="">
    <div class="say"><p>${s.text}</p>
      <div class="row2"><span class="dots">${STEPS.map((_, i) => `<i class="${i === S.tutorial ? 'on' : ''}"></i>`).join('')}</span>
      <button class="link" data-a="skip">跳过</button>
      ${s.button ? `<button class="btn go" data-a="next">${s.button}</button>` : ''}</div>
    </div>`;
  if (s.target) document.querySelector(s.target)?.classList.add('tut-target');
}

/** 游戏里发生的事告诉引导，满足条件就进入下一步 */
export function tutorialEvent(ev: Ev) {
  if (!tutorialActive()) return;
  const s = STEPS[S.tutorial];
  if (s.on === ev) return go(S.tutorial + 1);
  // 走回头路：关掉建造面板或取消放置，就回到「点建造」那一步
  if ((ev === 'close-build' && S.tutorial === 2) || (ev === 'cancel' && S.tutorial === 3)) go(1);
}
