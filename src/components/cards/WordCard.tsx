import { CATEGORIES } from '@/data/categories';
import { getWord } from '@/lib/cards';
import { CategoryIcon } from '@/components/icons/CategoryIcon';

/** カードIDから -3°〜3° の傾きを決める（再描画で揺れないよう決定的に） */
export function tiltOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 61) - 30) / 10;
}

const SIZES = {
  sm: { text: 'text-lg', pad: 'px-3 pb-3 pt-2', min: 'min-h-[84px]' },
  md: { text: 'text-2xl', pad: 'px-4 pb-4 pt-2.5', min: 'min-h-[104px]' },
  lg: { text: 'text-3xl', pad: 'px-5 pb-5 pt-3', min: 'min-h-[124px]' },
} as const;

/** 単語カード。カテゴリは色だけでなく文字とアイコンでも示す */
export function WordCard({
  cardId,
  order,
  size = 'md',
  animate = false,
  delayIndex = 0,
  tilt = true,
  className = '',
  hint,
  children,
}: {
  /** お題に合わせたヒント（本人の手札にだけ出す） */
  hint?: string | null;
  cardId: string;
  /** 並び順の番号（1〜3） */
  order?: number;
  size?: keyof typeof SIZES;
  /** 配られるときの「ぽんっ」 */
  animate?: boolean;
  delayIndex?: number;
  tilt?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const word = getWord(cardId);
  const s = SIZES[size];
  const angle = tilt ? tiltOf(cardId) : 0;
  if (!word) {
    return <div className={`paper ${s.pad} ${s.min} ${className}`}>？</div>;
  }
  const cat = CATEGORIES[word.category];
  return (
    <div
      className={`paper relative ${s.pad} ${s.min} ${animate ? 'anim-deal' : ''} ${className}`}
      style={
        {
          '--tilt': `${angle}deg`,
          transform: animate ? undefined : `rotate(${angle}deg)`,
          animationDelay: animate ? `${delayIndex * 110}ms` : undefined,
        } as React.CSSProperties
      }
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-sm font-bold text-[#3b2a20]"
          style={{ background: cat.color }}
        >
          <CategoryIcon category={word.category} className="h-4 w-4" />
          {cat.label}
        </span>
        {order !== undefined && (
          <span
            className="font-hand flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-karashi text-lg text-[#3b2a20]"
            aria-label={`${order}枚目`}
          >
            {order}
          </span>
        )}
      </div>
      <p className={`font-card ${s.text} leading-snug break-words`}>{word.text}</p>
      {hint && (
        <p className="mt-1.5 border-t-2 border-dashed border-ink/25 pt-1.5 text-sm leading-snug text-ink-soft">
          <span aria-hidden="true">💡 </span>
          <span className="sr-only">ヒント：</span>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}
