import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '@/data/categories';
import { hintFor, TOPICS, WORDS } from '@/lib/cards';

/** カードデータを編集したときに壊れていないかを確かめるテスト */
describe('カードデータ', () => {
  it('お題60枚以上・単語180枚以上', () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(60);
    expect(WORDS.length).toBeGreaterThanOrEqual(180);
  });

  it('IDが重複しない', () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
  });

  it('同じ文面のカードがない', () => {
    expect(new Set(TOPICS.map((t) => t.item)).size).toBe(TOPICS.length);
    expect(new Set(WORDS.map((w) => w.text)).size).toBe(WORDS.length);
  });

  it('12カテゴリそれぞれ15枚以上で、未知のカテゴリがない', () => {
    for (const cat of CATEGORY_IDS) {
      expect(WORDS.filter((w) => w.category === cat).length, cat).toBeGreaterThanOrEqual(15);
    }
    expect(WORDS.every((w) => CATEGORY_IDS.includes(w.category))).toBe(true);
  });

  it('単語は2〜15文字', () => {
    for (const w of WORDS) {
      const len = Array.from(w.text).length;
      expect(len, w.text).toBeGreaterThanOrEqual(2);
      expect(len, w.text).toBeLessThanOrEqual(15);
    }
  });

  it('お題の価格は300円〜100万円', () => {
    for (const t of TOPICS) {
      expect(Number.isInteger(t.price), t.item).toBe(true);
      expect(t.price, t.item).toBeGreaterThanOrEqual(300);
      expect(t.price, t.item).toBeLessThanOrEqual(1_000_000);
      expect(t.note === null || typeof t.note === 'string').toBe(true);
    }
  });
});

describe('ヒント', () => {
  it('すべてのカードに、お題の商品名入りのヒントが出る', () => {
    const topic = TOPICS[0];
    for (const w of WORDS) {
      const hint = hintFor(w.id, topic.id);
      expect(hint, w.id).toContain(`この${topic.item}`);
      expect(hint).not.toContain('{item}');
    }
  });
});
