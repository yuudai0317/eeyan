export type Phase = 'prep' | 'pitch' | 'judge' | 'result';
export type RoomStatus = 'lobby' | 'playing' | 'finished';
/** 状態遷移図で使うゲーム全体の段階 */
export type GameStage = 'lobby' | Phase | 'finished';

/** ロジックが必要とするプレイヤー情報 */
export interface PlayerLite {
  id: string;
  seatOrder: number;
  score: number;
  connected: boolean;
  /** キックまたは自分で抜けた */
  left: boolean;
}

export type CategoryId =
  | 'hook'
  | 'question'
  | 'pain'
  | 'benefit'
  | 'future'
  | 'authority'
  | 'social'
  | 'scarcity'
  | 'story'
  | 'emotion'
  | 'price'
  | 'closing';

export interface WordCard {
  id: string;
  text: string;
  category: CategoryId;
  /** お題に合わせたヒント（任意）。{item} がお題の商品名に置き換わる。なければカテゴリ共通のヒントを使う */
  hint?: string;
}

export interface TopicCard {
  id: string;
  item: string;
  price: number;
  note: string | null;
}
