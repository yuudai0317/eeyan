import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ja } from '@/i18n/ja';

export default function TopPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between px-5 pb-8 pt-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo />
        <p className="text-lg font-bold">{ja.tagline}</p>
        <p className="whitespace-pre-line text-base text-ink-soft">{ja.top.lead}</p>
      </div>

      <div className="flex w-full flex-col gap-5">
        <Link href="/create" className="btn btn-primary w-full text-xl">
          {ja.top.create}
        </Link>
        <Link href="/join" className="btn btn-secondary w-full flex-col !gap-0 text-xl leading-tight">
          <span>{ja.top.join}</span>
          <span className="text-sm font-medium">{ja.top.joinSub}</span>
        </Link>
        <Link href="/how-to-play" className="mx-auto mt-1 inline-flex min-h-11 items-center px-3 text-base underline decoration-wavy underline-offset-4">
          {ja.top.howTo}
        </Link>
      </div>
    </main>
  );
}
