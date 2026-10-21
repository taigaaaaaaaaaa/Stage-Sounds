// Audioの再生と、再生中プレイヤーの表示を管理
// 再生数に合わせて状態表示、全停止ボタン、画面下部のプレイヤーを更新
function updatePlaybackStatus(message) {
  const count = audioInstances.size;
  playbackStatus.textContent = count === 0
    ? message || "再生中の音はありません"
    : `${count} 個の音を再生中`;
  stopAllButton.disabled = count === 0;
  playbackDock.hidden = count === 0;
  document.body.classList.toggle("has-active-playback", count > 0);
}

// 秒数をプレイヤー表示用の「分:秒」形式に
function formatPlaybackTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

// 音声の長さと再生位置を、プレイヤーのバーと時刻表示に反映
function updatePlaybackProgress(audio, playback) {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  playback.progress.max = String(duration);
  if (document.activeElement !== playback.progress) {
    playback.progress.value = String(Math.min(audio.currentTime || 0, duration || 0));
  }
  playback.elapsed.textContent = formatPlaybackTime(audio.currentTime);
  playback.duration.textContent = formatPlaybackTime(audio.duration);
}

// 指定した再生インスタンスだけを停止し、一覧から取り除く
function stopAudio(audio) {
  const playback = audioInstances.get(audio);
  if (!playback) {
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  audioInstances.delete(audio);
  playback.card.remove();
  updatePlaybackStatus();
}

// 新しいAudioを毎回作って再生し、個別停止や再生位置変更用のカードを追加
function playTrack(track, folderName) {
  // 再生ごとに別のAudioを作るため、同じ音声を何度押しても重ねて再生できるようにする
  const source = track.src || `${folderName}/${encodeURIComponent(track.file)}`;
  const audio = new Audio(source);
  audio.volume = track.volume ?? 1;
  const card = document.createElement("article");
  card.className = "active-playback-card";

  const cardHeading = document.createElement("div");
  cardHeading.className = "active-playback-heading";

  const title = document.createElement("p");
  title.className = "active-playback-title";
  title.textContent = track.title;

  const stopButton = document.createElement("button");
  stopButton.className = "individual-stop-button";
  stopButton.type = "button";
  stopButton.setAttribute("aria-label", `${track.title}を停止`);
  stopButton.title = "この音だけ停止";
  stopButton.textContent = "■";
  stopButton.addEventListener("click", () => stopAudio(audio));

  // この再生インスタンスだけに適用する音量スライダーを作ります。
  const volumeRow = document.createElement("label");
  volumeRow.className = "playback-volume-row";

  const volumeLabel = document.createElement("span");
  volumeLabel.className = "playback-volume-label";
  volumeLabel.textContent = "音量";

  const volume = document.createElement("input");
  volume.className = "playback-volume";
  volume.type = "range";
  volume.min = "0";
  volume.max = "100";
  volume.step = "1";
  volume.value = String(Math.round(audio.volume * 100));
  volume.setAttribute("aria-label", `${track.title}のこの再生の音量`);

  const volumeValue = document.createElement("output");
  volumeValue.className = "playback-volume-value";
  volumeValue.value = `${volume.value}%`;
  volumeValue.textContent = volumeValue.value;
  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value) / 100;
    volumeValue.value = `${volume.value}%`;
    volumeValue.textContent = volumeValue.value;
  });
  volumeRow.append(volumeLabel, volume, volumeValue);

  const timeRow = document.createElement("div");
  timeRow.className = "playback-time-row";

  const elapsed = document.createElement("span");
  elapsed.textContent = "0:00";
  const duration = document.createElement("span");
  duration.textContent = "--:--";

  const progress = document.createElement("input");
  progress.className = "playback-progress";
  progress.type = "range";
  progress.min = "0";
  progress.max = "0";
  progress.step = "0.1";
  progress.value = "0";
  progress.disabled = true;
  progress.setAttribute("aria-label", `${track.title}の再生位置`);
  progress.addEventListener("input", () => {
    // 読み込み済みで長さが分かる音声だけ、バー操作で再生位置を変更できるようにする
    const seekTo = Number(progress.value);
    if (Number.isFinite(seekTo) && Number.isFinite(audio.duration)) {
      audio.currentTime = seekTo;
      elapsed.textContent = formatPlaybackTime(seekTo);
    }
  });

  const playback = { track, card, progress, elapsed, duration, volume };
  cardHeading.append(title, stopButton);
  timeRow.append(elapsed, progress, duration);
  card.append(cardHeading, volumeRow, timeRow);
  activePlaybacks.append(card);
  audioInstances.set(audio, playback);
  updatePlaybackProgress(audio, playback);
  updatePlaybackStatus();

  const removeInstance = (message) => {
    // 再生終了または読み込み失敗時に、音声と対応するカードを一覧から除く
    const currentPlayback = audioInstances.get(audio);
    if (!currentPlayback) {
      return;
    }
    audioInstances.delete(audio);
    currentPlayback.card.remove();
    updatePlaybackStatus(message);
  };
  audio.addEventListener("loadedmetadata", () => {
    progress.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
    updatePlaybackProgress(audio, playback);
  });
  audio.addEventListener("durationchange", () => {
    progress.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
    updatePlaybackProgress(audio, playback);
  });
  audio.addEventListener("timeupdate", () => updatePlaybackProgress(audio, playback));
  audio.addEventListener("seeked", () => updatePlaybackProgress(audio, playback));
  audio.addEventListener("ended", () => removeInstance(), { once: true });
  audio.addEventListener("error", () => {
    removeInstance(`「${track.title}」を読み込めません。ファイル名と場所を確認してください。`);
  }, { once: true });

  let playRequest;
  // play()の失敗を拾い、再生一覧にエラー内容を知らせる
  try {
    playRequest = audio.play();
  } catch (error) {
    removeInstance(`「${track.title}」を再生できませんでした: ${error.message}`);
    return;
  }
  if (playRequest && typeof playRequest.catch === "function") {
    playRequest.catch((error) => {
      removeInstance(`「${track.title}」を再生できませんでした: ${error.message}`);
    });
  }
}
