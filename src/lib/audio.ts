import {
  createAudioPlayer,
  setAudioModeAsync,
  useAudioPlayer,
  type AudioPlayer,
} from "expo-audio";
import * as Speech from "expo-speech";

import { audioManifest } from "../content/audio-manifest";
import { realAudioManifest } from "../content/real-audio-manifest";
import { getPack } from "./content";

setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

const TTS_LOCALES: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

let voicePlayer: AudioPlayer | null = null;
let realVoicePlayer: AudioPlayer | null = null;

/** Từ này có bản ghi giọng người thật (Lingua Libre) hay không. */
export function hasRealVoice(courseId: string, text: string): boolean {
  return realAudioManifest[`${courseId}:${text}`] != null;
}

/**
 * Phát bản ghi giọng người thật của đúng một từ, tách riêng khỏi TTS:
 * chỉ phát khi manifest giọng thật có key `${courseId}:${text}`; không
 * có thì trả false để nơi gọi giữ nguyên luồng TTS như cũ.
 */
export function speakRealVoice(courseId: string, text: string): boolean {
  const source = realAudioManifest[`${courseId}:${text}`];
  if (source == null) return false;
  Speech.stop();
  if (!realVoicePlayer) realVoicePlayer = createAudioPlayer(source);
  else realVoicePlayer.replace(source);
  realVoicePlayer.seekTo(0).catch(() => {});
  realVoicePlayer.play();
  return true;
}

export function speakTarget(courseId: string, text: string) {
  Speech.stop();
  const key = `${courseId}:${text}`;
  const source = audioManifest[key];
  if (source) {
    if (!voicePlayer) voicePlayer = createAudioPlayer(source);
    else voicePlayer.replace(source);
    voicePlayer.seekTo(0).catch(() => {});
    voicePlayer.play();
    return;
  }
  const pack = getPack(courseId);
  const locale = TTS_LOCALES[pack.targetCode] ?? "en-US";
  Speech.speak(text, { language: locale, rate: 0.9 });
}

export function useSfx() {
  const correct = useAudioPlayer(require("@/assets/sfx/correct.wav"));
  const incorrect = useAudioPlayer(require("@/assets/sfx/incorrect.wav"));
  const finish = useAudioPlayer(require("@/assets/sfx/finish.mp3"));

  const play = (player: ReturnType<typeof useAudioPlayer>) => {
    player.seekTo(0).catch(() => {});
    player.play();
  };

  return {
    playCorrect: () => play(correct),
    playIncorrect: () => play(incorrect),
    playFinish: () => play(finish),
  };
}
