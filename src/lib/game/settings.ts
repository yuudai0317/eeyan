import { z } from 'zod';

/** ルーム作成時に決めるオプションルール（仕様 2.3）。秒数の null は「無制限」。 */
export const settingsSchema = z.object({
  targetScore: z.number().int().min(1).max(10),
  prepSeconds: z.number().int().min(30).max(300).nullable(),
  pitchSeconds: z.number().int().min(30).max(180).nullable(),
  allowSwap: z.boolean(),
  showPrice: z.boolean(),
  spreadCategories: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  targetScore: 3,
  prepSeconds: 90,
  pitchSeconds: 60,
  allowSwap: false,
  showPrice: true,
  spreadCategories: true,
};

/** 一部だけ指定された設定を既定値で補い、検証する */
export function resolveSettings(partial: unknown): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...(typeof partial === 'object' && partial ? partial : {}) };
  return settingsSchema.parse(merged);
}
