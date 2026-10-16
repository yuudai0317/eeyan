/**
 * API のエラー。message はそのまま画面に表示するので、誤解のない標準語で書く。
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errors = {
  unauthenticated: () =>
    new ApiError(401, 'UNAUTHENTICATED', 'ログイン情報を確認できませんでした。ページを再読み込みしてください。'),
  rateLimited: () =>
    new ApiError(429, 'RATE_LIMITED', '操作が多すぎます。少し待ってからもう一度お試しください。'),
  badRequest: (message = '入力内容に誤りがあります。') => new ApiError(400, 'BAD_REQUEST', message),
  roomNotFound: () =>
    new ApiError(404, 'ROOM_NOT_FOUND', 'ルームが見つかりません。ルームコードを確認してください。'),
  roomExpired: () =>
    new ApiError(410, 'ROOM_EXPIRED', 'このルームは有効期限（作成から24時間）が切れました。新しくルームを作成してください。'),
  notMember: () => new ApiError(403, 'NOT_MEMBER', 'このルームに参加していません。'),
  leftRoom: () => new ApiError(403, 'LEFT_ROOM', 'このルームからは退出済みのため、操作できません。'),
  forbidden: (message = 'この操作を行う権限がありません。') => new ApiError(403, 'FORBIDDEN', message),
  hostOnly: () => new ApiError(403, 'HOST_ONLY', 'この操作はホストだけが行えます。'),
  conflict: () =>
    new ApiError(409, 'CONFLICT', 'ほかの操作と重なりました。最新の状態を読み込み直します。'),
  wrongPhase: (message = '今はこの操作を行えません。') => new ApiError(409, 'WRONG_PHASE', message),
  notDue: () => new ApiError(409, 'NOT_DUE', 'まだ制限時間が残っています。'),
  gameInProgress: () =>
    new ApiError(409, 'GAME_IN_PROGRESS', 'ゲームがすでに始まっているため参加できません。'),
  roomFull: () => new ApiError(409, 'ROOM_FULL', 'ルームが満員のため参加できません。'),
  nicknameTaken: () =>
    new ApiError(409, 'NICKNAME_TAKEN', 'そのニックネームはこのルームですでに使われています。別の名前にしてください。'),
  notEnoughPlayers: (min: number) =>
    new ApiError(409, 'NOT_ENOUGH_PLAYERS', `ゲームを始めるには${min}人以上の参加が必要です。`),
  internal: () =>
    new ApiError(500, 'INTERNAL', 'サーバーでエラーが発生しました。時間をおいてもう一度お試しください。'),
};
