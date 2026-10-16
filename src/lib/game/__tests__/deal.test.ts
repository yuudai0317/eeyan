import { describe, expect, it } from 'vitest';
import { categoryOf, WORDS } from '@/lib/cards';
import { dealHands, swapCard } from '../deal';
import { createDeck } from '../deck';
import { seededRng } from '../rng';

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, seatOrder: i }));

const allCards = (hands: Map<string, string[]>) => [...hands.values()].flat();

describe('dealHands', () => {
  it('親以外の全員に3枚ずつ配り、重複しない', () => {
    const deck = createDeck(WORDS, seededRng(1));
    const r = dealHands(players(8), 'p3', { pile: deck, discard: [] }, { spreadCategories: false, categoryOf }, seededRng(2));
    expect(r.hands.has('p3')).toBe(false);
    expect(r.hands.size).toBe(7);
    for (const hand of r.hands.values()) expect(hand).toHaveLength(3);
    const cards = allCards(r.hands);
    expect(new Set(cards).size).toBe(21);
    expect(r.pile).toHaveLength(WORDS.length - 21);
    expect(cards.some((c) => r.pile.includes(c))).toBe(false);
  });

  it('抜けた人には配らない', () => {
    const ps = players(4).map((p) => ({ ...p, left: p.id === 'p2' }));
    const deck = createDeck(WORDS, seededRng(1));
    const r = dealHands(ps, 'p0', { pile: deck, discard: [] }, { spreadCategories: false, categoryOf }, seededRng(2));
    expect([...r.hands.keys()].sort()).toEqual(['p1', 'p3']);
  });

  it('カテゴリ分散ONなら、各手札の3枚のカテゴリがすべて異なる', () => {
    for (let seed = 0; seed < 50; seed++) {
      const deck = createDeck(WORDS, seededRng(seed));
      const r = dealHands(players(8), 'p0', { pile: deck, discard: [] }, { spreadCategories: true, categoryOf }, seededRng(seed + 100));
      for (const hand of r.hands.values()) {
        expect(new Set(hand.map(categoryOf)).size).toBe(3);
      }
      expect(new Set(allCards(r.hands)).size).toBe(21);
      // 飛ばしたカードは失われずに山札に残る
      expect(r.pile.length + r.discard.length).toBe(WORDS.length - 21);
    }
  });

  it('山札が少なくても捨て札を再利用して配れる', () => {
    const deck = createDeck(WORDS, seededRng(9));
    const pile = deck.slice(0, 4);
    const discard = deck.slice(4, 40);
    const r = dealHands(players(5), 'p0', { pile, discard }, { spreadCategories: true, categoryOf }, seededRng(3));
    const cards = allCards(r.hands);
    expect(cards).toHaveLength(12);
    expect(new Set(cards).size).toBe(12);
    for (const hand of r.hands.values()) expect(new Set(hand.map(categoryOf)).size).toBe(3);
    expect(r.pile.length + r.discard.length).toBe(40 - 12);
  });
});

describe('swapCard', () => {
  it('同じ位置に新しいカードが入り、手放したカードは捨て札へ', () => {
    const hand = ['w001', 'w017', 'w033']; // hook, question, pain
    const r = swapCard(hand, 'w017', { pile: ['w049', 'w050'], discard: [] }, { spreadCategories: false, categoryOf }, seededRng(1));
    expect(r.hand).toEqual(['w001', 'w049', 'w033']);
    expect(r.discard).toEqual(['w017']);
    expect(r.pile).toEqual(['w050']);
  });

  it('カテゴリ分散ONなら残り2枚と同じカテゴリを避ける', () => {
    const hand = ['w001', 'w017', 'w033']; // hook, question, pain
    // 山札の先頭は hook と pain → 飛ばして benefit を引く
    const r = swapCard(hand, 'w017', { pile: ['w002', 'w034', 'w049'], discard: [] }, { spreadCategories: true, categoryOf }, seededRng(1));
    expect(r.hand).toEqual(['w001', 'w049', 'w033']);
    expect(r.pile).toEqual(['w002', 'w034']);
  });

  it('手札にないカードは交換できない', () => {
    expect(() =>
      swapCard(['w001'], 'w999', { pile: ['w002'], discard: [] }, { spreadCategories: false, categoryOf }, seededRng(1)),
    ).toThrow();
  });
});
