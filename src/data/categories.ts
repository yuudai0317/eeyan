import type { CategoryId } from '@/lib/game/types';

/** 単語カードのカテゴリ。color はカードの帯の色（CSS変数名）。色だけに頼らず label も必ず表示する */
export const CATEGORIES: Record<CategoryId, { label: string; color: string }> = {
  hook: { label: 'つかみ', color: 'var(--cat-hook)' },
  question: { label: '問いかけ', color: 'var(--cat-question)' },
  pain: { label: '悩み・不安', color: 'var(--cat-pain)' },
  benefit: { label: 'ベネフィット', color: 'var(--cat-benefit)' },
  future: { label: '未来の想像', color: 'var(--cat-future)' },
  authority: { label: '権威・実績', color: 'var(--cat-authority)' },
  social: { label: '社会的証明', color: 'var(--cat-social)' },
  scarcity: { label: '希少性・限定', color: 'var(--cat-scarcity)' },
  story: { label: 'ストーリー', color: 'var(--cat-story)' },
  emotion: { label: '感情', color: 'var(--cat-emotion)' },
  price: { label: '価格の納得感', color: 'var(--cat-price)' },
  closing: { label: 'クロージング', color: 'var(--cat-closing)' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
