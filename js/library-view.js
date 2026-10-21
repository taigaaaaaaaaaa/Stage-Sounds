// 音声カードの生成と並べ替えを管理
// 一覧カード、並べ替え、キー設定などを管理
// 音声カードを作成し、再生・音量・キー設定・並べ替えの操作を設定
function renderLibrary(container, tracks, folderName, categoryName) {
  container.replaceChildren();

  if (tracks.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = `音声はまだ登録されていません。${folderName} にファイルを入れ、README の手順で登録してください。`;
    container.append(emptyState);
    return;
  }

  // カードは断片上で組み立ててから一度に画面へ追加します。
  const cards = document.createDocumentFragment();
  for (const track of tracks) {
    // 音声名と説明を表示するカード本体を作る
    const card = document.createElement("article");
    card.className = "sound-card";

    const details = document.createElement("div");
    details.className = "sound-details";

    const title = document.createElement("h3");
    title.className = "sound-name";
    title.textContent = track.title;

    const description = document.createElement("p");
    description.className = "sound-description";
    description.textContent = track.description || categoryName;

    const shortcutStatus = document.createElement("p");
    shortcutStatus.className = "track-setting-status";
    shortcutStatus.setAttribute("role", "status");

    const volumeControl = document.createElement("label");
    volumeControl.className = "track-volume-control";
    volumeControl.htmlFor = `track-volume-${track.shortcutId}`;

    const volumeLabel = document.createElement("span");
    volumeLabel.className = "track-volume-label";
    volumeLabel.textContent = "音量";

    const volumeSlider = document.createElement("input");
    volumeSlider.className = "track-volume-slider";
    volumeSlider.id = `track-volume-${track.shortcutId}`;
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "100";
    volumeSlider.step = "1";
    volumeSlider.value = String(Math.round((track.volume ?? 1) * 100));
    volumeSlider.setAttribute("aria-label", `${track.title}の音量`);

    const volumeValue = document.createElement("output");
    volumeValue.className = "track-volume-value";
    volumeValue.value = `${volumeSlider.value}%`;
    volumeValue.textContent = volumeValue.value;

    volumeSlider.addEventListener("input", () => {
      // スライダー操作をすぐ反映し、同じ音の再生中インスタンスもまとめて調整できるようにする
      const volume = Number(volumeSlider.value) / 100;
      track.volume = volume;
      volumeValue.value = `${volumeSlider.value}%`;
      volumeValue.textContent = volumeValue.value;
      for (const [audio, playback] of audioInstances) {
        if (playback.track === track) {
          audio.volume = volume;
        }
      }
    });
    volumeSlider.addEventListener("change", () => {
      void saveTrackVolume(track, shortcutStatus);
    });

    volumeControl.append(volumeLabel, volumeSlider, volumeValue);

    const playButton = document.createElement("button");
    playButton.className = "play-button";
    playButton.type = "button";
    playButton.setAttribute("aria-label", `${track.title}を再生`);
    playButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.2 2.3a.7.7 0 0 1 1.05-.6l8.1 5.3a.7.7 0 0 1 0 1.16l-8.1 5.3a.7.7 0 0 1-1.05-.58z"/></svg>';
    playButton.addEventListener("click", () => playTrack(track, folderName));

    // キー設定ボタンは、押した後に入力されたキーをこの音声に割り当てる
    const shortcutButton = document.createElement("button");
    shortcutButton.className = "shortcut-button";
    shortcutButton.type = "button";
    shortcutButton.textContent = track.shortcutLabel
      ? `キー: ${track.shortcutLabel}`
      : "キー設定";
    shortcutButton.setAttribute("aria-label", `${track.title}の再生キーを設定`);
    shortcutButton.addEventListener("click", () => beginShortcutAssignment(track, shortcutButton, shortcutStatus));

    const soundActions = document.createElement("div");
    soundActions.className = "sound-actions";
    soundActions.append(shortcutButton, playButton);

    const orderControls = document.createElement("div");
    orderControls.className = "track-order-controls";

    const dragHandle = document.createElement("button");
    dragHandle.className = "track-drag-handle";
    dragHandle.type = "button";
    dragHandle.draggable = true;
    dragHandle.textContent = "⠿";
    dragHandle.title = "ドラッグして並べ替え";
    dragHandle.setAttribute("aria-label", `${track.title}をドラッグして並べ替え`);
    dragHandle.addEventListener("dragstart", (event) => {
      // ドラッグ中の音声を記録し、ドロップ先で移動できるようにする
      draggedTrack = track;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", track.shortcutId);
      card.classList.add("is-dragging");
    });
    dragHandle.addEventListener("dragend", () => {
      draggedTrack = null;
      card.classList.remove("is-dragging");
      container.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    });

    const trackIndex = tracks.indexOf(track);
    const moveUpButton = document.createElement("button");
    moveUpButton.className = "track-order-button";
    moveUpButton.type = "button";
    moveUpButton.textContent = "↑";
    moveUpButton.title = "上へ移動";
    moveUpButton.setAttribute("aria-label", `${track.title}を上へ移動`);
    moveUpButton.disabled = trackIndex === 0;
    moveUpButton.addEventListener("click", () => moveTrack(categoryName === "BGM" ? "bgm" : "soundEffects", trackIndex, trackIndex - 1));

    const moveDownButton = document.createElement("button");
    moveDownButton.className = "track-order-button";
    moveDownButton.type = "button";
    moveDownButton.textContent = "↓";
    moveDownButton.title = "下へ移動";
    moveDownButton.setAttribute("aria-label", `${track.title}を下へ移動`);
    moveDownButton.disabled = trackIndex === tracks.length - 1;
    moveDownButton.addEventListener("click", () => moveTrack(categoryName === "BGM" ? "bgm" : "soundEffects", trackIndex, trackIndex + 1));

    orderControls.append(dragHandle, moveUpButton, moveDownButton);
    card.addEventListener("dragover", (event) => {
      if (draggedTrack && draggedTrack !== track) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        card.classList.add("is-drop-target");
      }
    });
    card.addEventListener("dragleave", (event) => {
      if (!card.contains(event.relatedTarget)) {
        card.classList.remove("is-drop-target");
      }
    });
    card.addEventListener("drop", (event) => {
      if (!draggedTrack || draggedTrack === track) {
        return;
      }
      event.preventDefault();
      const bounds = card.getBoundingClientRect();
      const placeAfter = event.clientY >= bounds.top + bounds.height / 2;
      const category = categoryName === "BGM" ? "bgm" : "soundEffects";
      const categoryTracks = category === "bgm" ? audioLibrary.bgm : audioLibrary.soundEffects;
      const fromIndex = categoryTracks.indexOf(draggedTrack);
      let toIndex = categoryTracks.indexOf(track) + (placeAfter ? 1 : 0);
      if (fromIndex < toIndex) {
        toIndex -= 1;
      }
      moveTrack(category, fromIndex, toIndex);
    });

    details.append(title, description, volumeControl, shortcutStatus);
    card.append(orderControls, details, soundActions);
    cards.append(card);
  }
  container.append(cards);
}

// 指定したカテゴリ内で音声を移動し、画面と保存済みの順番を更新
function moveTrack(category, fromIndex, toIndex) {
  const tracks = category === "bgm" ? audioLibrary.bgm : audioLibrary.soundEffects;
  if (fromIndex < 0 || fromIndex >= tracks.length || toIndex < 0 || toIndex >= tracks.length || fromIndex === toIndex) {
    return;
  }

  const [track] = tracks.splice(fromIndex, 1);
  tracks.splice(toIndex, 0, track);
  const container = category === "bgm" ? bgmList : effectsList;
  const folder = category === "bgm" ? "data/BGM" : "data/SoundEffects";
  renderLibrary(container, tracks, folder, category === "bgm" ? "BGM" : "効果音");

  void persistCategoryOrder(category, tracks).catch((error) => {
    playbackStatus.textContent = `並び順を保存できませんでした: ${error.message}`;
  });
}

// 固定登録とユーザー追加分を合わせたすべての音声を返す
function allTracks() {
  return [...audioLibrary.bgm, ...audioLibrary.soundEffects];
}

// 固定登録音声にも、キー設定保存に使うカテゴリ別の識別子を付ける
function assignStaticTrackIds() {
  for (const [category, tracks] of Object.entries(audioLibrary)) {
    tracks.forEach((track, index) => {
      track.category = category;
      track.shortcutId = `static:${category}:${track.file}:${index}`;
    });
  }
}
