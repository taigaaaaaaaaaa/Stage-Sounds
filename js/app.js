// テーマカラー、HELP、アプリ起動時の初期化を管理
// テーマカラーとして使える「#RRGGBB」形式かどうかを確認
function isValidHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

// テーマ色を画面へ即時反映し、必要なら次回起動用に保存
function applyTheme(color, persist) {
  if (!isValidHexColor(color)) {
    return;
  }

  const normalizedColor = color.toLowerCase();
  const red = Number.parseInt(normalizedColor.slice(1, 3), 16);
  const green = Number.parseInt(normalizedColor.slice(3, 5), 16);
  const blue = Number.parseInt(normalizedColor.slice(5, 7), 16);

  document.documentElement.style.setProperty("--theme-color", normalizedColor);
  document.documentElement.style.setProperty("--theme-rgb", `${red}, ${green}, ${blue}`);
  themePicker.value = normalizedColor;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalizedColor);
    } catch (error) {
      playbackStatus.textContent = `色は変更されましたが保存できませんでした: ${error.message}`;
    }
  }
}

// 前回保存したテーマ色を読み込み、画面に適用
function loadSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && isValidHexColor(savedTheme)) {
      applyTheme(savedTheme, false);
    }
  } catch (error) {
    playbackStatus.textContent = `保存済みの色を読み込めませんでした: ${error.message}`;
  }
}

// 使い方ダイアログが閉じている場合に表示
function showHelp() {
  if (!helpDialog.open) {
    helpDialog.showModal();
  }
}

// 起動時に固定音声を表示し、保存内容の復元と各ボタンのイベント登録を行う
assignStaticTrackIds();
renderLibrary(bgmList, audioLibrary.bgm, "data/BGM", "BGM");
renderLibrary(effectsList, audioLibrary.soundEffects, "data/SoundEffects", "効果音");
loadSavedTheme();
restoreSavedAudio();

// 追加ボタンからファイル選択を開き、選んだ音声をカテゴリ別に処理
addBgmButton.addEventListener("click", () => bgmFilePicker.click());
addEffectButton.addEventListener("click", () => effectsFilePicker.click());
bgmFilePicker.addEventListener("change", () => handleAudioFileSelection("bgm", bgmFilePicker));
effectsFilePicker.addEventListener("change", () => handleAudioFileSelection("soundEffects", effectsFilePicker));
document.querySelector("#audio-import-form").addEventListener("submit", addSelectedAudio);
document.querySelector("#import-close").addEventListener("click", () => audioImportDialog.close());
document.querySelector("#import-cancel").addEventListener("click", () => audioImportDialog.close());
audioImportDialog.addEventListener("close", () => {
  selectedAudioFiles = [];
});
// ページ全体のキー入力を受け取り、キー設定または音声再生に使う
document.addEventListener("keydown", handleShortcutKeydown);
// 色を選ぶたびにテーマへ反映し、ブラウザ内に保存
themePicker.addEventListener("input", () => applyTheme(themePicker.value, true));
// 全停止ボタンとHELPダイアログの開閉を設定
stopAllButton.addEventListener("click", stopAllAudio);
document.querySelector("#help-open").addEventListener("click", showHelp);
document.querySelector("#help-close").addEventListener("click", () => helpDialog.close());
document.querySelector("#help-done").addEventListener("click", () => helpDialog.close());
helpDialog.addEventListener("click", (event) => {
  if (event.target === helpDialog) {
    helpDialog.close();
  }
});

// 利用規約ダイアログを開閉し、背景部分を押した場合も閉じます。
document.querySelector("#terms-open").addEventListener("click", () => termsDialog.showModal());
document.querySelector("#terms-close").addEventListener("click", () => termsDialog.close());
document.querySelector("#terms-done").addEventListener("click", () => termsDialog.close());
termsDialog.addEventListener("click", (event) => {
  if (event.target === termsDialog) {
    termsDialog.close();
  }
});

showHelp();

// コンソールにメッセージを表示
console.log(String.raw`
   ___   ____ ___   _____    __  ______       ___
   |__ \ / __ \__ \ / ___/   /  |/  /__ \     <  /
   __/ // / / /_/ // __ \   / /|_/ /__/ /_____/ /
  / __// /_/ / __// /_/ /  / /  / // __/_____/ /
 /____/\____/____/\____/  /_/  /_//____/    /_/
`);

console.log(String.raw`
     ______      ____                  ______          __  _             __
    / ____/_  __/ / /___  __________  / ____/__  _____/ /_(_)   ______ _/ /
   / /   / / / / / __/ / / / ___/ _ \/ /_  / _ \/ ___/ __/ / | / / __ / /
  / /___/ /_/ / / /_/ /_/ / /  /  __/ __/ /  __(__  ) /_/ /| |/ / /_/ / /
  \____/\__,_/_/\__/\__,_/_/   \___/_/    \___/____/\__/_/ |___/\__,_/_/    
`);

console.log(String.raw`
  ________            _______ __  __              ____   ____  __               _
 /_  __/ /_  ___     /_  __(_) /_/ /__     ____  / __/  / __ \/ /___ ___  __   (_)____
  / / / __ \/ _ \     / / / / __/ / _ \   / __ \/ /_   / /_/ / / __ ${String.fromCharCode(96)}/ / / /  / / ___/
 / / / / / /  __/    / / / / /_/ /  __/  / /_/ / __/  / ____/ / /_/ / /_/ /  / (__  ) _ _
/_/ /_/ /_/\___/    /_/ /_/\__/_/\___/   \____/_/    /_/   /_/\__,_/\__, /  /_/____(_|_|_)
                                                                   /____/
`);

console.log(String.raw`
    __  ___                      __
   /  |/  /___  ____ ___  ____  / /_____ __________
  / /|_/ / __ \/ __ ${String.fromCharCode(96)}__ \/ __ \/ __/ __ ${String.fromCharCode(96)}/ ___/ __ \
 / /  / / /_/ / / / / / / /_/ / /_/ /_/ / /  / /_/ /
/_/  /_/\____/_/ /_/ /_/\____/\__/\__,_/_/   \____/
`);

console.log("思い出に残るとっても楽しかったって思えるような文化祭にしよう！！！劇もみんなで大成功させよう！！");
console.log("code by たいが, CSS partly generated with AI (Claude Code)");
console.log("Thanks Claude Code!");
console.log("バックスラッシュが仕様上¥と表示されてしまいます;;まぁしょうがないですね。");