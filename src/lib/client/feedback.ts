'use client';

import { create } from 'zustand';

/**
 * 効果音と振動。効果音は既定OFF（設定でON）。
 * 音声ファイルは使わず WebAudio で「ポン」「パコン」を合成する。
 */

const SOUND_KEY = 'eeyan:sound';

function readSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on';
  } catch {
    return false;
  }
}

interface SoundPref {
  enabled: boolean;
  loaded: boolean;
  load: () => void;
  toggle: () => void;
}

export const useSoundPref = create<SoundPref>((set, get) => ({
  enabled: false,
  loaded: false,
  load: () => {
    if (!get().loaded) set({ enabled: readSound(), loaded: true });
  },
  toggle: () => {
    const enabled = !get().enabled;
    try {
      localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
    } catch {
      // 保存できなくても今回の画面では有効
    }
    set({ enabled });
    if (enabled) playPon();
  },
}));

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !useSoundPref.getState().enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** 気の抜けた「ポン」 */
export function playPon(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(720, t);
  osc.frequency.exponentialRampToValueAtTime(380, t + 0.12);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

/** ハンコを押す「パコン」 */
export function playPakon(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  // 「パ」：短いノイズ
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const nGain = ac.createGain();
  nGain.gain.value = 0.25;
  noise.connect(nGain).connect(ac.destination);
  noise.start(t);
  // 「コン」：低めの三角波
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(260, t + 0.04);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.2);
  gain.gain.setValueAtTime(0.0001, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
  osc.connect(gain).connect(ac.destination);
  osc.start(t + 0.04);
  osc.stop(t + 0.3);
}

/** 対応端末だけ軽く振動させる */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // 対応していない端末では何もしない
  }
}
