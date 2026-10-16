import { describe, expect, it } from 'vitest';
import { applyJudge, checkWinner, InvalidWinnerError, judgeAuthority, type JudgeState } from '../judge';
import { PROXY_JUDGE_AFTER_MS } from '../constants';

const players = [
  { id: 'a', score: 0 },
  { id: 'b', score: 2 },
  { id: 'c', score: 1 },
];

describe('applyJudge', () => {
  it('勝者に1点だけ加える', () => {
    const r = applyJudge({ players, targetScore: 3, candidates: ['a', 'c'] }, 'c');
    expect(r.players.map((p) => p.score)).toEqual([0, 2, 2]);
    expect(r.winnerId).toBe('c');
    expect(r.championId).toBeNull();
  });

  it('目標点ちょうどで優勝', () => {
    const r = applyJudge({ players, targetScore: 3, candidates: ['b', 'c'] }, 'b');
    expect(r.championId).toBe('b');
  });

  it('発表していない人（親を含む）は選べない', () => {
    expect(() => applyJudge({ players, targetScore: 3, candidates: ['a'] }, 'b')).toThrow(InvalidWinnerError);
  });

  it('元の配列を変更しない', () => {
    applyJudge({ players, targetScore: 3, candidates: ['a'] }, 'a');
    expect(players[0].score).toBe(0);
  });

  it('1ラウンド1点なので、何ラウンド繰り返しても同時に2人が目標点に達することはない', () => {
    let state: JudgeState = { players: players.map((p) => ({ ...p, score: 0 })), targetScore: 3, candidates: ['a', 'b', 'c'] };
    const picks = ['a', 'b', 'a', 'c', 'b', 'c', 'a'];
    for (const pick of picks) {
      const r = applyJudge(state, pick);
      const reached = r.players.filter((p) => p.score >= 3);
      expect(reached.length).toBeLessThanOrEqual(1);
      if (r.championId) {
        expect(r.championId).toBe('a');
        break;
      }
      state = r;
    }
  });
});

describe('checkWinner', () => {
  it('目標点以上の人を返す', () => {
    expect(checkWinner(players, 3)).toBeNull();
    expect(checkWinner(players, 2)).toBe('b');
  });
});

describe('judgeAuthority', () => {
  const base = { parentId: 'p', hostId: 'h', parentConnected: true, now: 100_000, phaseStartedAt: 0 };
  it('親は判定できる', () => {
    expect(judgeAuthority({ ...base, actorId: 'p' })).toBe('parent');
  });
  it('親以外は判定できない', () => {
    expect(judgeAuthority({ ...base, actorId: 'x' })).toBeNull();
    expect(judgeAuthority({ ...base, actorId: 'h' })).toBeNull();
  });
  it('親が切断して60秒たったらホストが代理判定できる', () => {
    const startedAt = base.now - PROXY_JUDGE_AFTER_MS;
    expect(judgeAuthority({ ...base, actorId: 'h', parentConnected: false, phaseStartedAt: startedAt })).toBe('host-proxy');
    expect(judgeAuthority({ ...base, actorId: 'h', parentConnected: false, phaseStartedAt: startedAt + 1 })).toBeNull();
  });
});
