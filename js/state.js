// 共通設定・固定音声・共有状態を管理
"use strict";

/** 固定登録の音声データ
 * 例
 * bgm: [
 *   { title: "サザエさん", description: "エンディングの", file: "サザエさん.mp3" },
 *     名前        　　　　　　説明　　　　　　　　　　　　ファイル名（一文字でも違ったら認識しません）
 * ]
 *
 * soundEffectsも同様
**/
const audioLibrary = {
  bgm: [
    { title: "オープニングBGM", description: "オープニング", file: "日常(トリッカル).mp3" },
    { title: "10年後、仲間集め前まで", description: "10年後、仲間集め前まで", file: "10年後、仲間集めの前まで.m4a" },
    { title: "仲間集め", description: "仲間集めのBGM", file: "仲間集め.m4a" },
    { title: "特訓", description: "特訓のBGM", file: "特訓.m4a" },
    { title: "鬼が島", description: "鬼が島のBGM", file: "鬼が島.m4a" },
    { title: "最終決戦（おじおば）", description: "最終決戦（おじおば）", file: "最終決戦（おじおば）.m4a" },
    { title: "おっぱいあげてEND", description: "おっぱいあげてEND", file: "おっぱいあげてEND.m4a" },
    { title: "サザエさん", description: "エンディングの", file: "サザエさん.mp3" },
    { title: "爆破オチ", description: "爆発します", file: "爆破オチ（ドリフ）.mp3" }
  ],
  soundEffects: [
    { title: "殴ったりするときの", description: "ドンッ！", file: "重いパンチ1.mp3" },
    { title: "戦うときの", description: "ジャキッ！", file: "剣で斬る1.mp3" },
    { title: "戦うときの2", description: "ジャキッ！2", file: "剣で斬る3.mp3" },
    { title: "戦うときの3", description: "ジャキッ！3", file: "剣で斬る5.mp3" },
    { title: "桃太郎生まれた時用？", description: "ジャジャーン！", file: "ジャジャーン.mp3" },
    { title: "ドアチャイム", description: "ピンポーン！", file: "ドアチャイム2.mp3" },
    { title: "速報", description: "てててーん！", file: "速報.mp3" },
    { title: "仲間GET", description: "歓声！", file: "歓声と拍手.mp3"}
  ]
};

// ブラウザに保存する設定や音声データを識別するための名前
const THEME_STORAGE_KEY = "stage-sounds-theme-color";
const AUDIO_DATABASE_NAME = "stage-sounds-audio";
const AUDIO_STORE_NAME = "tracks";
const SHORTCUT_STORE_NAME = "shortcuts";
const ORDER_STORE_NAME = "orders";
// 再生中のAudioと、画面に表示する再生カードを対応付けて管理する
const audioInstances = new Map();
let selectedAudioFiles = [];
let selectedAudioCategory = "bgm";
let audioDatabasePromise;
let trackWaitingForShortcut = null;
let draggedTrack = null;

const bgmList = document.querySelector("#bgm-list");
const effectsList = document.querySelector("#effects-list");
const bgmFilePicker = document.querySelector("#bgm-file-picker");
const effectsFilePicker = document.querySelector("#effects-file-picker");
const audioImportDialog = document.querySelector("#audio-import-dialog");
const importFileList = document.querySelector("#import-file-list");
const importTitle = document.querySelector("#import-title");
const importKicker = document.querySelector("#import-kicker");
const importStatus = document.querySelector("#import-status");
const themePicker = document.querySelector("#theme-color");
const playbackStatus = document.querySelector("#playback-status");
const stopAllButton = document.querySelector("#stop-all");
const helpDialog = document.querySelector("#help-dialog");
const termsDialog = document.querySelector("#terms-dialog");
const addBgmButton = document.querySelector("#add-bgm");
const addEffectButton = document.querySelector("#add-effect");
const playbackDock = document.querySelector("#playback-dock");
const activePlaybacks = document.querySelector("#active-playbacks");
