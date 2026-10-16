'use client';

import { useEffect, useRef, useState } from 'react';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/useAction';
import { MEMO_MAX_LENGTH } from '@/lib/game/constants';

/** 手元メモ。本人だけが見られる。入力が止まってから保存する。ラウンドが変わったら key で作り直す */
export function MemoBox({ code, initial }: { code: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const saved = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { run } = useAction();

  const flush = (memo: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (memo === saved.current) return;
    saved.current = memo;
    void run(() => api.arrange(code, { memo }), { silent: true });
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div>
      <label htmlFor="memo" className="mb-1 block text-sm font-bold">
        {ja.prep.memo}
      </label>
      <textarea
        id="memo"
        className="input min-h-[88px] resize-y text-base"
        value={value}
        maxLength={MEMO_MAX_LENGTH}
        placeholder={ja.prep.memoPlaceholder}
        onChange={(e) => {
          const memo = e.target.value;
          setValue(memo);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => flush(memo), 800);
        }}
        onBlur={() => flush(value)}
      />
    </div>
  );
}
