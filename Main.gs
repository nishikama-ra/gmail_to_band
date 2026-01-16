/**
 * 未読メールをスキャンし、添付ファイルの保存とBANDへの投稿を行います。
 */
function checkGmailAndPostToBand() {
  const lock = LockService.getScriptLock();
  try {
    // 1秒待機してロックが取得できなければ実行をスキップ
    if (!lock.tryLock(1000)) {
      console.log("前の処理が実行中のため、今回の実行をスキップします。");
      return;
    }

    const senderEmails = Object.keys(CONFIG.SENDERS);
    if (senderEmails.length === 0) return;

    // 未読メールを検索
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

    if (allMessages.length === 0) return;

    // 古い順にソート
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
        if (!postBody) throw new Error("本文の生成に失敗しました。");

        // 添付ファイルの処理
        const attachments = message.getAttachments();
        const fileUrls = attachments
          .filter(file => file && typeof file.getName === 'function')
          .map(file => {
            const url = uploadFileToDrive(file);
            Utilities.sleep(1000); 
            return url;
          })
          .filter(url => url !== null);

        // BAND投稿
        if (postToBand(postBody, fileUrls)) {
          message.markRead();
          processedCount++;
          console.log(`完了(${processedCount}/${totalToProcess}): [${data.date}] ${message.getSubject()}`);
        } else {
          throw new Error("BAND APIへの投稿に失敗しました。");
        }

        // 連続投稿制限回避のための待機
        Utilities.sleep(10000);

      } catch (e) {
        console.error(`エラー: ${e.message} (${message.getSubject()})`);
        
        // Configのテンプレートを使用して通知メールを送信
        if (CONFIG.ERROR_MAIL.TO) {
          const mailBody = CONFIG.ERROR_MAIL.TEMPLATE
            .replace('{errorMessage}', e.message)
            .replace('{date}', data.date.toString())
            .replace('{subject}', message.getSubject())
            .replace('{sender}', senderEmail);

          MailApp.sendEmail({
            to: CONFIG.ERROR_MAIL.TO,
            subject: CONFIG.ERROR_MAIL.SUBJECT,
            body: mailBody
          });
        }
      }
    }
    console.log(`実行完了：処理件数 ${processedCount} 件`);

  } catch (e) {
    console.error(`システムエラー: ${e.message}`);
  } finally {
    // 最後に必ずロックを解除
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

/**
 * 送信元ごとのルールに基づき、投稿用の本文を生成します。
 */
function createPostBody(message, senderEmail) {
  const configEntry = CONFIG.SENDERS[senderEmail];
  if (!configEntry) return null;
  
  // CONFIGのRULESとTAGSから値を取得
  const rule = CONFIG.RULES[configEntry[0]];
  const tag = CONFIG.TAGS[configEntry[1]];

  const subject = message.getSubject() || "無題";
  let body = message.getPlainBody() || "";
  
  // カットオフ処理
  if (rule.cutOffString) {
    const cutIndex = body.indexOf(rule.cutOffString);
    if (cutIndex !== -1) body = body.substring(0, cutIndex);
  }

  // 制御文字の除去
  const cleanBody = body.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

  let content = "";
  if (tag) content += `${tag}\n`;
  content += `件名：${subject}\n`;
  if (rule.customHeader) content += `${rule.customHeader}\n`;
  content += `\n${cleanBody}`;
  
  return content;
}
