'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ja } from '@/i18n/ja';
import { api, ApiClientError } from '@/lib/client/api';
import { saveNickname, useNicknameInput } from '@/lib/client/nickname';
import { NICKNAME_MAX_LENGTH, ROOM_CODE_LENGTH } from '@/lib/game/constants';
import { normalizeRoomCode } from '@/lib/game/room';

/**
 * コードとニックネームで参加するフォーム。
 * fixedCode を渡すとコード欄を出さない（招待URLから開いたとき）
 */
export function JoinForm({
  initialCode = '',
  fixedCode,
  onJoined,
}: {
  initialCode?: string;
  fixedCode?: string;
  onJoined?: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState(fixedCode ?? initialCode);
  const [nickname, setNickname] = useNicknameInput();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const normalized = normalizeRoomCode(code);
    try {
      await api.joinRoom(normalized, nickname);
      saveNickname(nickname.trim());
      if (onJoined) onJoined();
      else router.push(`/room/${normalized}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : '参加できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {!fixedCode && (
        <div>
          <label htmlFor="room-code" className="mb-1 block font-bold">
            {ja.form.roomCode}
          </label>
          <input
            id="room-code"
            className="input font-card text-center text-2xl tracking-[0.3em] uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={ROOM_CODE_LENGTH + 2}
            placeholder={ja.form.roomCodePlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            required
          />
        </div>
      )}
      <div>
        <label htmlFor="join-nickname" className="mb-1 block font-bold">
          {ja.form.nickname}
        </label>
        <input
          id="join-nickname"
          className="input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX_LENGTH}
          placeholder={ja.form.nicknamePlaceholder}
          autoComplete="nickname"
          required
        />
      </div>
      {error && (
        <p role="alert" className="font-bold text-shu-ink">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-secondary w-full" disabled={busy || !nickname.trim() || !code.trim()}>
        {ja.form.joinSubmit}
      </button>
    </form>
  );
}
