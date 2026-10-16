import Link from 'next/link';
import { JoinForm } from '@/components/JoinForm';
import { ja } from '@/i18n/ja';

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-base underline underline-offset-4">
        ← {ja.common.back}
      </Link>
      <h1 className="font-hand mb-5 mt-2 text-4xl">{ja.form.joinTitle}</h1>
      <JoinForm initialCode={code ?? ''} />
    </main>
  );
}
