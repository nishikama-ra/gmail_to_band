# 📢 西鎌倉住宅地自治会 BAND自動投稿処理

## 📝 概要
Gmailで受信した地域情報（防犯・鉄道運行等）およびOpenWeatherMapから取得した天気予報、気象庁の防災情報を、Google Apps Script (GAS) を用いて特定の BAND 掲示板へ自動投稿します。
API連携に必要な認証キーや保存先フォルダIDなどの設定値は、プログラムのソースコード内には記述せず、GASの「スクリプトプロパティ」に保存して実行時に読み出す構成です。

---

## ⚙️ 環境設定（スクリプトプロパティ）
GASエディタの「設定（歯車アイコン）」→「スクリプトプロパティ」に以下の項目を設定することで、機能が動作します。

| プロパティ名 | 設定内容 |
| :--- | :--- |
| `BAND_TOKEN` | BAND Developersにて発行したアクセストークン |
| `DRIVE_FOLDER_ID` | 添付画像保存用のGoogleドライブフォルダID |
| `ERROR_MAIL_TO` | システムエラー通知を受信するメールアドレス |
| `OPENWEATHER_API_KEY` | OpenWeatherMapのAPIキー |
| `KEY_PROD_MAIN` | 【本番】投稿先MAIN BANDの識別キー |
| `KEY_PROD_EXTRA` | 【本番】特定住所検知時の転送先BANDキー |
| `KEY_TEST_MAIN` | 【テスト】検証用MAIN BANDの識別キー |
| `KEY_TEST_EXTRA` | 【テスト】検証用転送先のBANDキー |

---

## 📂 構成ファイルおよび関数詳解

### 1. `Alloc.gs` (実行制御)
実行モード（本番/テスト）の管理と、Webアプリ・トリガーからの各機能への振り分けを行います。
* **`doGet(e)`**: WebアプリURLへのアクセスを処理します。URLパラメータの `type`（weather/email/bousai/announce）と `mode`（test/prod）を判定し、適切な関数を呼び出します。
* **`debug_TestRun()`**: 宛先をテスト用に切り替えた後、メールチェック処理を開始します。
* **`debug_WeatherTest()`**: テスト用宛先に対して天気予報の投稿処理を実行します。
* **`debug_BousaiTest()`**: テスト用宛先に対して気象庁情報の監視処理を実行します。
* **`debug_AnnounceTest()`**: テスト用宛先に対して定期お知らせ投稿を行い、20秒待機後に検証用EXTRA BANDへも連続投稿します。
* **`run_Email()`**: 本番用設定を適用し、受信メールのチェックおよび投稿を実行します。
* **`run_Weather()`**: 本番用設定を適用し、天気予報の取得および投稿を実行します。
* **`run_Bousai()`**: 本番用設定を適用し、防災情報の監視および投稿を実行します。
* **`run_Announce()`**: 本番用設定を適用し、定期お知らせの投稿を実行します。
* **`run_Announce_MonthlyAll()`**: 本番環境において、MAIN BANDおよびEXTRA BANDの両方へ順次お知らせ投稿を行います。

### 2. `BandHelper.gs` (共通処理)
BAND APIとの通信および、ファイル保存に関する共通処理を定義しています。
* **`uploadFileToDrive(blob)`**: メール添付などのバイナリデータをGoogleドライブの指定フォルダに保存します。ファイル名には実行日時を付与し、リンクを知っている全員が閲覧できる権限を設定して共有URLを返します。
* **`postToBand(content, fileUrls)`**: MAIN BANDに対して投稿を行います。API側の混雑（コード1003）を検知した場合、最大3回の試行と10秒間隔の待機によるリトライ処理を行います。
* **`postToExtraBand(content, fileUrls)`**: 特定の条件に合致した情報を転送先BANDへ投稿します。`postToBand` と同様のリトライロジックを備えています。
* **`setBandDestination(mode)`**: 実行モードに応じてスクリプトプロパティから対応するBAND識別キーを読み込み、共通の `CONFIG` オブジェクトへセットします。

### 3. `EmailToBand.gs` (メール処理)
Gmailからの情報抽出と、投稿用テキストへの成形を行います。
* **`checkGmailAndPostToBand()`**: 設定された複数の送信元アドレスから未読メールを検索します。多重実行を防止するロック処理を行いながら、対象メールを順次処理します。
* **`processMessage(msg, senderKey)`**: 個別メールに対し、送信元ごとのタグ付与、本文抽出、添付ファイル処理を行い、加工後の内容をBANDへ送信します。送信完了後、当該メールを既読にします。
* **`handleAttachments(msg)`**: メールに含まれる画像や添付ファイルを抽出し、`uploadFileToDrive` を介して共有用URLのリストを作成します。
* **`cleanBodyText(fullBody, rule)`**: 正規表現を用いて本文中の広告、案内、不要な改行を削除し、送信元に応じた固定ヘッダー文章を付与します。

### 4. `Bousai.gs` (防災監視)
気象庁から配信される防災情報の監視を行います。
* **`checkJmaAndPostToBand()`**: 気象庁APIより、鎌倉市の気象警報、地震、津波、火山の各情報を取得します。前回取得時と内容を比較し、更新がある場合のみ情報を集約して投稿します。

### 5. `Weather.gs` (天気予報)
OpenWeatherMapのデータを用いた天気情報の作成を行います。
* **`postWeatherToBand()`**: 鎌倉市の3時間ごとの天気予報を取得します。取得失敗時は最大10分間のリトライを行い、データを表形式（天気、気温、降水確率、湿度等）に成形して投稿します。
* **`getWeatherDisplayFromConfig(weatherId)`**: 天気コードに基づき、対応する絵文字と日本語表記を `Config.gs` の定義リストから抽出します。
* **`sendWeatherErrorMail(errorMessage)`**: APIキーの欠落や接続不能などの異常が発生した場合、管理者にメール通知を行います。

### 6. `MonthlyAnnounce.gs` (定型投稿)
* **`MonthlySecPostToBand()`**: セキュリティ啓発（パスワード管理、海外ログイン制限等）に関する定型文を作成し、投稿を依頼します。

### 7. `Portal.gs` (Web表示)
* **`renderAnnouncePortal(e)`**: WebアプリURLにパラメータなしでアクセスされた際、用途や運営組織の連絡先を明示したポータル画面を表示します。

### 8. `Tool.gs` (管理補助)
* **`doNothing()`**: トリガーの設定を維持したまま一時的に処理を停止させるための空関数です。
* **`getBandList()`**: 連携中のトークンでアクセス可能なすべてのBAND名と、識別キー（band_key）の一覧をログに出力します。
* **`countCategoryPosts()`**: BAND内の過去投稿をスキャンし、特定のハッシュタグ（#西鎌倉だより 等）ごとの累積投稿件数を集計します。

---

## 🚀 運用方法

### 1. 定期実行の設定
GASのトリガーメニューより、以下の関数を時間主導型で設定します。
* **メール監視**: `run_Email`
* **天気予報**: `run_Weather`
* **防災監視**: `run_Bousai`
* **定期お知らせ**: `run_Announce`（または `run_Announce_MonthlyAll`）

### 2. 即時実行（URL実行）
デプロイ済みのURLにパラメータ `type` と `mode` を付与することで、手動での即時実行が可能です。

* **パラメータ `type` の指定**:
    * `type=email`: 受信メールのチェックと投稿
    * `type=weather`: 天気予報の投稿
    * `type=bousai`: 防災情報の監視と投稿
    * `type=announce`: 定期お知らせの投稿

* **パラメータ `mode` の指定**:
    * `mode=prod`: 本番用BANDへ投稿
    * `mode=test`: テスト用BANDへ投稿

* **URL例**:
    * 本番の天気予報を投稿する場合：`https://.../exec?type=weather&mode=prod`
    * テスト環境でお知らせ投稿を確認する場合：`https://.../exec?type=announce&mode=test`

---

## 📄 ライセンス

Copyright (c) Nishi-kamakura Residents' Association All Rights Reserved.
