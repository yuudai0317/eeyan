import type { Metadata } from 'next';
import Link from 'next/link';
import { RulesContent } from '@/components/RulesContent';
import { ja } from '@/i18n/ja';

export const metadata: Metadata = { title: '遊び方' };

export default function HowToPlayPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-12 pt-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-base underline underline-offset-4">
        ← {ja.common.toTop}
      </Link>
      <h1 className="font-hand mb-5 mt-2 text-4xl">{ja.top.howTo}</h1>
      <div className="paper px-5 py-5">
        <RulesContent />
      </div>
    </main>
  );
}
