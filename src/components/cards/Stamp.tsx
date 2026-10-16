import { ja } from '@/i18n/ja';

/** 朱色のハンコ風「ええやん！」。斜めに勢いよく押され、インクが少しにじむ */
export function Stamp({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      <div className="relative">
        <div className="anim-ink absolute inset-0 rounded-[40%] bg-shu-ink" style={{ filter: 'url(#ink-blur)' }} />
        <div
          className="anim-stamp font-hand relative flex items-center justify-center rounded-[18px] border-[5px] border-double border-shu-ink px-4 py-1 text-4xl text-shu-ink"
          style={{ filter: 'url(#ink-rough)' }}
        >
          {ja.result.stamp}
        </div>
      </div>
    </div>
  );
}
