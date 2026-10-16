import { HAND_SIZE } from './constants';
import { drawCards, drawMatching, type PileState } from './deck';
import type { Rng } from './rng';

export interface DealOptions {
  /** 3枚のカテゴリが重複しないように配る */
  spreadCategories: boolean;
  /** カードID → カテゴリ */
  categoryOf: (cardId: string) => string;
  handSize?: number;
}

export interface DealablePlayer {
  id: string;
  seatOrder: number;
  left?: boolean;
}

/**
 * 親以外の参加中プレイヤーに手札を配る。1枚ずつ順番に配る（実際のディーリングと同じ）。
 * 山札から引くので、同じラウンドで同じカードが複数人に渡ることはない。
 */
export function dealHands(
  players: readonly DealablePlayer[],
  parentId: string,
  deck: PileState,
  options: DealOptions,
  rng: Rng,
): { hands: Map<string, string[]> } & PileState {
  const handSize = options.handSize ?? HAND_SIZE;
  const children = players
    .filter((p) => p.id !== parentId && !p.left)
    .sort((a, b) => a.seatOrder - b.seatOrder);

  const hands = new Map<string, string[]>(children.map((p) => [p.id, []]));
  let state: PileState = { pile: [...deck.pile], discard: [...deck.discard] };

  for (let round = 0; round < handSize; round++) {
    for (const child of children) {
      const hand = hands.get(child.id)!;
      if (options.spreadCategories) {
        const used = new Set(hand.map(options.categoryOf));
        const r = drawMatching(state.pile, state.discard, (c) => !used.has(options.categoryOf(c)), rng);
        hand.push(r.card);
        state = { pile: r.pile, discard: r.discard };
      } else {
        const r = drawCards(state.pile, state.discard, 1, rng);
        hand.push(r.drawn[0]);
        state = { pile: r.pile, discard: r.discard };
      }
    }
  }
  return { hands, ...state };
}

/**
 * 手札の1枚を山札と交換する（オプション「カード交換」）。交換したカードは同じ位置に入る。
 * 手放したカードは捨て札へ送る。カテゴリ分散ONなら、残り2枚と同じカテゴリは避ける。
 */
export function swapCard(
  hand: readonly string[],
  cardId: string,
  deck: PileState,
  options: DealOptions,
  rng: Rng,
): { hand: string[] } & PileState {
  const index = hand.indexOf(cardId);
  if (index < 0) throw new Error('手札にないカードは交換できません');

  const others = hand.filter((_, i) => i !== index);
  const used = new Set(others.map(options.categoryOf));
  const r = options.spreadCategories
    ? drawMatching(deck.pile, deck.discard, (c) => !used.has(options.categoryOf(c)), rng)
    : (() => {
        const d = drawCards(deck.pile, deck.discard, 1, rng);
        return { card: d.drawn[0], pile: d.pile, discard: d.discard };
      })();

  const next = [...hand];
  next[index] = r.card;
  return { hand: next, pile: r.pile, discard: [...r.discard, cardId] };
}
