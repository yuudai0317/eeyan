import { MAX_PLAYERS, MIN_PLAYERS } from '@/lib/game/constants';

/** 遊び方（ルール説明）。誤解が起きないよう標準語で書く。docs/RULES.md と内容をそろえる */
export function RulesContent() {
  return (
    <div className="space-y-5 text-base leading-relaxed">
      <section>
        <h3 className="mb-1 text-lg font-bold">どんなゲーム？</h3>
        <p>
          「この〇〇を〇〇円で売ってください」というお題に対して、配られた3枚の言葉カードを使って口頭で売り込みます。
          親がいちばん「買いたい！」と思ったトークをした人が1点。最初に目標点（ふつうは3点）を取った人が優勝です。
        </p>
      </section>
      <section>
        <h3 className="mb-1 text-lg font-bold">人数と準備</h3>
        <p>
          {MIN_PLAYERS}〜{MAX_PLAYERS}人で遊びます。全員が同じ場所（またはビデオ通話）に集まり、各自のスマートフォンで同じルームを開きます。
          トークはアプリではなく、声に出して行います。
        </p>
      </section>
      <section>
        <h3 className="mb-1 text-lg font-bold">1ラウンドの流れ</h3>
        <ol className="list-decimal space-y-1 pl-6">
          <li>親が決まります（初回はランダム、その後は参加順に交代）。</li>
          <li>全員の画面にお題（売る商品）が出ます。</li>
          <li>親以外の人に、言葉カードが3枚ずつ配られます。ほかの人の手札は見えません。</li>
          <li>
            <strong>準備時間</strong>：3枚を好きな順に並べ替えて、トークの流れを考えます。手元メモは自分にしか見えません。
            準備ができたら「いけるで！」を押します。全員が押すと、時間を待たずに次へ進みます。
          </li>
          <li>
            <strong>プレゼン</strong>：親の次の人から順番に1人ずつ売り込みます。発表中の人のカード3枚が、並べた順に全員の画面に表示されます。
            3枚すべてをトークの中で使ってください。時間切れか「以上です！」で次の人に代わります。
          </li>
          <li>
            <strong>判定</strong>：親が、いちばん買いたくなったトークを1つだけ選んで「ええやん！」を押します。引き分けや「該当なし」はありません。
          </li>
          <li>選ばれた人に1点。誰かが目標点に届いたらゲーム終了、届いていなければ親を交代して次のラウンドへ進みます。</li>
        </ol>
      </section>
      <section>
        <h3 className="mb-1 text-lg font-bold">オプションルール</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>目標点：1〜10点（はじめは3点）</li>
          <li>準備時間：30〜300秒、または無制限（はじめは90秒）</li>
          <li>プレゼン時間：1人30〜180秒、または無制限（はじめは60秒）</li>
          <li>カード交換：オンにすると、準備時間中に1回だけ手札の1枚を山札と交換できます。</li>
          <li>価格表示：お題に「〇〇円で」を付けるかどうか。</li>
          <li>カテゴリ分散配布：手札の3枚が同じ種類に偏らないように配ります。</li>
        </ul>
      </section>
      <section>
        <h3 className="mb-1 text-lg font-bold">接続が切れたとき</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>同じ端末でページを開き直せば、同じプレイヤーとして戻れます。</li>
          <li>発表の順番が来たときに接続が切れている人は、そのラウンドの発表をお休みします。</li>
          <li>親の接続が切れたまま判定が60秒以上止まった場合は、ホストが代わりに判定できます。</li>
          <li>ホストの接続が切れた場合は、参加順が最も早い人がホストを引き継ぎます。</li>
          <li>ゲーム途中からの新しい参加はできません。</li>
        </ul>
      </section>
      <section>
        <h3 className="mb-1 text-lg font-bold">盛り上がるコツ</h3>
        <p>
          こじつけ大歓迎です。カードの言葉をどうつなぐかが腕の見せどころ。親は「理屈より、なんか買いたくなった」で選んでかまいません。
        </p>
      </section>
    </div>
  );
}
