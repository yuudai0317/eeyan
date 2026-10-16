-- ええやん 開発用シード
--
-- カードの本文は src/data/topics.json / src/data/words.json が正で、DBには入れません。
-- ルームとプレイヤーは匿名ユーザー（auth.users）に結び付くため、シードでは作らず
-- アプリの画面から作成してください（README の「ローカルで遊ぶ」を参照）。
--
-- ここでは、マイグレーションが期待どおりに入ったかを確かめる軽い確認だけを行います。
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'eeyan-delete-expired-rooms') then
    raise exception '期限切れルーム削除の cron ジョブが登録されていません';
  end if;
end;
$$;
