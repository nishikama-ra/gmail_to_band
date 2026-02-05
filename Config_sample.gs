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
    TRAIN: '#鉄道運行情報',
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
    JORUDAN: {
      customHeader: '【ジョルダン運行情報からの自動投稿です】',
      cutOffString: 'メール設定変更・配信解除'
    },
    YAHOO: {
      customHeader: '【Yahoo!路線情報からの自動投稿です】',
      startAfter: 'さん', 
      cutOffString: 'このメールに返信されても', // ここから一旦カットするが…
      keepFrom: 'Copyright'                   // この文字列がある行以降は「救出」して残す
    },
    GENERAL: {
      customHeader: '【自動投稿メールです】',
      cutOffString: null
    }
  },

  // --- メールフィルタ設定 ---
  // 送信元アドレスをキーにして、個別のフィルタ条件を定義します
  MAIL_FILTERS: {
     'alerts-transit@mail.yahoo.co.jp': {
      priorityRoutes: ['湘南モノレール', '江ノ島電鉄'], // 監視したい路線を追加
      criticalKeywords: ['運休', '見合わせ', '折返し運転', '運転再開']
    }
  },
  
  // --- 送信元アドレスと適応ルールの紐付け ---
  SENDERS: {
    'kamakura@sg-p.jp': ['KAMAKURA', 'BOUHAN'],
    'oshirase@kodomoanzen.police.pref.kanagawa.jp': ['POLICE', 'BOUHAN'],
    'alerts-transit@mail.yahoo.co.jp': ['YAHOO', 'TRAIN']
  },

// --- 追加：特定の住所が含まれる場合の転送先設定 ---
  EXTRA_POST_CONFIG: {
  // ※キーは上部の「EXTRA_BAND_KEY」を参照
    WATCH_ADDRESSES: [
      // 腰越地区
      '鎌倉市西鎌倉', '鎌倉市腰越', '鎌倉市津', '鎌倉市津西', '鎌倉市七里ガ浜', '鎌倉市七里ガ浜東',
      // 深沢地区
      '鎌倉市鎌倉山', '鎌倉市手広', '鎌倉市梶原', '鎌倉市寺分', '鎌倉市笛田', '鎌倉市常盤', '鎌倉市上町屋', '鎌倉市山崎',
      // 片瀬地区
      '藤沢市片瀬山', '藤沢市片瀬目白山', '藤沢市片瀬', '藤沢市片瀬海岸', '藤沢市江の島'
    ]
  },

  // --- エラー通知メール設定 ---
  ERROR_MAIL: {
    TO: 'xxxxxx@xxxx.xxx',
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
  },

// --- 天気予報設定 ---
// LATITUDE: "35.322356",
// LONGITUDE: "139.502873",
  WEATHER_CONFIG: {
    LATITUDE: "35.322356",
    LONGITUDE: "139.502873",
    TITLE: "【西鎌倉 3時間おき詳細予報】",
    TAG: "#天気予報",
    FOOTER: "凡例: 🌡️気温 / ☔降水確率 / 💧湿度 / 🚩風速(風向)\n地点: 西鎌倉交差点 / 提供: Open-Meteo",
    WEATHER_FORECAST_COUNT: 12,
    
    // 実行制御（10分で見切り、1分弱でリトライ）
    TIMEOUT_MS: 600000, 
    MAX_RETRIES: 12,
    WAIT_TIME_BASE: 50000,
    
    // APIパラメータ（一括管理）
    API_PARAMS: [
      "temperature_2m",
      "weathercode",
      "precipitation_probability",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_direction_10m"
    ].join(","),

    // 方位の定義
    WIND_DIRECTIONS: [
      { label: "北", arrow: "⬇️" },
      { label: "北東", arrow: "↙️" },
      { label: "東", arrow: "⬅️" },
      { label: "南東", arrow: "↖️" },
      { label: "南", arrow: "⬆️" },
      { label: "南西", arrow: "↗️" },
      { label: "西", arrow: "➡️" },
      { label: "北西", arrow: "↘️" }
    ],

    // Open-Meteo WMO天気コード変換表
    WEATHER_MAP: {
      0: "☀️ 快晴",
      1: "🌤️ 晴れ",
      2: "⛅ 晴れ時々曇り",
      3: "☁️ 曇り",
      45: "🌫️ 霧",
      48: "🌫️ 霧",
      51: "🌦️ 弱い霧雨",
      53: "🌦️ 霧雨",
      55: "🌦️ 強い霧雨",
      61: "☔ 小雨",
      63: "☔ 雨",
      65: "☔ 強い雨",
      71: "❄️ 弱い雪",
      73: "❄️ 雪",
      75: "❄️ 大雪",
      80: "🌦️ 弱いにわか雨",
      81: "🌦️ にわか雨",
      82: "🌦️ 強いにわか雨",
      95: "⚡ 雷雨"
    }
  }
};


