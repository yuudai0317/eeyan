/**
 * 画面の文言をまとめたファイル。ここを書き換えれば表示が変わります。
 *
 * - ボタン・案内などの短い文言：やわらかい関西弁
 * - ルール説明・エラー：誤解のないよう標準語
 * - 単語カード・お題カードの文面は src/data/*.json（標準語）
 */
export const ja = {
  appName: 'ええやん',
  tagline: '思わず「ええやん！」って言わせたら勝ち',

  top: {
    create: '部屋つくる',
    join: 'まぜてー',
    joinSub: 'コードで参加',
    howTo: '遊び方',
    lead: '無理めなお題の商品を、配られた3枚の言葉で売り込もう。\n親をその気にさせたら勝ち！',
  },

  common: {
    back: 'もどる',
    cancel: 'やめとく',
    ok: 'OK',
    close: '閉じる',
    loading: '読み込み中…',
    reconnecting: 'つながり直してます…',
    toTop: 'トップへもどる',
    retry: 'もういっぺん試す',
    seconds: (n: number) => `${n}秒`,
    unlimited: '無制限',
    soundOn: '音あり',
    soundOff: '音なし',
    help: '遊び方を見る',
    you: 'あなた',
    san: (name: string) => `${name}さん`,
  },

  form: {
    nickname: 'ニックネーム',
    nicknamePlaceholder: '12文字まで',
    roomCode: 'ルームコード',
    roomCodePlaceholder: '6文字',
    createSubmit: 'この設定でつくる',
    joinSubmit: 'まぜてー',
    joinTitle: 'コードで参加',
    createTitle: '部屋つくる',
    optionsTitle: 'ルール設定',
  },

  settings: {
    targetScore: '目標点',
    targetScoreValue: (n: number) => `${n}点先取`,
    prepSeconds: '準備時間',
    pitchSeconds: 'プレゼン時間（1人）',
    allowSwap: 'カード交換',
    allowSwapNote: '準備中に1枚だけ山札と交換できる',
    showPrice: '価格表示',
    showPriceNote: 'お題に「〇〇円で」を付ける',
    spreadCategories: 'カテゴリ分散配布',
    spreadCategoriesNote: '3枚が同じ種類に偏らんようにする',
    on: 'あり',
    off: 'なし',
    edit: '設定を変える',
    save: 'これでいこ',
  },

  lobby: {
    title: 'みんな集まってや',
    code: 'ルームコード',
    copyUrl: '招待URLをコピー',
    copied: 'コピーしたで！',
    share: '招待する',
    qrLabel: '招待用QRコード',
    players: (n: number, max: number) => `参加者 ${n}/${max}人`,
    host: 'ホスト',
    kick: '退出させる',
    kickConfirm: (name: string) => `${name}さんを退出させますか？`,
    start: 'はじめよか',
    needMore: (n: number) => `あと${n}人そろったら始められるで`,
    waitingHost: 'ホストが始めるのを待ってます',
    leave: 'ぬける',
    leaveConfirm: 'このルームからぬけますか？',
  },

  header: {
    round: (n: number) => `第${n}ラウンド`,
    parent: '親',
    scoreLabel: (name: string, score: number, target: number) => `${name}：${score}点（目標${target}点）`,
  },

  prep: {
    yourHand: 'あんたの手札',
    dragHint: 'ドラッグか ▲▼ で並べ替えてな',
    moveUp: (text: string) => `「${text}」を上へ`,
    moveDown: (text: string) => `「${text}」を下へ`,
    memo: '手元メモ（自分にしか見えへん）',
    memoPlaceholder: 'トークの流れをメモしとこ',
    rule: '3枚ぜんぶ使って売り込もう',
    ready: 'いけるで！',
    unready: 'やっぱ待って',
    readyDone: '準備OK！ほかの人を待ってます',
    swap: '1枚こうかん',
    swapPick: 'こうかんするカードを選んでな',
    swapCancel: 'こうかんやめとく',
    swapDone: 'こうかん済み',
    parentWaiting: 'みんな考え中やで',
    parentRole: 'あんたが親や。いちばん買いたくなったトークを選んでな',
    readyCount: (n: number, total: number) => `準備OK ${n}/${total}人`,
    remaining: '残り時間',
  },

  pitch: {
    nowPitching: (name: string) => `${name}さんの売り込み中`,
    yourTurn: 'あんたの番や！',
    nextYou: '次、あんたの番やで',
    end: '以上です！',
    skip: '次の人へ',
    order: '発表の順番',
    done: '済',
    skipped: 'お休み',
    yourMemo: 'あんたのメモ',
  },

  judge: {
    title: 'どのトークが「ええやん」？',
    pick: 'いちばん買いたくなった人をタップ',
    confirm: (name: string) => `${name}さんに「ええやん！」する？`,
    submit: 'ええやん！',
    thinking: (name: string) => `${name}さん、悩んでます…`,
    noWinner: 'うーん、該当なし',
    noWinnerConfirm: '今回は「該当なし」にする？（誰にも点は入りません）',
    proxyNote: '親の接続が切れたままなので、ホストが代わりに判定できます。',
  },

  result: {
    winner: (name: string) => `${name}さんの勝ち！`,
    plusOne: '+1点',
    noWinner: '今回は発表できる人がおらんかったので、ポイントなしです',
    noneChosen: '今回は「ええやん」ならず。ポイントなしです',
    noPoint: 'ポイントなし',
    next: '次いこか',
    toFinal: '結果発表いこか',
    waitingNext: 'ホストか親が次に進めるのを待ってます',
    stamp: 'ええやん！',
  },

  finished: {
    title: '今日のいちばん“ええやん”',
    champion: (name: string) => `${name}さん`,
    noChampion: 'ゲームはここでおしまい',
    scores: '最終得点',
    history: 'ふりかえり（勝ちトーク）',
    historyRound: (n: number) => `第${n}ラウンド`,
    rematch: 'もういっかい',
    waitingRematch: 'ホストが「もういっかい」を押すのを待ってます',
  },

  lowPlayers: {
    warning: (min: number) => `接続中の人数が${min}人を下回りました。`,
    hostAsk: 'このまま続けるか、ここで終わるかを選んでください。',
    waitingHost: 'ホストが続けるかどうかを選んでいます。',
    continue: '続行する',
    end: '終了する',
  },

  room: {
    notFound: 'ルームが見つかりません。',
    inGame: 'このルームはゲーム中のため、途中からは参加できません。',
    left: 'このルームからは退出しました。',
    joinTitle: 'このルームにまぜてもらう',
    endGame: 'ゲームを終える',
    endGameConfirm: 'ゲームをここで終了しますか？',
  },
} as const;
