'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SettingsForm } from '@/components/SettingsForm';
import { ja } from '@/i18n/ja';
import { api, ApiClientError } from '@/lib/client/api';
import { saveNickname, useNicknameInput } from '@/lib/client/nickname';
import { NICKNAME_MAX_LENGTH } from '@/lib/game/constants';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/game/settings';

export default function CreatePage() {
  const router = useRouter();
  const [nickname, setNickname] = useNicknameInput();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { code } = await api.createRoom(nickname, settings);
      saveNickname(nickname.trim());
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'ルームを作成できませんでした。');
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-base underline underline-offset-4">
        ← {ja.common.back}
      </Link>
      <h1 className="font-hand mb-5 mt-2 text-4xl">{ja.form.createTitle}</h1>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div>
          <label htmlFor="nickname" className="mb-1 block font-bold">
            {ja.form.nickname}
          </label>
          <input
            id="nickname"
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            placeholder={ja.form.nicknamePlaceholder}
            autoComplete="nickname"
            required
          />
        </div>
        <fieldset className="paper-flat px-4 py-2">
          <legend className="px-2 font-bold">{ja.form.optionsTitle}</legend>
          <SettingsForm value={settings} onChange={setSettings} />
        </fieldset>
        {error && (
          <p role="alert" className="font-bold text-shu-ink">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !nickname.trim()}>
          {ja.form.createSubmit}
        </button>
      </form>
    </main>
  );
}
