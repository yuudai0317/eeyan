import type { CategoryId } from '@/lib/game/types';

/**
 * 単語カードのカテゴリ。color はカードの帯の色（CSS変数名）。色だけに頼らず label も必ず表示する。
 * hint はお題に合わせたヒント。{item} がお題の商品名に置き換わる（words.json の各カードに hint があればそちらを優先）
 */
export const CATEGORIES: Record<CategoryId, { label: string; color: string; hint: string }> = {
  hook: { label: 'つかみ', color: 'var(--cat-hook)', hint: '{item}の意外な一面から話し始めてみよう' },
  question: { label: '問いかけ', color: 'var(--cat-question)', hint: '{item}が必要になる場面を、相手に質問してみよう' },
  pain: { label: '悩み・不安', color: 'var(--cat-pain)', hint: '{item}がないと困ることを挙げてみよう' },
  benefit: { label: 'ベネフィット', color: 'var(--cat-benefit)', hint: '{item}を使うと得すること・楽になることは？' },
  future: { label: '未来の想像', color: 'var(--cat-future)', hint: '{item}がある暮らしの未来を描いてみよう' },
  authority: { label: '権威・実績', color: 'var(--cat-authority)', hint: '{item}をすすめてくれそうな人や実績をでっちあげよう' },
  social: { label: '社会的証明', color: 'var(--cat-social)', hint: '{item}がみんなに人気だという話をしてみよう' },
  scarcity: { label: '希少性・限定', color: 'var(--cat-scarcity)', hint: '{item}が今しか手に入らない理由は？' },
  story: { label: 'ストーリー', color: 'var(--cat-story)', hint: '{item}にまつわるエピソードを作ってみよう' },
  emotion: { label: '感情', color: 'var(--cat-emotion)', hint: '{item}への思い入れを熱く語ってみよう' },
  price: { label: '価格の納得感', color: 'var(--cat-price)', hint: '{item}の値段が安く感じる比べ方は？' },
  closing: { label: 'クロージング', color: 'var(--cat-closing)', hint: '最後のひと押しで{item}を買う決心をさせよう' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
