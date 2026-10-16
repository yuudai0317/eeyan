import type { Phase, RoomStatus } from '@/lib/game/types';
import type { Settings } from '@/lib/game/settings';

/** サーバーとクライアントで共有する、APIの入出力の型 */

export interface PublicPlayer {
  id: string;
  nickname: string;
  seatOrder: number;
  score: number;
  connected: boolean;
  left: boolean;
}

export interface PublicRoom {
  id: string;
  code: string;
  status: RoomStatus;
  hostPlayerId: string | null;
  settings: Settings;
  gameNo: number;
  lowPlayerDecision: 'continue' | null;
  expiresAt: number;
}

export interface PublicRound {
  id: string;
  roundNo: number;
  parentId: string;
  topicId: string;
  phase: Phase;
  phaseStartedAt: number;
  /** ms。null は無制限 */
  phaseEndsAt: number | null;
  pitchOrder: string[];
  currentPitchIndex: number;
  readyPlayerIds: string[];
  winnerId: string | null;
  version: number;
}

export interface PublicPitch {
  playerId: string;
  cardIds: string[];
  orderIndex: number;
  skipped: boolean;
  startedAt: number;
  endedAt: number | null;
}

/** 自分の手札。本人にだけ返す */
export interface MyHand {
  cardIds: string[];
  memo: string;
  swapped: boolean;
  isReady: boolean;
}

/** ゲーム終了画面の振り返り用。各ラウンドの勝ちトーク */
export interface RoundHistory {
  roundNo: number;
  topicId: string;
  parentId: string;
  winnerId: string | null;
  cardIds: string[];
}

export interface RoomSnapshot {
  room: PublicRoom;
  players: PublicPlayer[];
  /** 自分のプレイヤーID。参加していなければ null */
  meId: string | null;
  round: PublicRound | null;
  /** 現在のラウンドで公開済みの発表 */
  pitches: PublicPitch[];
  myHand: MyHand | null;
  history: RoundHistory[];
  /** 目標点に達した人 */
  championId: string | null;
}

/** 参加していない人に返す最小限の情報 */
export interface RoomPreview {
  code: string;
  status: RoomStatus;
  playerCount: number;
}

export type StateResponse =
  | { member: true; snapshot: RoomSnapshot }
  | { member: false; preview: RoomPreview };

export interface ApiErrorBody {
  code: string;
  message: string;
}

/** すべての応答に含める。端末時計のずれ補正に使う */
export interface WithServerTime {
  serverTime: number;
}
