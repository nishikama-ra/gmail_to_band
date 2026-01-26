/**
 * 指定座標の3時間おき予報をBANDに投稿する（リトライ＋エラーメール通知版）
 */
function postWeatherToBand() {
  const config = CONFIG.WEATHER_CONFIG;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${config.LATITUDE}&longitude=${config.LONGITUDE}&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo`;
  
  let response;
  let success = false;
  const maxRetries = 5; 
  let lastError = "";

  for (let i = 0; i < maxRetries; i++) {
    try {
      response = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true });
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        success = true;
        break; 
      } else if (responseCode === 429) {
        lastError = `API制限(429) - Google共有IPの混雑`;
        const waitTime = (15000 + Math.random() * 30000);
        console.warn(`${lastError}。${Math.round(waitTime/1000)}秒後にリトライします (${i + 1}/${maxRetries})`);
        Utilities.sleep(waitTime);
      } else {
        lastError = `APIエラー (Status: ${responseCode})`;
        throw new Error(lastError);
      }
    } catch (e) {
      lastError = e.message;
      console.error(`通信エラー: ${lastError}`);
      if (i === maxRetries - 1) break; 
      Utilities.sleep(5000);
    }
  }

  // 最終的に失敗した場合、メールで通知する
  if (!success) {
    sendWeatherErrorMail(lastError);
    return;
  }

  try {
    const data = JSON.parse(response.getContentText());
    const hourly = data.hourly;
    const now = new Date();
    
    let content = `${config.TAG}\n${config.TITLE}\n\n`;
    let count = 0;

    for (let i = 0; i < hourly.time.length; i++) {
      const forecastTime = new Date(hourly.time[i]);
      if (forecastTime > now && count < config.WEATHER_FORECAST_COUNT) {
        if (forecastTime.getHours() % 3 === 0) {
          const timeStr = Utilities.formatDate(forecastTime, "JST", "MM/dd HH:00");
          const tempVal = hourly.temperature_2m[i].toFixed(1);
          const weatherDesc = config.WEATHER_MAP[hourly.weathercode[i]] || "❓ 不明";
          content += `${timeStr}   ${weatherDesc} (${tempVal}℃)\n`;
          count++;
        }
      }
    }

    content += `\n---\n${config.FOOTER}`;
    postToBand(content);
    console.log("天気予報の投稿に成功しました。");

  } catch (e) {
    sendWeatherErrorMail("データ解析エラー: " + e.message);
  }
}

/**
 * 天気予報専用のエラー通知メール
 */
function sendWeatherErrorMail(errorMessage) {
  const recipient = CONFIG.ERROR_MAIL.TO;
  const subject = "【GAS重要】天気予報の自動投稿に失敗しました";
  const body = `

天気予報の自動投稿処理でエラーが発生しました。
5回のリトライを試みましたが、情報を取得できませんでした。

■発生したエラー内容:
${errorMessage}

■推測される原因:
・Google共有サーバーのIPアドレス制限（429エラー）
・Open-Meteo APIの一時的なダウン

この投稿はスキップされました。次回の定期実行（12時間後）に再度試行されます。
急ぎで投稿が必要な場合は、GASエディタから手動で postWeatherToBand を実行してください。
`.trim();

  try {
    MailApp.sendEmail(recipient, subject, body);
    console.log("管理者へエラー通知メールを送信しました。");
  } catch (e) {
    console.error("エラーメールの送信自体に失敗しました: " + e.message);
  }
}

function triggerWeather() {
  postWeatherToBand();
}

/**
 * 定期実行用
 */
function triggerWeather() {
  postWeatherToBand();
}
