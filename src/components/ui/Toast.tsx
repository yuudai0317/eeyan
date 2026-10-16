'use client';

import { useToast } from '@/lib/client/useAction';

/** 画面下のお知らせ。読み上げにも伝わるよう role="status" */
export function Toast() {
  const { message, hide } = useToast();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {message && (
        <button
          type="button"
          onClick={hide}
          className="paper anim-fade pointer-events-auto max-w-md px-4 py-3 text-left text-base"
        >
          {message}
        </button>
      )}
    </div>
  );
}
