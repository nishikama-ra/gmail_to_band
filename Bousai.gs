/**
 * 気象庁APIを監視し発表情報を照合して投稿を判断する
 */
function checkJmaAndPostToBand() {
  const conf = CONFIG.BOUSAI_CONFIG;
  const master = conf.MASTER;
  
  // 前回チェック時の最新日時を取得
  const lastCheck = PropertiesService.getScriptProperties().getProperty('LAST_JMA_DATETIME') || "";
  let latestDateTime = lastCheck;

  try {
    const resWarning = UrlFetchApp.fetch(conf.URL_WARNING);
    const dataWarning = JSON.parse(resWarning.getContentText());
    
    let cityData = null;
    const areaTypes = dataWarning.areaTypes || [];
    for (let i = areaTypes.length - 1; i >= 0; i--) {
      const found = areaTypes[i].areas.find(a => a.code === conf.CITY_CODE);
      if (found && found.warnings) {
        cityData = found;
        break;
      }
    }

    if (!cityData) {
      console.log("指定地点のデータが見つかりません。");
      return;
    }

    let activeMessages = [];
    let maxLevel = 3; 
    let hasUpdate = false;

    cityData.warnings.forEach(w => {
      const msg = master.special_warnings[w.code] || 
                  master.warnings[w.code] || 
                  master.advisories[w.code];
      
      if (msg) {
        const statusLabel = (w.status === "解除") ? "（解除）" : "";
        activeMessages.push(msg + statusLabel);

        if (w.status !== "継続") {
          hasUpdate = true;
        }

        if (w.status !== "解除") {
          if (master.special_warnings[w.code]) {
            maxLevel = Math.min(maxLevel, 1);
          } else if (master.warnings[w.code]) {
            maxLevel = Math.min(maxLevel, 2);
          } else if (master.advisories[w.code]) {
            maxLevel = Math.min(maxLevel, 3);
          }
        }
      }
    });

    if (activeMessages.length === 0) {
      console.log("発表中の情報はありません。");
    } else if (!hasUpdate) {
      console.log("情報内容に変更がないためスキップします。");
    } else {
      const sortedContent = activeMessages.sort().join('\n');
      
      let levelLabel = "注意報";
      if (maxLevel === 1) levelLabel = "特別警報";
      else if (maxLevel === 2) levelLabel = "警報・注意報";

      const header = conf.TITLE_PREFIX + "気象情報" + conf.TITLE_SUFFIX;
      const body = header + "\n" + levelLabel + "が発表されています。\n\n" + sortedContent;

      postToBand(body);
      console.log("投稿処理が完了しました。");
      // 連続投稿によるAPI制限を回避するため20秒待機
      Utilities.sleep(20000);
    }

    // 地震・津波・火山フィードの監視
    const feedUrl = "https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml";
    const resFeed = UrlFetchApp.fetch(feedUrl);
    const xmlFeed = resFeed.getContentText();
    const entries = xmlFeed.split("<entry>");

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const updatedMatch = entry.match(/<updated>(.*?)<\/updated>/);
      if (!updatedMatch) continue;
      const updated = updatedMatch[1];
      if (updated <= lastCheck) continue;

      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const linkMatch = entry.match(/<link\s+type="application\/xml"\s+href="(.*?)"/);
      if (!titleMatch || !linkMatch) continue;

      const title = titleMatch[1];
      const detailUrl = linkMatch[1];

      // 地震情報の判定
      if (title.includes("震源・震度")) {
        const resDetail = UrlFetchApp.fetch(detailUrl);
        const xmlDetail = resDetail.getContentText();
        if (xmlDetail.includes("神奈川県")) {
          const contentMatch = entry.match(/<content.*?>(.*?)<\/content>/);
          const headline = contentMatch ? contentMatch[1] : title;
          postToBand(`#防災情報\n【地震情報】\n${headline}`);
          if (updated > latestDateTime) latestDateTime = updated;
          // 連続投稿制限回避
          Utilities.sleep(20000);
        }
      }

      // 津波情報の判定
      if (title.includes("津波")) {
        const resDetail = UrlFetchApp.fetch(detailUrl);
        const xmlDetail = resDetail.getContentText();
        if (xmlDetail.includes("相模湾・三浦半島")) {
          const contentMatch = entry.match(/<content.*?>(.*?)<\/content>/);
          const headline = contentMatch ? contentMatch[1] : title;
          postToBand(`#防災情報\n【津波情報】\n${headline}`);
          if (updated > latestDateTime) latestDateTime = updated;
          // 連続投稿制限回避
          Utilities.sleep(20000);
        }
      }

      // 火山情報の判定
      if (title.includes("火山") || title.includes("降灰")) {
        const resDetail = UrlFetchApp.fetch(detailUrl);
        const xmlDetail = resDetail.getContentText();
        const watchVolcanoes = ["富士山", "箱根山", "伊豆東部火山群"];
        const isWatchVolcano = watchVolcanoes.some(v => xmlDetail.includes(v));
        if (isWatchVolcano || xmlDetail.includes("神奈川県")) {
          const contentMatch = entry.match(/<content.*?>(.*?)<\/content>/);
          const headline = contentMatch ? contentMatch[1] : title;
          postToBand(`#防災情報\n【火山・降灰情報】\n${headline}`);
          if (updated > latestDateTime) latestDateTime = updated;
          // 連続投稿制限回避
          Utilities.sleep(20000);
        }
      }
    }

    // 処理した最新時刻を保存
    if (latestDateTime !== lastCheck) {
      PropertiesService.getScriptProperties().setProperty('LAST_JMA_DATETIME', latestDateTime);
    }

  } catch (e) {
    console.error("処理失敗: " + e.toString());
  }
}
