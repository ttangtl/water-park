// 每日任务：每天 3 个，难度随天数涨；完成一个得 1 颗星，每 5 颗星乐园升一级（门票 +1）
import { def, MAT_IDS, type BuildingType, type Cost, type Mat } from './data';

export type TaskKind = 'visitors' | 'income' | 'build' | 'trash' | 'upgrade' | 'happy' | 'buy';

export interface Task {
  kind: TaskKind;
  n: number;
  type?: BuildingType;
  reward: Cost;
  claimed: boolean;
}

export interface Today {
  income: number; visitors: number; happy: number; unhappy: number;
  builds: Partial<Record<BuildingType, number>>;
  trash: number; upgrades: number; bought: number;
  thoughts: Partial<Record<string, number>>;
}

export const newToday = (): Today => ({
  income: 0, visitors: 0, happy: 0, unhappy: 0, builds: {}, trash: 0, upgrades: 0, bought: 0, thoughts: {},
});

export const STARS_PER_LEVEL = 5;

export function taskText(t: Task): string {
  switch (t.kind) {
    case 'visitors': return `接待 ${t.n} 位游客`;
    case 'income': return `今天赚到 ${t.n} 金币`;
    case 'build': return `建造 ${t.n} 个${def(t.type!).name}`;
    case 'trash': return `亲手捡 ${t.n} 个垃圾`;
    case 'upgrade': return `升级设施 ${t.n} 次`;
    case 'happy': return `让 ${t.n} 位游客开心离园`;
    case 'buy': return `从市场买 ${t.n} 个材料`;
  }
}

export function taskProgress(t: Task, d: Today): number {
  switch (t.kind) {
    case 'visitors': return d.visitors;
    case 'income': return d.income;
    case 'build': return d.builds[t.type!] ?? 0;
    case 'trash': return d.trash;
    case 'upgrade': return d.upgrades;
    case 'happy': return d.happy;
    case 'buy': return d.bought;
  }
}

const rand = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export interface Prev { income: number; visitors: number; happy: number }

/** prev = 昨天的成绩；数值任务取「按天数的基础值」和「比昨天多一点」中的大者 */
export function genTasks(day: number, unlocked: BuildingType[], canUpgrade: boolean, prev?: Prev): Task[] {
  const grow = (base: number, y = 0, k = 1.1, round = 1) => Math.round(Math.max(base, y * k) / round) * round;
  const pool: TaskKind[] = ['visitors', 'income', 'build', 'trash', 'happy', 'buy'];
  if (canUpgrade && day >= 2) pool.push('upgrade');
  const picks: TaskKind[] = [];
  while (picks.length < 3) {
    const k = rand(pool);
    if (!picks.includes(k)) picks.push(k);
  }
  return picks.map(kind => {
    const t: Task = { kind, n: 1, reward: {}, claimed: false };
    switch (kind) {
      case 'visitors': t.n = grow(10 + day * 4, prev?.visitors); break;
      case 'income': t.n = grow(120 + day * 90, prev?.income, 1.1, 10); break;
      case 'build': {
        const builds = unlocked.filter(b => b !== 'recycle');
        // 新解锁的大设施优先出现
        t.type = day >= 3 && Math.random() < 0.5 ? unlocked[unlocked.length - 1] : rand(builds);
        break;
      }
      case 'trash': t.n = 3 + Math.min(day, 7); break;
      case 'upgrade': t.n = 1 + Math.floor(day / 4); break;
      case 'happy': t.n = grow(6 + day * 3, prev?.happy, 1.05); break;
      case 'buy': t.n = 20 + day * 5; break;
    }
    const m: Mat = rand(MAT_IDS);
    // 奖励跟着昨天收入走，后期也有吸引力
    t.reward = { coins: grow(40 + day * 25, prev?.income, 0.15, 5), [m]: 4 + day * 2 };
    return t;
  });
}
