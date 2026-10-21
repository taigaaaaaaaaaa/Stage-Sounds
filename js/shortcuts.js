// キー割り当てとキー操作による再生を管理
// キーボードイベントを画面表示用の短いキー名に変換
function displayKey(event) {
  if (event.code.startsWith("Key")) {
    return event.code.slice(3).toUpperCase();
  }
  if (event.code.startsWith("Digit")) {
    return event.code.slice(5);
  }
  const labels = {
    Space: "Space",
    Enter: "Enter",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→"
  };
  return labels[event.code] || event.key;
}

// 指定した音声の再生キーを受け付ける状態にする
function beginShortcutAssignment(track, button, status) {
  if (trackWaitingForShortcut) {
    trackWaitingForShortcut.button.textContent = trackWaitingForShortcut.track.shortcutLabel
      ? `キー: ${trackWaitingForShortcut.track.shortcutLabel}`
      : "キー設定";
    trackWaitingForShortcut.status.textContent = "";
  }

  trackWaitingForShortcut = { track, button, status };
  status.textContent = "設定するキーを押してください（Escでキャンセル）";
  button.textContent = "入力待ち…";
  button.focus();
}

// キー設定の入力待ちを取り消し、ボタン表示を元に戻す
function cancelShortcutAssignment() {
  const assignment = trackWaitingForShortcut;
  if (!assignment) {
    return;
  }
  assignment.button.textContent = assignment.track.shortcutLabel
    ? `キー: ${assignment.track.shortcutLabel}`
    : "キー設定";
  assignment.status.textContent = "キー設定をキャンセルしました";
  trackWaitingForShortcut = null;
}

// 再生キーを保存し、保存に失敗した場合は変更前の設定へ戻す
async function saveTrackShortcut(track, code, label, button, status) {
  const previousCode = track.shortcutCode;
  const previousLabel = track.shortcutLabel;
  track.shortcutCode = code;
  track.shortcutLabel = label;

  try {
    await persistShortcut(track);
    button.textContent = label ? `キー: ${label}` : "キー設定";
    status.textContent = label ? `「${label}」キーに設定しました` : "ショートカットを解除しました";
  } catch (error) {
    track.shortcutCode = previousCode;
    track.shortcutLabel = previousLabel;
    button.textContent = previousLabel ? `キー: ${previousLabel}` : "キー設定";
    status.textContent = `保存できませんでした: ${error.message}`;
  }
}

// 音量の変更を保存し、結果を音声カードに表示
async function saveTrackVolume(track, status) {
  try {
    await persistShortcut(track);
    status.textContent = `音量を ${Math.round(track.volume * 100)}% に設定しました`;
  } catch (error) {
    status.textContent = `音量を保存できませんでした: ${error.message}`;
  }
}

// キー設定中は割り当てを行い、それ以外は設定済みキーから音声を再生
function handleShortcutKeydown(event) {
  if (trackWaitingForShortcut) {
    event.preventDefault();
    event.stopPropagation();

    if (event.code === "Escape") {
      cancelShortcutAssignment();
      return;
    }
    if (!event.code || event.code === "Unidentified" || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey
      || ["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
      trackWaitingForShortcut.status.textContent = "修飾キー以外のキーを押してください（Escでキャンセル）";
      return;
    }

    const assignment = trackWaitingForShortcut;
    trackWaitingForShortcut = null;
    const duplicate = allTracks().find((track) => (
      track !== assignment.track && track.shortcutCode === event.code
    ));
    if (duplicate) {
      assignment.status.textContent = `「${displayKey(event)}」は「${duplicate.title}」と重複しているため設定できません`;
      assignment.button.textContent = assignment.track.shortcutLabel
        ? `キー: ${assignment.track.shortcutLabel}`
        : "キー設定";
      return;
    }

    void saveTrackShortcut(
      assignment.track,
      event.code,
      displayKey(event),
      assignment.button,
      assignment.status
    );
    return;
  }

  if (event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey
    || event.target instanceof HTMLElement && event.target.isContentEditable
    || event.target instanceof HTMLInputElement
    || event.target instanceof HTMLTextAreaElement
    || event.target instanceof HTMLSelectElement
    || document.querySelector("dialog[open]")) {
    return;
  }

  const track = allTracks().find((candidate) => candidate.shortcutCode === event.code);
  if (track) {
    event.preventDefault();
    playTrack(track, track.category === "soundEffects" ? "data/SoundEffects" : "data/BGM");
  }
}
