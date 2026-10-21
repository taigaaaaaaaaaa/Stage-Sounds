// 音声の追加・保存済み音声の復元・全停止を管理
// ファイル名から拡張子を取り除き、追加時の表示名の初期値に
function formatAudioFileName(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

// ファイルサイズをKBまたはMBの読みやすい表記に変換
function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// 選択した音声ファイルと表示名入力欄を追加確認ダイアログに並べる
function openAudioImport(files, category) {
  selectedAudioFiles = files;
  selectedAudioCategory = category;
  const isBgm = category === "bgm";
  importTitle.textContent = isBgm ? "BGMを追加" : "効果音を追加";
  importKicker.textContent = isBgm ? "ADD YOUR MUSIC" : "ADD SOUND EFFECTS";
  importStatus.textContent = "";
  importFileList.replaceChildren();

  // 入力欄を一時的な断片にまとめ、一覧へのDOM追加を最後に一度だけ行います。
  const fileRows = document.createDocumentFragment();
  for (const [index, file] of selectedAudioFiles.entries()) {
    const row = document.createElement("label");
    row.className = "import-file-row";
    row.htmlFor = `import-name-${index}`;

    const fileInfo = document.createElement("span");
    fileInfo.className = "import-file-info";

    const fileName = document.createElement("span");
    fileName.className = "import-original-name";
    fileName.textContent = file.name;

    const fileSize = document.createElement("span");
    fileSize.className = "import-file-size";
    fileSize.textContent = formatFileSize(file.size);

    const titleInput = document.createElement("input");
    titleInput.className = "import-name-input";
    titleInput.id = `import-name-${category}-${index}`;
    titleInput.name = "trackTitle";
    titleInput.type = "text";
    titleInput.value = formatAudioFileName(file.name);
    titleInput.maxLength = 80;
    titleInput.required = true;
    titleInput.autocomplete = "off";

    fileInfo.append(fileName, fileSize);
    row.append(fileInfo, titleInput);
    fileRows.append(row);
  }
  importFileList.append(fileRows);

  if (!audioImportDialog.open) {
    audioImportDialog.showModal();
  }
}

// ファイル選択欄から対応する音声だけを選び、追加確認ダイアログを開く
function handleAudioFileSelection(category, picker) {
  const supportedExtensions = /\.(mp3|wav|ogg|m4a|aac|flac|aiff?|opus)$/i;
  const selectedFiles = Array.from(picker.files || []);
  picker.value = "";

  if (selectedFiles.length === 0) {
    return;
  }

  const audioFiles = selectedFiles.filter((file) => (
    file.type.startsWith("audio/") || supportedExtensions.test(file.name)
  ));

  if (audioFiles.length === 0) {
    playbackStatus.textContent = "対応する音声ファイルが見つかりませんでした。";
    return;
  }

  openAudioImport(audioFiles, category);
}

// 入力された表示名で音声ファイルを保存し、該当カテゴリの一覧へ追加
async function addSelectedAudio(event) {
  event.preventDefault();
  const titleInputs = importFileList.querySelectorAll(".import-name-input");
  const isBgm = selectedAudioCategory === "bgm";
  const tracks = isBgm ? audioLibrary.bgm : audioLibrary.soundEffects;
  const container = isBgm ? bgmList : effectsList;
  const folderName = isBgm ? "data/BGM" : "data/SoundEffects";
  const categoryName = isBgm ? "BGM" : "効果音";

  const tracksToSave = selectedAudioFiles.map((file, index) => ({
    category: selectedAudioCategory,
    title: titleInputs[index].value.trim(),
    file: file.name,
    description: file.name,
    blob: file,
    addedAt: Date.now()
  }));

  try {
    await persistAudioTracks(tracksToSave);
  } catch (error) {
    importStatus.textContent = `保存できませんでした: ${error.message}`;
    return;
  }

  tracksToSave.forEach((track) => {
    tracks.push({
      ...track,
      shortcutId: `saved:${track.id}`,
      src: URL.createObjectURL(track.blob)
    });
  });

  try {
    await persistCategoryOrder(selectedAudioCategory, tracks);
  } catch (error) {
    playbackStatus.textContent = `音声は追加しましたが、並び順を保存できませんでした: ${error.message}`;
  }

  renderLibrary(container, tracks, folderName, categoryName);
  audioImportDialog.close();
  selectedAudioFiles = [];
  playbackStatus.textContent = `${categoryName}を追加しました`;
}

// IndexedDBから音声と設定を復元し、順番を整えて画面に再表示
async function restoreSavedAudio() {
  addBgmButton.disabled = true;
  addEffectButton.disabled = true;
  playbackStatus.textContent = "保存済みの音声を読み込んでいます…";

  try {
    const savedData = await readSavedAudio();
    const shortcutMap = new Map(savedData.shortcuts.map((shortcut) => [shortcut.trackKey, shortcut]));
    // 固定登録音声に、保存済みの再生キーと音量を戻す
    for (const track of allTracks()) {
      const shortcut = shortcutMap.get(track.shortcutId);
      if (shortcut) {
        track.shortcutCode = shortcut.code;
        track.shortcutLabel = shortcut.label;
        track.volume = Number.isFinite(shortcut.volume) ? shortcut.volume : 1;
      }
    }

    // 保存済み音声から再生用URLを作り、BGMまたは効果音の一覧に追加
    for (const savedTrack of savedData.tracks) {
      savedTrack.shortcutId = `saved:${savedTrack.id}`;
      const shortcut = shortcutMap.get(savedTrack.shortcutId);
      if (shortcut) {
        savedTrack.shortcutCode = shortcut.code;
        savedTrack.shortcutLabel = shortcut.label;
        savedTrack.volume = Number.isFinite(shortcut.volume) ? shortcut.volume : 1;
      }
      const track = {
        ...savedTrack,
        src: URL.createObjectURL(savedTrack.blob)
      };
      if (track.category === "bgm") {
        audioLibrary.bgm.push(track);
      } else if (track.category === "soundEffects") {
        audioLibrary.soundEffects.push(track);
      }
    }

    const savedOrderByCategory = new Map(savedData.orders.map((order) => [order.category, order.trackKeys]));
    // 保存されている順番を優先し、後から追加された音声は末尾に並べる
    for (const [category, tracks] of Object.entries(audioLibrary)) {
      const order = savedOrderByCategory.get(category) || [];
      const orderIndex = new Map(order.map((trackKey, index) => [trackKey, index]));
      tracks.sort((first, second) => {
        const firstIndex = orderIndex.get(first.shortcutId);
        const secondIndex = orderIndex.get(second.shortcutId);
        if (firstIndex === undefined && secondIndex === undefined) {
          return 0;
        }
        if (firstIndex === undefined) {
          return 1;
        }
        if (secondIndex === undefined) {
          return -1;
        }
        return firstIndex - secondIndex;
      });
    }

    renderLibrary(bgmList, audioLibrary.bgm, "data/BGM", "BGM");
    renderLibrary(effectsList, audioLibrary.soundEffects, "data/SoundEffects", "効果音");
    addBgmButton.disabled = false;
    addEffectButton.disabled = false;
    playbackStatus.textContent = savedData.tracks.length > 0
      ? `保存済みの音声を ${savedData.tracks.length} 件読み込みました`
      : "再生中の音はありません";
  } catch (error) {
    playbackStatus.textContent = `音声を保存・復元できません: ${error.message}`;
  }
}

// 再生中のすべての音声を個別停止処理に通して停止
function stopAllAudio() {
  for (const audio of [...audioInstances.keys()]) {
    stopAudio(audio);
  }
  updatePlaybackStatus("すべての音を停止しました");
}
