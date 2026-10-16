import type { CategoryId } from '@/lib/game/types';

/** カテゴリごとのゆるい線画アイコン（オリジナル） */
const PATHS: Record<CategoryId, React.ReactNode> = {
  // つかみ：釣り針
  hook: (
    <>
      <path d="M15 3v9.5a4.5 4.5 0 1 1-9 0V11" />
      <path d="M6 11 4.2 13" />
      <circle cx="15" cy="3" r="0.6" />
    </>
  ),
  // 問いかけ：はてな
  question: (
    <>
      <path d="M8.5 8.5a3.6 3.6 0 1 1 5.4 3.1c-1.2.7-1.9 1.4-1.9 2.9" />
      <circle cx="12" cy="18.6" r="0.9" fill="currentColor" />
    </>
  ),
  // 悩み：雨雲
  pain: (
    <>
      <path d="M7.5 14.5a3.8 3.8 0 0 1 .3-7.6 5 5 0 0 1 9.4 1.4 3.1 3.1 0 0 1-.2 6.2Z" />
      <path d="M9 17.5 8 20M13 17.5l-1 2.5" />
    </>
  ),
  // ベネフィット：おひさま
  benefit: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  // 未来：きらきら
  future: (
    <>
      <path d="M11 4.5c.6 3.7 2 5.1 5.5 5.6-3.5.6-4.9 2-5.5 5.6-.6-3.6-2-5-5.5-5.6 3.5-.5 4.9-1.9 5.5-5.6Z" />
      <path d="M18 15.5c.3 1.6.8 2.1 2.3 2.4-1.5.3-2 .8-2.3 2.3-.3-1.5-.8-2-2.3-2.3 1.5-.3 2-.8 2.3-2.4Z" />
    </>
  ),
  // 権威：メダル
  authority: (
    <>
      <path d="m8.5 3 3.5 7 3.5-7" />
      <circle cx="12" cy="15" r="5" />
      <path d="m12 12.6.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2Z" />
    </>
  ),
  // 社会的証明：ふたり
  social: (
    <>
      <circle cx="9" cy="8.5" r="2.8" />
      <circle cx="16.5" cy="9.5" r="2.3" />
      <path d="M3.8 19c.6-3.3 2.6-5 5.2-5s4.6 1.7 5.2 5M14.2 14.4c.7-.3 1.4-.4 2.3-.4 2.2 0 3.7 1.4 4.2 4.4" />
    </>
  ),
  // 希少性：砂時計
  scarcity: (
    <>
      <path d="M7 3.5h10M7 20.5h10" />
      <path d="M8 3.5c0 4.6 7.8 5.6 7.8 8.5S8 15.9 8 20.5M16 3.5c0 4.6-7.8 5.6-7.8 8.5s7.8 3.9 7.8 8.5" />
    </>
  ),
  // ストーリー：ひらいた本
  story: (
    <>
      <path d="M3.5 6.2c3-1.2 5.8-1 8.5.9 2.7-1.9 5.5-2.1 8.5-.9v12c-3-1.1-5.8-.9-8.5 1-2.7-1.9-5.5-2.1-8.5-1Z" />
      <path d="M12 7.1v12" />
    </>
  ),
  // 感情：ハート
  emotion: <path d="M12 19.5s-7.5-4.6-7.5-9.6A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 2.3c0 5-7.5 9.6-7.5 9.6Z" />,
  // 価格：小判
  price: (
    <>
      <ellipse cx="12" cy="12" rx="6.5" ry="8.5" />
      <path d="m9.6 8.2 2.4 3.3 2.4-3.3M12 11.5v5M9.7 12.8h4.6M9.7 15h4.6" />
    </>
  ),
  // クロージング：まる（決まり！）
  closing: (
    <>
      <path d="M12 3.6c4.9 0 8.5 3.6 8.4 8.6-.1 4.6-3.8 8.2-8.6 8.2-4.6 0-8.3-3.7-8.2-8.5.1-4.8 3.6-8.3 8.4-8.3" />
      <path d="m8.3 12.3 2.6 2.6 5-5.6" />
    </>
  ),
};

export function CategoryIcon({ category, className }: { category: CategoryId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'h-5 w-5'}
    >
      {PATHS[category]}
    </svg>
  );
}
