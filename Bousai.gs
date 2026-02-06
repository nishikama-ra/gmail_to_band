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
    }

    // 地震情報の監視
    const resQuake = UrlFetchApp.fetch(conf.URL_QUAKE);
    const dataQuake = JSON.parse(resQuake.getContentText());
    dataQuake.forEach(report => {
      if (report.datetime <= lastCheck) return;
      if (parseInt(report.maxInt) < 3) return;
      const isKanagawa = report.areas && report.areas.some(a => a.pref === "神奈川県");
      if (isKanagawa) {
        postToBand(`#防災情報\n【地震情報】最大震度${report.maxInt}を観測しました。\n地域：${report.headline}`);
        if (report.datetime > latestDateTime) latestDateTime = report.datetime;
      }
    });

    // 津波情報の監視
    const resTsunami = UrlFetchApp.fetch(conf.URL_TSUNAMI);
    const dataTsunami = JSON.parse(resTsunami.getContentText());
    dataTsunami.forEach(report => {
      if (report.datetime <= lastCheck) return;
      const hasTargetRegion = report.areas && report.areas.some(a => a.name === "相模湾・三浦半島");
      if (hasTargetRegion) {
        postToBand(`#防災情報\n【津波情報】${report.headline}`);
        if (report.datetime > latestDateTime) latestDateTime = report.datetime;
      }
    });

    // 火山・降灰情報の監視
    const resVolcano = UrlFetchApp.fetch(conf.URL_VOLCANO);
    const dataVolcano = JSON.parse(resVolcano.getContentText());
    dataVolcano.forEach(report => {
      if (report.datetime <= lastCheck) return;
      const watchVolcanoes = ["富士山", "箱根山", "伊豆東部火山群"];
      const isWatchVolcano = watchVolcanoes.includes(report.volcanoName);
      const isKanagawaAsh = report.ashFallAreas && report.ashFallAreas.some(a => a.includes("神奈川"));
      if (isWatchVolcano || isKanagawaAsh) {
        postToBand(`#防災情報\n【火山・降灰情報】${report.headline}`);
        if (report.datetime > latestDateTime) latestDateTime = report.datetime;
      }
    });

    // 処理した最新時刻を保存
    if (latestDateTime !== lastCheck) {
      PropertiesService.getScriptProperties().setProperty('LAST_JMA_DATETIME', latestDateTime);
    }

  } catch (e) {
    console.error("処理失敗: " + e.toString());
  }
}
