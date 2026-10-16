import { describe, expect, it } from 'vitest';
import { decideFirstParent, nextParent } from '../parent';
import { buildPitchOrder, findNextPresenter } from '../pitch';
import { seededRng } from '../rng';

const mk = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, seatOrder: i * 10, connected: true, left: false }));

describe('decideFirstParent', () => {
  it('参加者の中からランダムに選ぶ（シードで再現できる）', () => {
    const ps = mk(5);
    const a = decideFirstParent(ps, seededRng(1));
    expect(ps.map((p) => p.id)).toContain(a);
    expect(decideFirstParent(ps, seededRng(1))).toBe(a);
    const picked = new Set(Array.from({ length: 200 }, (_, s) => decideFirstParent(ps, seededRng(s))));
    expect(picked.size).toBe(5);
  });

  it('接続中の人を優先し、抜けた人は選ばない', () => {
    const ps = mk(4).map((p) => ({ ...p, connected: p.id === 'p2', left: p.id === 'p3' }));
    for (let s = 0; s < 20; s++) expect(decideFirstParent(ps, seededRng(s))).toBe('p2');
  });
});

describe('nextParent', () => {
  it('seat_order 順に巡回し、最後の人の次は最初に戻る', () => {
    const ps = mk(4);
    expect(nextParent(ps, 'p0')).toBe('p1');
    expect(nextParent(ps, 'p2')).toBe('p3');
    expect(nextParent(ps, 'p3')).toBe('p0');
  });

  it('並びが seat_order 順でなくても正しく巡回する', () => {
    const ps = [...mk(4)].reverse();
    expect(nextParent(ps, 'p1')).toBe('p2');
  });

  it('抜けた人・切断中の人は飛ばす', () => {
    const ps = mk(5).map((p) => ({ ...p, left: p.id === 'p1', connected: p.id !== 'p2' }));
    expect(nextParent(ps, 'p0')).toBe('p3');
  });

  it('現在の親が抜けていても、その席の次から巡回する', () => {
    const ps = mk(4).map((p) => ({ ...p, left: p.id === 'p1' }));
    expect(nextParent(ps, 'p1')).toBe('p2');
  });

  it('自分以外が全員切断中なら、抜けていない次の人', () => {
    const ps = mk(3).map((p) => ({ ...p, connected: p.id === 'p0' }));
    expect(nextParent(ps, 'p0')).toBe('p1');
  });
});

describe('buildPitchOrder', () => {
  it('親の次の席から時計回りで、親を含まない', () => {
    expect(buildPitchOrder(mk(5), 'p2')).toEqual(['p3', 'p4', 'p0', 'p1']);
    expect(buildPitchOrder(mk(3), 'p0')).toEqual(['p1', 'p2']);
    expect(buildPitchOrder(mk(3), 'p2')).toEqual(['p0', 'p1']);
  });

  it('抜けた人を除き、切断中の人は含める', () => {
    const ps = mk(5).map((p) => ({ ...p, left: p.id === 'p4', connected: p.id !== 'p0' }));
    expect(buildPitchOrder(ps, 'p2')).toEqual(['p3', 'p0', 'p1']);
  });
});

describe('findNextPresenter', () => {
  it('切断中の人をスキップして位置を返す', () => {
    const order = ['a', 'b', 'c'];
    expect(findNextPresenter(order, 0, (id) => id !== 'a')).toEqual({ index: 1, skipped: [0] });
    expect(findNextPresenter(order, 1, () => true)).toEqual({ index: 1, skipped: [] });
    expect(findNextPresenter(order, 1, (id) => id === 'a')).toEqual({ index: null, skipped: [1, 2] });
    expect(findNextPresenter(order, 3, () => true)).toEqual({ index: null, skipped: [] });
  });
});
