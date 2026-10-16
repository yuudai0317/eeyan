'use client';

import { ja } from '@/i18n/ja';
import type { Settings } from '@/lib/game/settings';

const PREP_OPTIONS = [30, 60, 90, 120, 180, 240, 300, null] as const;
const PITCH_OPTIONS = [30, 45, 60, 90, 120, 180, null] as const;
const TARGET_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function secondsLabel(v: number | null) {
  return v === null ? ja.common.unlimited : ja.common.seconds(v);
}

function Toggle({
  label,
  note,
  checked,
  onChange,
  id,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-sm text-ink-soft">{note}</span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="flex h-9 w-[76px] items-center justify-between rounded-full border-[2.5px] border-ink bg-paper-deep px-2 text-sm font-bold peer-checked:bg-wakakusa peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2">
          <span className={checked ? '' : 'opacity-0'}>{ja.settings.on}</span>
          <span className={checked ? 'opacity-0' : ''}>{ja.settings.off}</span>
        </span>
        <span
          className={`absolute top-1 h-7 w-7 rounded-full border-[2.5px] border-ink bg-card transition-transform ${
            checked ? 'translate-x-[42px]' : 'translate-x-1'
          }`}
        />
      </span>
    </label>
  );
}

function Select<T extends number | null>({
  id,
  label,
  value,
  options,
  format,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  format: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <select
        id={id}
        className="input w-40 !min-h-[48px] py-1"
        value={value === null ? 'null' : String(value)}
        onChange={(e) => onChange((e.target.value === 'null' ? null : Number(e.target.value)) as T)}
      >
        {options.map((o) => (
          <option key={String(o)} value={o === null ? 'null' : String(o)}>
            {format(o)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** ルーム作成時・ロビーでのオプション設定 */
export function SettingsForm({ value, onChange }: { value: Settings; onChange: (next: Settings) => void }) {
  const set = <K extends keyof Settings>(key: K, v: Settings[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="divide-y-2 divide-dashed divide-ink/25">
      <Select
        id="opt-target"
        label={ja.settings.targetScore}
        value={value.targetScore}
        options={TARGET_OPTIONS}
        format={(v) => ja.settings.targetScoreValue(v)}
        onChange={(v) => set('targetScore', v)}
      />
      <Select
        id="opt-prep"
        label={ja.settings.prepSeconds}
        value={value.prepSeconds}
        options={PREP_OPTIONS}
        format={secondsLabel}
        onChange={(v) => set('prepSeconds', v)}
      />
      <Select
        id="opt-pitch"
        label={ja.settings.pitchSeconds}
        value={value.pitchSeconds}
        options={PITCH_OPTIONS}
        format={secondsLabel}
        onChange={(v) => set('pitchSeconds', v)}
      />
      <Toggle
        id="opt-swap"
        label={ja.settings.allowSwap}
        note={ja.settings.allowSwapNote}
        checked={value.allowSwap}
        onChange={(v) => set('allowSwap', v)}
      />
      <Toggle
        id="opt-price"
        label={ja.settings.showPrice}
        note={ja.settings.showPriceNote}
        checked={value.showPrice}
        onChange={(v) => set('showPrice', v)}
      />
      <Toggle
        id="opt-spread"
        label={ja.settings.spreadCategories}
        note={ja.settings.spreadCategoriesNote}
        checked={value.spreadCategories}
        onChange={(v) => set('spreadCategories', v)}
      />
    </div>
  );
}

export function settingsSummary(s: Settings): string[] {
  return [
    ja.settings.targetScoreValue(s.targetScore),
    `${ja.settings.prepSeconds} ${secondsLabel(s.prepSeconds)}`,
    `${ja.settings.pitchSeconds} ${secondsLabel(s.pitchSeconds)}`,
    `${ja.settings.allowSwap} ${s.allowSwap ? ja.settings.on : ja.settings.off}`,
    `${ja.settings.showPrice} ${s.showPrice ? ja.settings.on : ja.settings.off}`,
    `${ja.settings.spreadCategories} ${s.spreadCategories ? ja.settings.on : ja.settings.off}`,
  ];
}
