// 所有数值集中在这里，调平衡只改这个文件。

export const COLS = 7;
export const ROWS = 10;
export const GATE = { c: 3, r: 9 };

export const DAY_LEN = 120; // 一天多少秒
export const OPEN_LEN = 100; // 前多少秒营业，之后游客陆续离园
export const TICKET = 5; // 门票
export const SAVE_KEY = 'waterpark-save-v1';

export type Mat = 'plastic' | 'metal' | 'wood';
export const MAT_IDS: Mat[] = ['plastic', 'metal', 'wood'];

export const MATS: Record<Mat, { name: string; icon: string; price: number }> = {
  plastic: { name: '塑料', icon: '🧴', price: 4 },
  metal: { name: '金属', icon: '🔩', price: 10 },
  wood: { name: '木材', icon: '🪵', price: 3 },
};

export type Cost = Partial<Record<Mat | 'coins', number>>;

// ride 游乐 / food 餐饮 / rest 休息 / util 功能（游客不去）
export type Kind = 'ride' | 'food' | 'rest' | 'util';

export interface BuildingDef {
  name: string;
  icon: string;
  desc: string;
  kind: Kind;
  cost: Cost;
  fee: number;
  capacity: number;
  useTime: number;
  appeal: number; // 吸引力：决定来多少人、多快
  trash: number; // 每次使用后掉垃圾的概率
  unlockDay: number;
  color: string;
}

export const BUILDINGS = {
  pool: {
    name: '小泳池', icon: '🏊', desc: '最基础的设施，便宜好用',
    kind: 'ride', cost: { coins: 40, plastic: 8 },
    fee: 4, capacity: 4, useTime: 6, appeal: 3, trash: 0.1, unlockDay: 1, color: '#7cc7f2',
  },
  slide: {
    name: '水滑梯', icon: '🛝', desc: '塑料滑道 + 金属支架',
    kind: 'ride', cost: { coins: 100, plastic: 12, metal: 6 },
    fee: 10, capacity: 2, useTime: 4, appeal: 6, trash: 0.1, unlockDay: 1, color: '#f6b26b',
  },
  snack: {
    name: '冰淇淋摊', icon: '🍦', desc: '赚钱快，但垃圾多',
    kind: 'food', cost: { coins: 50, wood: 8, plastic: 2 },
    fee: 6, capacity: 2, useTime: 3, appeal: 2, trash: 0.6, unlockDay: 1, color: '#f4a7c3',
  },
  umbrella: {
    name: '遮阳伞', icon: '⛱️', desc: '免费休息点，提升吸引力',
    kind: 'rest', cost: { coins: 15, wood: 3, plastic: 2 },
    fee: 0, capacity: 3, useTime: 5, appeal: 2, trash: 0.05, unlockDay: 1, color: '#fff2a8',
  },
  recycle: {
    name: '回收站', icon: '♻️', desc: '自动捡附近垃圾，变成塑料',
    kind: 'util', cost: { coins: 120, metal: 10 },
    fee: 0, capacity: 0, useTime: 0, appeal: 0, trash: 0, unlockDay: 1, color: '#9fd8a4',
  },
  wave: {
    name: '造浪池', icon: '🌊', desc: '大容量明星设施',
    kind: 'ride', cost: { coins: 300, plastic: 25, metal: 20 },
    fee: 20, capacity: 6, useTime: 8, appeal: 12, trash: 0.15, unlockDay: 3, color: '#4aa3df',
  },
  tower: {
    name: '高空滑道', icon: '🎢', desc: '全金属结构，门票最贵',
    kind: 'ride', cost: { coins: 500, metal: 40, plastic: 20 },
    fee: 35, capacity: 3, useTime: 6, appeal: 20, trash: 0.1, unlockDay: 5, color: '#c27ba0',
  },
} satisfies Record<string, BuildingDef>;

export type BuildingType = keyof typeof BUILDINGS;
export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingType[];
export const def = (t: BuildingType): BuildingDef => BUILDINGS[t];

export const MAX_LEVEL = 5;

export const START = {
  coins: 150,
  mats: { plastic: 10, metal: 5, wood: 10 } as Record<Mat, number>,
};
