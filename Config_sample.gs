const CONFIG = {
  // --- 接続情報 ---
  // BAND DevelopersのMyAPIで取得したアクセストークン
  BAND_ACCESS_TOKEN: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  // 投稿先のBANDのキー（BandHelper.gsのgetBandList関数で取得可能）
  TARGET_BAND_KEY: 'XXXXXXXXXXXXXXXXXXXXXXXX', 
  // 添付ファイルがあった際の格納先GoogleDriveのフォルダ  
  IMAGE_FOLDER_ID: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
 
  // --- 実行制御 ---
  MAX_THREADS_PER_RUN: 15, 

  // --- タグ定義 ---
  TAGS: {
    BOUHAN: '#防犯',
    NONE: null
  },

  // --- 投稿本文の装飾ルール ---
  RULES: {
    KAMAKURA: {
      customHeader: '【鎌倉市防災・安全情報メールからの自動投稿です】',
      cutOffString: '登録の変更・解除は下記ページ'
    },
    POLICE: {
      customHeader: '【ピーガルくん安全メールからの自動投稿です】',
      cutOffString: '※※※※※※※※※※'
    },
    GENERAL: {
      customHeader: '【自動投稿メールです】',
      cutOffString: null
    }
  },

  // --- 送信元アドレスと適応ルールの紐付け ---
  SENDERS: {
    'kamakura@sg-p.jp': ['KAMAKURA', 'BOUHAN'],
    'kaztsh@gmail.com': ['KAMAKURA', 'BOUHAN'],
    'oshirase@kodomoanzen.police.pref.kanagawa.jp': ['POLICE', 'BOUHAN']
  },

  // --- エラー通知メール設定 ---
  ERROR_MAIL: {
    TO: 'xxxxx@xxx.xxx',
    SUBJECT: '【GASエラー通知】Gmail to BAND連携',
    TEMPLATE: `
■発生したエラー:
{errorMessage}

■対象メールの情報:
・受信日時: {date}
・件名: {subject}
・送信元: {sender}

■状況:
このメールは投稿に失敗したため、Gmail上で【未読】のまま保留されています。
エラー原因（API制限など）が解消されれば、次回の実行時に再度処理されます。
`.trim()
  }
};

