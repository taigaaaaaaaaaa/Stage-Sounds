// 音声や設定をIndexedDBへ保存・読み込み
// カテゴリごとの音声の並び順をIndexedDBに保存
function persistCategoryOrder(category, tracks) {
  return openAudioDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(ORDER_STORE_NAME, "readwrite");
    transaction.objectStore(ORDER_STORE_NAME).put({
      category,
      trackKeys: tracks.map((track) => track.shortcutId)
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("並び順を保存できませんでした。"));
    transaction.onabort = () => reject(transaction.error || new Error("並び順の保存が中断されました。"));
  }));
}

// IndexedDBを開き、必要な保存場所を用意して再利用
function openAudioDatabase() {
  if (audioDatabasePromise) {
    return audioDatabasePromise;
  }

  audioDatabasePromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("このブラウザでは音声を保存できません。最新版の Chrome または Edge をお試しください。"));
      return;
    }

    const request = window.indexedDB.open(AUDIO_DATABASE_NAME, 3);
    request.onupgradeneeded = () => {
      const database = request.result;
      // 初回起動や更新時に、音声・キー設定・並び順の保存場所を用意
      if (!database.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        database.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
      if (!database.objectStoreNames.contains(SHORTCUT_STORE_NAME)) {
        database.createObjectStore(SHORTCUT_STORE_NAME, { keyPath: "trackKey" });
      }
      if (!database.objectStoreNames.contains(ORDER_STORE_NAME)) {
        database.createObjectStore(ORDER_STORE_NAME, { keyPath: "category" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      reject(request.error || new Error("ブラウザ内の音声保存領域を開けませんでした。"));
    };
  });

  return audioDatabasePromise;
}

// 保存済みの音声・再生キー・カテゴリ別の並び順をまとめて読み込む
function readSavedAudio() {
  return openAudioDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction([AUDIO_STORE_NAME, SHORTCUT_STORE_NAME, ORDER_STORE_NAME], "readonly");
    const tracksRequest = transaction.objectStore(AUDIO_STORE_NAME).getAll();
    const shortcutsRequest = transaction.objectStore(SHORTCUT_STORE_NAME).getAll();
    const ordersRequest = transaction.objectStore(ORDER_STORE_NAME).getAll();
    const result = { tracks: [], shortcuts: [], orders: [] };

    tracksRequest.onsuccess = () => {
      result.tracks = tracksRequest.result;
    };
    shortcutsRequest.onsuccess = () => {
      result.shortcuts = shortcutsRequest.result;
    };
    ordersRequest.onsuccess = () => {
      result.orders = ordersRequest.result;
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error("保存済みの音声を読み込めませんでした。"));
    transaction.onabort = () => reject(transaction.error || new Error("保存済みの音声の読み込みが中断されました。"));
  }));
}

// 追加された音声ファイルをIndexedDBに保存し、保存後のレコードIDを付ける
function persistAudioTracks(tracks) {
  return openAudioDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE_NAME);

    for (const track of tracks) {
      const request = store.add(track);
      request.onsuccess = () => {
        track.id = request.result;
      };
    }

    transaction.oncomplete = () => resolve(tracks);
    transaction.onerror = () => reject(transaction.error || new Error("音声をブラウザに保存できませんでした。"));
    transaction.onabort = () => reject(transaction.error || new Error("音声の保存が中断されました。"));
  }));
}

// 音声ごとの再生キーと音量を保存します。初期状態なら不要なレコードを削除
function persistShortcut(track) {
  return openAudioDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(SHORTCUT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SHORTCUT_STORE_NAME);
    const volume = Number.isFinite(track.volume) ? Math.max(0, Math.min(1, track.volume)) : 1;

    if (track.shortcutCode || volume < 1) {
      store.put({
        trackKey: track.shortcutId,
        code: track.shortcutCode,
        label: track.shortcutLabel,
        volume
      });
    } else {
      store.delete(track.shortcutId);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("ショートカットを保存できませんでした。"));
    transaction.onabort = () => reject(transaction.error || new Error("ショートカットの保存が中断されました。"));
  }));
}
