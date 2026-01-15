# Gmail to BAND Announce Bot

[cite_start]Google Apps Script (GAS) を使用して、**Gmailで受信した特定の防犯・防災メールを BAND 掲示板へ自動投稿**する連携システムです [cite: 3, 29]。

[cite_start]西鎌倉自治会（Nishikamakura Jichikai）において、行政や警察からの情報をタイムリーに住民へ共有するために開発されました 。

## 🌟 主な機能

* [cite_start]**自動転送:** 指定した送信元からの未読メールを検出し、BAND掲示板に投稿します [cite: 30, 41]。
* [cite_start]**ルールベースの加工:** 送信元ごとにカスタムヘッダーの追加や、不要なフッター文字列（配信停止案内など）の自動カットが可能です [cite: 26, 27, 47, 49]。
* [cite_start]**ハッシュタグ対応:** 投稿時に `#防犯` などのタグを自動で付与できます [cite: 25, 48]。
* [cite_start]**添付ファイル対応:** メールの添付ファイルを Google ドライブに自動保存し、共有用URLを生成して投稿に記載します [cite: 6, 13, 40]。
* [cite_start]**API ポータル:** 外部審査や管理用の Web インターフェースを備えています [cite: 2, 3]。

## ⚙️ セットアップ手順

### 1. BAND API の準備
1. [cite_start][BAND Developers](https://developers.band.us/) で `Access Token` を取得します [cite: 28]。
2. [cite_start]`BandHelper.gs` 内の `getBandList()` 関数を実行し、ログから投稿先 BAND の `band_key` を確認します [cite: 19, 23]。

### 2. GAS の設定
1. [cite_start]`Config_sample.gs` をコピーして `Config.gs` を作成します [cite: 25]。
2. [cite_start]以下の項目を自身の環境に合わせて書き換えます [cite: 28]：
   - `BAND_ACCESS_TOKEN`: 取得したトークン
   - `TARGET_BAND_KEY`: 投稿先のキー
   - `IMAGE_FOLDER_ID`: 添付ファイルを保存するフォルダID
   - `SENDERS`: 送信元アドレスと適応するルールの紐付け

### 3. トリガー設定
1. [cite_start]GAS エディタの「トリガー」から、`checkGmailAndPostToBand` 関数を時間主導型（5分〜15分おき等）で実行するように設定します [cite: 29]。

## 🛠 カスタマイズ (Config.gs)

[cite_start]メールの加工ルールは `RULE_` オブジェクトで定義します [cite: 26, 27]。

```javascript
const RULE_EXAMPLE = {
  customHeader: '【自動投稿】',
  cutOffString: '--- 配信停止はこちら ---' // この文字以降を削除
};
