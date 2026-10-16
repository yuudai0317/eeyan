import { describe, expect, it } from 'vitest';
import { createDeck, DeckExhaustedError, discardCards, drawCards, drawMatching } from '../deck';
import { seededRng } from '../rng';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

describe('createDeck', () => {
  it('すべてのカードを1枚ずつ含む', () => {
    const deck = createDeck(ids(50), seededRng(1));
    expect(deck).toHaveLength(50);
    expect(new Set(deck).size).toBe(50);
  });

  it('オブジェクトの配列からも作れる', () => {
    expect(createDeck([{ id: 'a' }, { id: 'b' }], seededRng(1)).sort()).toEqual(['a', 'b']);
  });

  it('同じシードなら同じ順番、違うシードなら違う順番', () => {
    expect(createDeck(ids(30), seededRng(7))).toEqual(createDeck(ids(30), seededRng(7)));
    expect(createDeck(ids(30), seededRng(7))).not.toEqual(createDeck(ids(30), seededRng(8)));
  });
});

describe('drawCards', () => {
  it('上から順に引き、山札から取り除く', () => {
    const r = drawCards(['a', 'b', 'c', 'd'], [], 2, seededRng(1));
    expect(r.drawn).toEqual(['a', 'b']);
    expect(r.pile).toEqual(['c', 'd']);
  });

  it('山札が尽きたら捨て札をシャッフルして再利用する', () => {
    const r = drawCards(['a'], ['x', 'y', 'z'], 3, seededRng(3));
    expect(r.drawn[0]).toBe('a');
    expect(new Set(r.drawn).size).toBe(3);
    expect(r.discard).toEqual([]);
    expect([...r.drawn, ...r.pile].sort()).toEqual(['a', 'x', 'y', 'z']);
  });

  it('山札も捨て札も足りなければエラー', () => {
    expect(() => drawCards(['a'], [], 2, seededRng(1))).toThrow(DeckExhaustedError);
  });

  it('引いたカードを繰り返し引いても重複しない（捨て札に戻すまで）', () => {
    let pile = createDeck(ids(20), seededRng(5));
    let discard: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const r = drawCards(pile, discard, 5, seededRng(i));
      r.drawn.forEach((c) => {
        expect(seen.has(c)).toBe(false);
        seen.add(c);
      });
      pile = r.pile;
      discard = r.discard;
    }
    expect(seen.size).toBe(20);
  });

  it('元の配列を変更しない', () => {
    const pile = ['a', 'b'];
    const discard = ['c'];
    drawCards(pile, discard, 3, seededRng(1));
    expect(pile).toEqual(['a', 'b']);
    expect(discard).toEqual(['c']);
  });
});

describe('drawMatching', () => {
  it('条件に合わないカードを飛ばし、飛ばしたカードは順番どおり山札の上に戻す', () => {
    const r = drawMatching(['a1', 'a2', 'b1', 'a3'], [], (c) => c.startsWith('b'), seededRng(1));
    expect(r.card).toBe('b1');
    expect(r.relaxed).toBe(false);
    expect(r.pile).toEqual(['a1', 'a2', 'a3']);
  });

  it('山札に合うカードがなければ捨て札から探す', () => {
    const r = drawMatching(['a1'], ['b1', 'a2'], (c) => c.startsWith('b'), seededRng(1));
    expect(r.card).toBe('b1');
    expect([...r.pile].sort()).toEqual(['a1', 'a2']);
    expect(r.discard).toEqual([]);
  });

  it('どこにもなければ条件を緩めて引く', () => {
    const r = drawMatching(['a1', 'a2'], [], (c) => c.startsWith('b'), seededRng(1));
    expect(r.card).toBe('a1');
    expect(r.relaxed).toBe(true);
    expect(r.pile).toEqual(['a2']);
  });
});

describe('discardCards', () => {
  it('捨て札の末尾に加える', () => {
    expect(discardCards({ pile: ['a'], discard: ['b'] }, ['c', 'd'])).toEqual({
      pile: ['a'],
      discard: ['b', 'c', 'd'],
    });
  });
});
