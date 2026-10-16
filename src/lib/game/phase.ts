import { MIN_PLAYERS } from './constants';
import { findNextPresenter } from './pitch';
import type { GameStage, Phase } from './types';

/**
 * 状態遷移（docs/state-machine.md と対応）
 *
 * lobby → prep → pitch ⟲ → judge → result → prep … → finished
 *               ↘（発表できる人が0人）→ result
 * playing中のどの段階からでも、ホストの「終了」で finished へ
 */
export interface TransitionContext {
  now: number;
  /** 現在の締め切り（ms）。null は無制限 */
  phaseEndsAt?: number | null;
  /** lobby → prep：参加人数 */
  playerCount?: number;
  /** prep → pitch：子が全員「いけるで！」を押した */
  allReady?: boolean;
  /** prep → result：発表できる子が1人もいない */
  noPresenters?: boolean;
  /** pitch：現在の発表が「以上です！」で終わった */
  pitchEndedManually?: boolean;
  /** pitch → pitch：次に発表できる人がいる */
  hasNextPresenter?: boolean;
  /** judge → result：親が勝者を選んだ */
  winnerChosen?: boolean;
  /** result → finished：目標点に達した人がいる */
  gameOver?: boolean;
  /** ホストが途中で終了を選んだ */
  forceEnd?: boolean;
}

export function isDeadlinePassed(now: number, phaseEndsAt: number | null | undefined): boolean {
  return phaseEndsAt != null && now >= phaseEndsAt;
}

export function canTransition(from: GameStage, to: GameStage, ctx: TransitionContext): boolean {
  if (to === 'finished' && from !== 'lobby' && from !== 'finished' && ctx.forceEnd) return true;

  const timeUp = isDeadlinePassed(ctx.now, ctx.phaseEndsAt);
  switch (`${from}->${to}`) {
    case 'lobby->prep':
      return (ctx.playerCount ?? 0) >= MIN_PLAYERS;
    case 'prep->pitch':
      return (timeUp || !!ctx.allReady) && !ctx.noPresenters;
    case 'prep->result':
      return (timeUp || !!ctx.allReady) && !!ctx.noPresenters;
    case 'pitch->pitch':
      return (timeUp || !!ctx.pitchEndedManually) && !!ctx.hasNextPresenter;
    case 'pitch->judge':
      return (timeUp || !!ctx.pitchEndedManually) && !ctx.hasNextPresenter;
    case 'judge->result':
      return !!ctx.winnerChosen;
    case 'result->prep':
      return !ctx.gameOver;
    case 'result->finished':
      return !!ctx.gameOver;
    case 'finished->prep':
      // 再戦
      return (ctx.playerCount ?? 0) >= MIN_PLAYERS;
    default:
      return false;
  }
}

/** 秒数から締め切り時刻を作る。null（無制限）なら null */
export function deadlineFrom(now: number, seconds: number | null): number | null {
  return seconds == null ? null : now + seconds * 1000;
}

export interface PitchPlan {
  phase: Extract<Phase, 'pitch' | 'judge' | 'result'>;
  /** pitch のときの発表者の位置 */
  currentPitchIndex: number;
  phaseEndsAt: number | null;
  /** 切断中でスキップした位置 */
  skipped: number[];
}

/**
 * 準備フェーズ終了後、または発表1人分の終了後に次どうなるかを計算する。
 * fromIndex には次に発表する可能性のある位置を渡す（準備終了時は 0、発表終了時は現在+1）。
 * 発表した人が1人もいないまま候補が尽きたら result（該当なし）、誰かが発表済みなら judge。
 */
export function planPitch(params: {
  pitchOrder: readonly string[];
  fromIndex: number;
  isAvailable: (playerId: string) => boolean;
  anyonePitched: boolean;
  now: number;
  pitchSeconds: number | null;
}): PitchPlan {
  const { index, skipped } = findNextPresenter(params.pitchOrder, params.fromIndex, params.isAvailable);
  if (index !== null) {
    return {
      phase: 'pitch',
      currentPitchIndex: index,
      phaseEndsAt: deadlineFrom(params.now, params.pitchSeconds),
      skipped,
    };
  }
  return {
    phase: params.anyonePitched ? 'judge' : 'result',
    currentPitchIndex: params.pitchOrder.length,
    phaseEndsAt: null,
    skipped,
  };
}
