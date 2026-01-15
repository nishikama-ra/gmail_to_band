/**
 * 未読メールをスキャンし、添付ファイルの保存とBANDへの投稿を行います。
 * 実行制限を避けるため、設定された件数ずつ受信日時の古い順に処理します。
 */
function checkGmailAndPostToBand() {
  const senderEmails = Object.keys(CONFIG.SENDERS);
  if (senderEmails.length === 0) return;

  const query = `(${senderEmails.map(email => `from:${email}`).join(' OR ')}) is:unread`;
  const threads = GmailApp.search(query, 0, 100); 
  
  if (threads.length === 0) {
    console.log("処理対象の未読メールはありません。");
    return;
  }

  let allMessages = [];
  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      if (msg.isUnread()) {
        const fromRaw = msg.getFrom().toLowerCase();
        const foundSender = senderEmails.find(email => fromRaw.includes(email.toLowerCase()));
        
        if (foundSender) {
          allMessages.push({
            message: msg,
            senderKey: foundSender,
            date: msg.getDate()
          });
        }
      }
    });
  });

  if (allMessages.length === 0) {
    console.log("有効な未読メッセージが見つかりませんでした。");
    return;
  }

  // 受信日時の昇順で並び替え
  allMessages.sort((a, b) => a.date - b.date);

  const targetData = allMessages.slice(0, CONFIG.MAX_THREADS_PER_RUN);
  const totalToProcess = targetData.length;

  console.log(`未読件数: ${allMessages.length} 件。今回の処理対象: ${totalToProcess} 件`);

  let processedCount = 0;
  
  for (const data of targetData) {
    const message = data.message;
    const senderEmail = data.senderKey;

    try {
      const postBody = createPostBody(message, senderEmail);
      if (!postBody) {
        console.warn(`本文作成失敗: ${message.getSubject()}`);
        continue;
      }

      // 添付ファイルの有無と有効性を確認してGoogleドライブへ保存
      const attachments = message.getAttachments();
      const fileUrls = attachments
        .filter(file => file && typeof file.getName === 'function')
        .map(file => {
          const url = uploadFileToDrive(file);
          Utilities.sleep(1000); 
          return url;
        })
        .filter(url => url !== null);

      // BANDへの投稿。成功時のみメールを既読にする
      if (postToBand(postBody, fileUrls)) {
        message.markRead();
        processedCount++;
        console.log(`完了(${processedCount}/${totalToProcess}): [${data.date}] ${message.getSubject()}`);
      } else {
        console.error(`BAND投稿失敗: ${message.getSubject()}`);
      }

      // BAND APIの連続投稿制限を回避するための待機時間
      Utilities.sleep(10000);

    } catch (e) {
      console.error(`処理エラーにつきスキップ (${message.getSubject()}): ${e.message}`);
    }
  }

  console.log(`実行完了：処理件数 ${processedCount} 件`);
}

/**
 * 送信元ごとのルールに基づき、投稿用の本文を生成します。
 */
function createPostBody(message, senderEmail) {
  const configArray = CONFIG.SENDERS[senderEmail];
  if (!configArray) return null;
  
  const rule = configArray[0];
  const tag = configArray[1];

  const subject = message.getSubject() || "無題";
  let rawBody = message.getPlainBody() || "";
  
  if (rule.cutOffString) {
    const cutIndex = rawBody.indexOf(rule.cutOffString);
    if (cutIndex !== -1) rawBody = rawBody.substring(0, cutIndex);
  }

  const cleanBody = rawBody.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

  let content = "";
  if (tag) {
    content += `${tag}\n`;
  }
  
  content += `件名：${subject}\n`;
  if (rule.customHeader) {
    content += `${rule.customHeader}\n`;
  }
  content += `\n${cleanBody}`;
  
  return content;
}