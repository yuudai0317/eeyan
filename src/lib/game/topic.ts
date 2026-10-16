import type { TopicCard } from './types';

function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 10000 → 1万円、15000 → 1万5,000円、3000 → 3,000円 */
export function formatYen(price: number): string {
  if (price >= 10000) {
    const man = Math.floor(price / 10000);
    const rest = price % 10000;
    return `${withCommas(man)}万${rest ? withCommas(rest) : ''}円`;
  }
  return `${withCommas(price)}円`;
}

/** お題の文面。価格表示OFFなら値段を付けない */
export function topicText(topic: Pick<TopicCard, 'item' | 'price'>, showPrice: boolean): string {
  return showPrice
    ? `この${topic.item}を${formatYen(topic.price)}で売ってください`
    : `この${topic.item}を売ってください`;
}
