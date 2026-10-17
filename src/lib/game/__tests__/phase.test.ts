import { describe, expect, it } from 'vitest';
import { canTransition, deadlineFrom, planPitch } from '../phase';

const now = 1_000_000;

describe('canTransition', () => {
  it('lobby → prep は2人以上', () => {
    expect(canTransition('lobby', 'prep', { now, playerCount: 1 })).toBe(false);
    expect(canTransition('lobby', 'prep', { now, playerCount: 2 })).toBe(true);
  });

  it('prep → pitch は時間切れか全員準備完了', () => {
    expect(canTransition('prep', 'pitch', { now, phaseEndsAt: now + 1 })).toBe(false);
    expect(canTransition('prep', 'pitch', { now, phaseEndsAt: now })).toBe(true);
    expect(canTransition('prep', 'pitch', { now, phaseEndsAt: now + 1, allReady: true })).toBe(true);
    // 無制限なら時間では進まない
    expect(canTransition('prep', 'pitch', { now: Number.MAX_SAFE_INTEGER, phaseEndsAt: null })).toBe(false);
  });

  it('発表できる人がいなければ prep → result', () => {
    expect(canTransition('prep', 'pitch', { now, allReady: true, noPresenters: true })).toBe(false);
    expect(canTransition('prep', 'result', { now, allReady: true, noPresenters: true })).toBe(true);
  });

  it('pitch は次の人がいれば pitch、いなければ judge', () => {
    expect(canTransition('pitch', 'pitch', { now, pitchEndedManually: true, hasNextPresenter: true })).toBe(true);
    expect(canTransition('pitch', 'judge', { now, pitchEndedManually: true, hasNextPresenter: true })).toBe(false);
    expect(canTransition('pitch', 'judge', { now, phaseEndsAt: now - 1, hasNextPresenter: false })).toBe(true);
    expect(canTransition('pitch', 'judge', { now, phaseEndsAt: now + 1000 })).toBe(false);
  });

  it('judge → result は勝者が選ばれたときだけ', () => {
    expect(canTransition('judge', 'result', { now })).toBe(false);
    expect(canTransition('judge', 'result', { now, winnerChosen: true })).toBe(true);
  });

  it('result からは目標点で prep か finished に分かれる', () => {
    expect(canTransition('result', 'prep', { now, gameOver: false })).toBe(true);
    expect(canTransition('result', 'finished', { now, gameOver: false })).toBe(false);
    expect(canTransition('result', 'finished', { now, gameOver: true })).toBe(true);
    expect(canTransition('result', 'prep', { now, gameOver: true })).toBe(false);
  });

  it('飛び越しや逆戻りはできない', () => {
    expect(canTransition('prep', 'judge', { now, allReady: true })).toBe(false);
    expect(canTransition('judge', 'prep', { now })).toBe(false);
    expect(canTransition('lobby', 'pitch', { now, playerCount: 5 })).toBe(false);
    expect(canTransition('finished', 'judge', { now })).toBe(false);
  });

  it('ホストの終了はゲーム中ならいつでも finished', () => {
    for (const from of ['prep', 'pitch', 'judge', 'result'] as const) {
      expect(canTransition(from, 'finished', { now, forceEnd: true })).toBe(true);
    }
    expect(canTransition('lobby', 'finished', { now, forceEnd: true })).toBe(false);
  });

  it('再戦は finished → prep', () => {
    expect(canTransition('finished', 'prep', { now, playerCount: 3 })).toBe(true);
  });
});

describe('deadlineFrom', () => {
  it('秒数を足す。無制限は null', () => {
    expect(deadlineFrom(now, 60)).toBe(now + 60_000);
    expect(deadlineFrom(now, null)).toBeNull();
  });
});

describe('planPitch', () => {
  const order = ['a', 'b', 'c'];
  it('次の接続中の人を発表者にし、締め切りを付ける', () => {
    expect(
      planPitch({ pitchOrder: order, fromIndex: 0, isAvailable: (id) => id !== 'a', anyonePitched: false, now, pitchSeconds: 60 }),
    ).toEqual({ phase: 'pitch', currentPitchIndex: 1, phaseEndsAt: now + 60_000, skipped: [0] });
  });

  it('最後の人が終わったら judge', () => {
    expect(
      planPitch({ pitchOrder: order, fromIndex: 3, isAvailable: () => true, anyonePitched: true, now, pitchSeconds: 60 }),
    ).toMatchObject({ phase: 'judge', phaseEndsAt: null });
  });

  it('誰も発表できなければ result（該当なし）', () => {
    expect(
      planPitch({ pitchOrder: order, fromIndex: 0, isAvailable: () => false, anyonePitched: false, now, pitchSeconds: null }),
    ).toMatchObject({ phase: 'result', skipped: [0, 1, 2] });
  });
});
