'use client';

import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { SettingsForm, settingsSummary } from '@/components/SettingsForm';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { useOrigin } from '@/lib/client/nickname';
import { useAction } from '@/lib/client/useAction';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/lib/game/constants';
import type { Settings } from '@/lib/game/settings';
import type { RoomSnapshot } from '@/lib/types/api';
import { HelpButton, SoundToggle } from './Header';
import { sortBySeat, type View } from './view';

function Crown() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-karashi" fill="currentColor" stroke="#3b2a20" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5 8 12l4-6 4 6 4.5-3.5-1.8 9.5H5.3Z" />
    </svg>
  );
}

export function Lobby({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const router = useRouter();
  const { run, busy } = useAction();
  const code = snapshot.room.code;
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Settings>(snapshot.room.settings);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const origin = useOrigin();
  const url = origin ? `${origin}/room/${code}` : '';

  const players = sortBySeat(view.activePlayers);
  const need = Math.max(0, MIN_PLAYERS - players.length);

  const copy = async () => {
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: ja.appName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 共有をキャンセルしたときなど
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-4">
      <div className="mb-3 flex justify-end gap-2">
        <SoundToggle />
        <HelpButton />
      </div>
      <h1 className="font-hand mb-4 text-center text-3xl">{ja.lobby.title}</h1>

      <section className="paper mb-5 px-4 py-4 text-center">
        <p className="text-sm font-bold text-ink-soft">{ja.lobby.code}</p>
        <p className="font-card my-1 text-5xl tracking-[0.18em]" data-testid="room-code">
          {code}
        </p>
        {url && (
          <div className="mx-auto my-3 w-fit rounded-xl border-2 border-ink bg-[#fffaf0] p-2">
            <QRCodeSVG value={url} size={148} bgColor="#fffaf0" fgColor="#3b2a20" title={ja.lobby.qrLabel} />
          </div>
        )}
        <button type="button" className="btn btn-plain btn-small" onClick={copy}>
          {copied ? ja.lobby.copied : ja.lobby.copyUrl}
        </button>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 font-bold">{ja.lobby.players(players.length, MAX_PLAYERS)}</h2>
        <ul className="flex flex-col gap-2">
          {players.map((p, i) => (
            <li
              key={p.id}
              className="paper-flat anim-deal flex min-h-[52px] items-center justify-between gap-2 px-3 py-1.5"
              style={{ '--tilt': `${(i % 2 ? 1 : -1) * 0.6}deg` } as React.CSSProperties}
            >
              <span className="flex min-w-0 items-center gap-2">
                {snapshot.room.hostPlayerId === p.id && (
                  <>
                    <Crown />
                    <span className="sr-only">{ja.lobby.host}</span>
                  </>
                )}
                <span className={`truncate ${p.id === snapshot.meId ? 'font-bold' : ''}`}>{p.nickname}</span>
                {p.id === snapshot.meId && <span className="text-sm text-ink-soft">（{ja.common.you}）</span>}
                {!p.connected && <span className="text-xs text-ink-soft">…</span>}
              </span>
              {view.isHost && p.id !== snapshot.meId && (
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
                  aria-label={`${p.nickname}さんを${ja.lobby.kick}`}
                  onClick={() => setKickTarget({ id: p.id, name: p.nickname })}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="paper-flat mb-6 px-4 py-3">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-bold">{ja.form.optionsTitle}</h2>
          {view.isHost && (
            <button
              type="button"
              className="btn btn-plain btn-small !min-h-11 !text-sm"
              onClick={() => {
                setDraft(snapshot.room.settings);
                setEditing(true);
              }}
            >
              {ja.settings.edit}
            </button>
          )}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-soft">
          {settingsSummary(snapshot.room.settings).map((s) => (
            <li key={s}>・{s}</li>
          ))}
        </ul>
      </section>

      {/* 参加者なら誰でも始められる。最初の親はランダムで決まる */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className="btn btn-primary w-full text-xl"
          disabled={need > 0 || busy}
          onClick={() => run(() => api.start(code))}
        >
          {ja.lobby.start}
        </button>
        {need > 0 ? (
          <p className="font-bold">{ja.lobby.needMore(need)}</p>
        ) : (
          <p className="text-sm text-ink-soft">{ja.lobby.startNote}</p>
        )}
      </div>

      <div className="mt-8 text-center">
        <button type="button" className="min-h-11 px-3 text-sm underline underline-offset-4" onClick={() => setLeaving(true)}>
          {ja.lobby.leave}
        </button>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title={ja.form.optionsTitle}>
        <SettingsForm value={draft} onChange={setDraft} />
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy}
            onClick={async () => {
              if (await run(() => api.updateSettings(code, draft))) setEditing(false);
            }}
          >
            {ja.settings.save}
          </button>
          <button type="button" className="btn btn-plain btn-small w-full" onClick={() => setEditing(false)}>
            {ja.common.cancel}
          </button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!kickTarget}
        title={kickTarget ? ja.lobby.kickConfirm(kickTarget.name) : ''}
        confirmLabel={ja.lobby.kick}
        cancelLabel={ja.common.cancel}
        busy={busy}
        onCancel={() => setKickTarget(null)}
        onConfirm={async () => {
          if (kickTarget) await run(() => api.kick(code, kickTarget.id));
          setKickTarget(null);
        }}
      />
      <ConfirmDialog
        open={leaving}
        title={ja.lobby.leaveConfirm}
        confirmLabel={ja.lobby.leave}
        cancelLabel={ja.common.cancel}
        busy={busy}
        onCancel={() => setLeaving(false)}
        onConfirm={async () => {
          if (await run(() => api.leave(code))) router.push('/');
          setLeaving(false);
        }}
      />
    </main>
  );
}
