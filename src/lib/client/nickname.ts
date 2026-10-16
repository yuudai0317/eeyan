'use client';

import { useState, useSyncExternalStore } from 'react';

/** 前回のニックネームを覚えておく（入力の手間を省くだけの便利機能） */
const KEY = 'eeyan:nickname';

export function loadNickname(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // 保存できなくても困らない
  }
}

const noopSubscribe = () => () => {};

/** 前回の名前を初期値にしたニックネーム入力の状態 */
export function useNicknameInput(): [string, (v: string) => void] {
  const stored = useSyncExternalStore(noopSubscribe, loadNickname, () => '');
  const [edited, setEdited] = useState<string | null>(null);
  return [edited ?? stored, setEdited];
}

/** 現在のオリジン（https://…）。サーバー描画時は空 */
export function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => '');
}
