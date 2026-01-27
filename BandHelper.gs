/**
 * 添付ファイルをGoogleドライブに保存し、共有用URLを生成する
 */
function uploadFileToDrive(blob) {
  // blob自体が空、または必要なメソッドを持っていない場合のガード
  if (!blob || typeof blob.getName !== 'function') {
    console.warn("無効な添付ファイルデータをスキップしました");
    return null;
  }

  try {
    const folder = DriveApp.getFolderById(CONFIG.IMAGE_FOLDER_ID);
    
    // ファイル名の取得。取得できない場合はデフォルト名を使用
    let originalName = "attached_file";
    try {
      originalName = blob.getName() || "attached_file";
    } catch (e) {
      console.warn("ファイル名の取得に失敗したため、デフォルト名を使用します");
    }

    const timestamp = Utilities.formatDate(new Date(), "JST", "yyyyMMdd_HHmmss");
    const fileName = `${timestamp}_${originalName}`;
    
    const file = folder.createFile(blob);
    file.setName(fileName);
    
    // 外部閲覧権限の付与
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    console.error(`ドライブ保存エラー: ${e.message}`);
    return null;
  }
}

/**
 * BAND APIへ投稿内容を送信する
 */
function postToBand(content, fileUrls = []) {
  const endpoint = 'https://openapi.band.us/v2.2/band/post/create';
  let finalContent = content;

  if (fileUrls.length > 0) {
    finalContent += "\n\n------------------\n添付資料\n" + fileUrls.join('\n');
  }

  const payload = {
    'access_token': CONFIG.BAND_ACCESS_TOKEN,
    'band_key': CONFIG.TARGET_BAND_KEY,
    'content': finalContent,
    'do_push': true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      'method': 'post',
      'payload': payload,
      'muteHttpExceptions': true // エラー時も中身を読み取る
    });
    
    const resText = response.getContentText();
    const json = JSON.parse(resText);
    
    if (json.result_code === 1) {
      return true;
    } else {
      // 失敗理由をログに出す
      console.error(`BAND APIエラー: コード=${json.result_code}, 内容=${resText}`);
      return false;
    }
  } catch (e) {
    console.error(`通信自体に失敗しました: ${e.message}`);
    return false;
  }
}

/**
 * 特定住所検知時に別のBANDへ投稿する専用関数
 */
function postToExtraBand(content, fileUrls = []) {
  const endpoint = 'https://openapi.band.us/v2.2/band/post/create';
  let finalContent = content;

  if (fileUrls.length > 0) {
    finalContent += "\n\n------------------\n添付資料\n" + fileUrls.join('\n');
  }

  const payload = {
    'access_token': CONFIG.BAND_ACCESS_TOKEN,
    'band_key': CONFIG.EXTRA_POST_CONFIG.TARGET_BAND_KEY, // ここが別BANDのキー
    'content': finalContent,
    'do_push': true
  };

  try {
    UrlFetchApp.fetch(endpoint, {
      'method': 'post',
      'payload': payload
    });
  } catch (e) {
    console.error(`別BANDへの投稿エラー: ${e.message}`);
  }
}
