import { ja } from '@/i18n/ja';

/** 手書き風ロゴ「ええやん」。小さな朱色のハンコを添える */
export function Logo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const big = size === 'lg';
  return (
    <div className="relative inline-flex items-center" aria-label={ja.appName} role="img">
      <span
        aria-hidden="true"
        className={`font-hand inline-block -rotate-3 leading-none tracking-wider ${big ? 'text-7xl' : 'text-3xl'}`}
      >
        ええやん
      </span>
      <span
        aria-hidden="true"
        className={`font-hand absolute rotate-12 rounded-full border-[3px] border-shu-ink text-shu-ink ${
          big ? '-right-9 -top-5 h-12 w-12 text-2xl' : '-right-5 -top-3 h-7 w-7 text-sm'
        } flex items-center justify-center`}
        style={{ filter: 'url(#ink-rough)' }}
      >
        ！
      </span>
    </div>
  );
}
