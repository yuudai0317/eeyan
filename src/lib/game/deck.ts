import { shuffle, type Rng } from './rng';

/** 山札（上が配列の先頭）と捨て札 */
export interface PileState {
  pile: string[];
  discard: string[];
}

export class DeckExhaustedError extends Error {
  constructor() {
    super('山札と捨て札の両方が空です');
    this.name = 'DeckExhaustedError';
  }
}

/** カードの配列からシャッフル済みの山札（IDの配列）を作る */
export function createDeck(cards: readonly (string | { id: string })[], rng: Rng): string[] {
  const ids = cards.map((c) => (typeof c === 'string' ? c : c.id));
  return shuffle(ids, rng);
}

/**
 * 山札の上から n 枚引く。山札が尽きたら捨て札をシャッフルして山札にする。
 * 引いたカードは捨て札に戻さない（呼び出し側がラウンド終了時に捨て札へ送る）。
 */
export function drawCards(
  pile: readonly string[],
  discard: readonly string[],
  n: number,
  rng: Rng,
): { drawn: string[] } & PileState {
  let p = [...pile];
  let d = [...discard];
  const drawn: string[] = [];
  while (drawn.length < n) {
    if (p.length === 0) {
      if (d.length === 0) throw new DeckExhaustedError();
      p = shuffle(d, rng);
      d = [];
    }
    drawn.push(p.shift()!);
  }
  return { drawn, pile: p, discard: d };
}

/**
 * 条件に合うカードを1枚引く。条件に合わないカードは飛ばして、順序を保ったまま山札の上に戻す。
 * 山札を最後まで見ても見つからなければ捨て札を1回だけ混ぜ直して探す。
 * それでも見つからなければ条件を緩めて、飛ばした中の最初の1枚を返す（relaxed = true）。
 */
export function drawMatching(
  pile: readonly string[],
  discard: readonly string[],
  accept: (cardId: string) => boolean,
  rng: Rng,
): { card: string; relaxed: boolean } & PileState {
  let p = [...pile];
  let d = [...discard];
  const skipped: string[] = [];
  let reshuffled = false;
  for (;;) {
    if (p.length === 0) {
      if (!reshuffled && d.length > 0) {
        p = shuffle(d, rng);
        d = [];
        reshuffled = true;
        continue;
      }
      if (skipped.length === 0) throw new DeckExhaustedError();
      const [card, ...rest] = skipped;
      return { card, relaxed: true, pile: rest, discard: d };
    }
    const c = p.shift()!;
    if (accept(c)) return { card: c, relaxed: false, pile: [...skipped, ...p], discard: d };
    skipped.push(c);
  }
}

/** 使い終わったカードを捨て札に送る */
export function discardCards(state: PileState, cards: readonly string[]): PileState {
  return { pile: [...state.pile], discard: [...state.discard, ...cards] };
}
