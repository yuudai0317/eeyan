import { PROXY_JUDGE_AFTER_MS } from './constants';

export interface ScorePlayer {
  id: string;
  score: number;
}

export interface JudgeState<P extends ScorePlayer = ScorePlayer> {
  players: P[];
  targetScore: number;
  /** 判定の対象（このラウンドで発表した人） */
  candidates: readonly string[];
}

export class InvalidWinnerError extends Error {
  constructor() {
    super('このラウンドで発表した人の中から選んでください');
    this.name = 'InvalidWinnerError';
  }
}

/** 目標点に達した人を返す。1ラウンドで加点されるのは1人だけなので、同時に2人が達することはない */
export function checkWinner(players: readonly ScorePlayer[], targetScore: number): string | null {
  return players.find((p) => p.score >= targetScore)?.id ?? null;
}

/** 勝者に1点を加え、優勝者が決まったかを返す */
export function applyJudge<P extends ScorePlayer>(
  state: JudgeState<P>,
  winnerId: string,
): JudgeState<P> & { winnerId: string; championId: string | null } {
  if (!state.candidates.includes(winnerId)) throw new InvalidWinnerError();
  const players = state.players.map((p) => (p.id === winnerId ? { ...p, score: p.score + 1 } : p));
  return { ...state, players, winnerId, championId: checkWinner(players, state.targetScore) };
}

/**
 * 判定してよい人か。親は常に可。親が切断したまま判定フェーズが60秒以上続いたらホストも可。
 */
export function judgeAuthority(params: {
  actorId: string;
  parentId: string;
  hostId: string;
  parentConnected: boolean;
  now: number;
  phaseStartedAt: number;
}): 'parent' | 'host-proxy' | null {
  if (params.actorId === params.parentId) return 'parent';
  if (
    params.actorId === params.hostId &&
    !params.parentConnected &&
    params.now - params.phaseStartedAt >= PROXY_JUDGE_AFTER_MS
  ) {
    return 'host-proxy';
  }
  return null;
}
