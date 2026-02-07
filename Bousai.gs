/**
 * 気象庁APIを監視し発表情報を照合して投稿を判断する
 */
function checkJmaAndPostToBand() {
  const conf = CONFIG.BOUSAI_CONFIG;
  const master = conf.MASTER;
  const scriptProps = PropertiesService.getScriptProperties();
  
  const lastCheck = scriptProps.getProperty('LAST_JMA_DATETIME') || "";
  const lastPostedContent = scriptProps.getProperty('LAST_JMA_POST_CONTENT') || "";
  let latestDateTime = lastCheck;
  let totalMessage = "";

  try {
    // --- 1. 気象警報・注意報セクション ---
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

    if (cityData) {
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
          if (w.status !== "継続") hasUpdate = true;
          if (w.status !== "解除") {
            if (master.special_warnings[w.code]) maxLevel = Math.min(maxLevel, 1);
            else if (master.warnings[w.code]) maxLevel = Math.min(maxLevel, 2);
            else if (master.advisories[w.code]) maxLevel = Math.min(maxLevel, 3);
          }
        }
      });

      if (activeMessages.length > 0 && hasUpdate)
      {
        const sortedContent = activeMessages.sort().join('\n');
        let levelLabel = (maxLevel === 1) ? "特別警報" : (maxLevel === 2) ? "警報・注意報" : "注意報";
        const header = conf.TITLE_PREFIX + "気象情報" + conf.TITLE_SUFFIX;
        totalMessage += header + "\n" + levelLabel + "が発表されています。\n\n" + sortedContent + "\n\n";
        console.log("気象情報を集約に追加しました。");
      }
    }

    // --- 2. 地震・津波・火山セクション ---
    const resFeed = UrlFetchApp.fetch(conf.URL_FEED_EQVOL);
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

      // A. 地震情報の判定（鎌倉市：震度3以上に限定）
      if (title.includes("震源") || title.includes("震度")) {
        const resDetail = UrlFetchApp.fetch(detailUrl);
        const xmlDetail = resDetail.getContentText();
        const kamakuraMatch = xmlDetail.match(new RegExp(`<Area>.*?<Name>${conf.CITY_NAME}<\/Name>.*?<MaxInt>(.*?)<\/MaxInt>`, "s"));
        
        if (kamakuraMatch) {
          const kamakuraInt = kamakuraMatch[1];
          const targetInts = ["3", "4", "5-", "5+", "6-", "6+", "7"];
          if (targetInts.includes(kamakuraInt)) {
            const epicenterMatch = xmlDetail.match(/<Hypocenter>.*?<Name>(.*?)<\/Name>/);
            const magnitudeMatch = xmlDetail.match(/<jmx_eb:Magnitude.*?>(.*?)<\/jmx_eb:Magnitude>/);
            const maxIntMatch = xmlDetail.match(/<MaxInt>(.*?)<\/MaxInt>/);
            
            let detailMsg = "【地震情報】\n" + title + "\n";
            if (epicenterMatch) detailMsg += "震源地：" + epicenterMatch[1] + "\n";
            if (magnitudeMatch) detailMsg += "規模：M" + magnitudeMatch[1] + "\n";
            if (maxIntMatch) detailMsg += "最大震度：" + maxIntMatch[1].replace(/(\d)[\+\-]/, (m, p1) => p1 + (m.includes('+') ? '強' : '弱')) + "\n";
            const kamakuraIntJP = kamakuraInt.replace("5-", "5弱").replace("5+", "5強").replace("6-", "6弱").replace("6+", "6強");
            detailMsg += conf.CITY_NAME + "の震度：" + kamakuraIntJP + "\n\n";
            totalMessage += detailMsg;
            console.log(`地震情報を集約に追加: ${title}`);
          }
        }
      }

      // B. 津波情報の判定
      else if (title.includes("津波")) {
        const resDetail = UrlFetchApp.fetch(detailUrl);
        const xmlDetail = resDetail.getContentText();
        if (xmlDetail.includes(conf.WATCH_TSUNAMI_REGION)) {
          const contentMatch = entry.match(/<content.*?>(.*?)<\/content>/);
          const headline = contentMatch ? contentMatch[1] : title;
          totalMessage += headline + "\n\n";
          console.log(`津波情報を集約に追加: ${title}`);
        }
      }

      // C. 火山情報の判定
      else if (title.includes("火山") || title.includes("降灰")) {
        const resDetail = UrlFetchApp.fetch(detailUrl);
        const xmlDetail = resDetail.getContentText();
        if (conf.WATCH_VOLCANOES.some(v => xmlDetail.includes(v)) || xmlDetail.includes(conf.PREF_NAME)) {
          const contentMatch = entry.match(/<content.*?>(.*?)<\/content>/);
          const headline = contentMatch ? contentMatch[1] : title;
          totalMessage += headline + "\n\n";
          console.log(`火山情報を集約に追加: ${title}`);
        }
      }
      
      if (updated > latestDateTime) {
        latestDateTime = updated;
      }
    }

    // --- 3. 統合投稿判定 ---
    if (totalMessage !== "") {
      const finalBody = "#防災\n\n" + totalMessage.trim();
      if (finalBody !== lastPostedContent) {
        postToBand(finalBody);
        scriptProps.setProperty('LAST_JMA_POST_CONTENT', finalBody);
        console.log("防災情報の統合投稿が完了しました。");
      } else {
        console.log("前回投稿内容と同一のため、投稿をスキップしました。");
      }
    }

    if (latestDateTime !== lastCheck) {
      scriptProps.setProperty('LAST_JMA_DATETIME', latestDateTime);
    }

  } catch (e) {
    console.error("処理失敗: " + e.toString());
  }
}
