function MonthlySecPostToBand() {
  const message = "#運営からのお知らせ \n\n" +
    "こんにちは。西鎌倉住宅地自治会のBAND担当です。\n\n" +
    "いつもこちらのBANDをご利用いただき、ありがとうございます。 安心してご利用いただくための、設定や確認事項のお知らせです。\n\n" +
    "※海外で利用されることがないかたは「海外ログイン制限の設定」、おすすめです。\n\n" +
    "1. BANDの設定について\n\n" +
    "・パスワードの管理 🔑 悪用を防ぐため、他のサイトと同じパスワードの使い回しは避けてください。\n\n" +
    "・海外ログイン制限の設定 🌏 日本国外からのアクセスを防ぐことができます。心当たりのないログインを未然に防ぐために有効です。\n" +
    "※設定場所：[設定 ＞ アカウントのセキュリティ確認]\n" +
    "https://www.band.us/cs/help/detail/1003\n\n\n" +
    "2. スマホ・PCの利用について\n\n" +
    "・最新の状態を保つ 📲 安全のために、本体やアプリは常に最新版を利用するようにしましょう。\n\n" +
    "・不審な連絡への注意 ⚠️ 身に覚えのないメールやメッセージにあるリンクは、トラブルの元になるため開かないようご注意ください。\n\n" +
    "・公共Wi-Fiの利用について 📶 街中の誰でも使える無料Wi-Fiは、通信内容を盗み見られるリスクがあります。利用する際は、十分に注意をしましょう。\n\n" +
    "3. 端末の管理について 📱\n\n" +
    "・画面ロックの設定 万が一の紛失に備え、スマホやPCには画面ロックを設定しましょう。また、外出先などで端末を放置しないよう気をつけましょう。";

  // APIエンドポイントの定義
  const endpoint = "https://openapi.band.us/v2.2/band/post/create";
  
  // 投稿パラメータの構成（ステッカー情報を追加）
  const payload = {
    "access_token": CONFIG.BAND_ACCESS_TOKEN,
    "band_key": CONFIG.TARGET_BAND_KEY,
    "content": message,
    "do_push": "true",
    "sticker_package_id": "1", // パッケージID (1: Niz)
    "sticker_id": "12"         // ステッカーID (12: 虫眼鏡で確認)
  };

  const options = {
    "method": "post",
    "payload": payload,
    "muteHttpExceptions": true
  };

  // APIの実行
  const response = UrlFetchApp.fetch(endpoint, options);
  console.log("Response Body: " + response.getContentText());
}
