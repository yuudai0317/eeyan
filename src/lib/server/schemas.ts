import { z } from 'zod';
import { isValidRoomCode, MEMO_MAX_LENGTH, normalizeNickname, normalizeRoomCode, settingsSchema } from '@/lib/game';

/** API の入力検証。メッセージはそのまま画面に表示する */

const code = z
  .string({ error: 'ルームコードを入力してください。' })
  .transform(normalizeRoomCode)
  .refine(isValidRoomCode, 'ルームコードは6文字の英数字で入力してください。');

const nickname = z.string({ error: 'ニックネームを入力してください。' }).transform((value, ctx) => {
  const name = normalizeNickname(value);
  if (!name) {
    ctx.addIssue({ code: 'custom', message: 'ニックネームは1〜12文字で入力してください。' });
    return z.NEVER;
  }
  return name;
});

const version = z.number().int().nonnegative().optional();
const playerId = z.uuid({ error: 'プレイヤーの指定が正しくありません。' });
const partialSettings = settingsSchema.partial().strict();

export const schemas = {
  createRoom: z.object({ nickname, settings: partialSettings.optional() }),
  joinRoom: z.object({ code, nickname }),
  codeOnly: z.object({ code }),
  updateSettings: z.object({ code, settings: partialSettings }),
  kick: z.object({ code, playerId }),
  arrange: z.object({
    code,
    cardIds: z.array(z.string()).length(3).optional(),
    memo: z.string().max(MEMO_MAX_LENGTH, `メモは${MEMO_MAX_LENGTH}文字までです。`).optional(),
  }),
  swap: z.object({ code, cardId: z.string() }),
  ready: z.object({ code, ready: z.boolean().default(true) }),
  withVersion: z.object({ code, version }),
  judge: z.object({ code, winnerPlayerId: playerId, version }),
  lowPlayers: z.object({ code, decision: z.enum(['continue', 'end']) }),
};

export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue?.code === 'custom' || (issue?.message && /[ぁ-んァ-ン一-龥]/.test(issue.message))) return issue.message;
  return '入力内容に誤りがあります。';
}
