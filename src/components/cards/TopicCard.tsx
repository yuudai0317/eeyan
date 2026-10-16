import { getTopic } from '@/lib/cards';
import { topicText } from '@/lib/game/topic';

/** お題カード（売る商品）。居酒屋のメニュー札のような縦長の帯を添える */
export function TopicCard({
  topicId,
  showPrice,
  compact = false,
}: {
  topicId: string;
  showPrice: boolean;
  compact?: boolean;
}) {
  const topic = getTopic(topicId);
  if (!topic) return null;
  return (
    <section
      aria-label="お題"
      className={`paper relative overflow-hidden ${compact ? 'px-4 py-3' : 'px-5 py-5'}`}
      style={{ transform: 'rotate(-0.6deg)' }}
    >
      <span className="font-hand absolute left-0 top-0 h-full w-7 border-r-2 border-ink bg-shu pt-2 text-center text-sm leading-tight text-on-accent [writing-mode:vertical-rl]">
        お題
      </span>
      <div className="pl-6">
        <p className={`font-card leading-snug ${compact ? 'text-xl' : 'text-2xl'}`}>{topicText(topic, showPrice)}</p>
        {topic.note && <p className="mt-1 text-base text-ink-soft">（{topic.note}）</p>}
      </div>
    </section>
  );
}
