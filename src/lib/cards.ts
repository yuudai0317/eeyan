import topicsJson from '@/data/topics.json';
import wordsJson from '@/data/words.json';
import { CATEGORIES } from '@/data/categories';
import type { TopicCard, WordCard } from '@/lib/game/types';

/** カードの本文は JSON が正。DB にはIDだけを保存する */
export const TOPICS = topicsJson as TopicCard[];
export const WORDS = wordsJson as WordCard[];

const topicById = new Map(TOPICS.map((t) => [t.id, t]));
const wordById = new Map(WORDS.map((w) => [w.id, w]));

export function getTopic(id: string): TopicCard | undefined {
  return topicById.get(id);
}

export function getWord(id: string): WordCard | undefined {
  return wordById.get(id);
}

export function isWordId(id: string): boolean {
  return wordById.has(id);
}

export function categoryOf(wordId: string): string {
  return wordById.get(wordId)?.category ?? 'unknown';
}

/** お題に合わせたカードのヒント（例：「このビニール傘が今しか手に入らない理由は？」） */
export function hintFor(wordId: string, topicId: string): string | null {
  const word = wordById.get(wordId);
  const topic = topicById.get(topicId);
  if (!word || !topic) return null;
  const template = word.hint ?? CATEGORIES[word.category]?.hint;
  return template ? template.replaceAll('{item}', `この${topic.item}`) : null;
}
