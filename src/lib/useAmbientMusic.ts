import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useEffect } from "react";

import { useProgress } from "./store";

/**
 * Nhạc nền khu vườn (assets/sfx/ambient-garden.mp3 — bản nhạc tự tổng
 * hợp bằng scripts/make-ambient-music.py, vòng lặp 48 giây).
 *
 * - Chỉ phát khi `musicOn` trong store = true. Player chỉ được tạo ở lần
 *   bật đầu tiên — tức luôn sau một tương tác của người dùng (bấm công
 *   tắc), nên không vi phạm chính sách autoplay của trình duyệt web.
 * - Loop vô hạn, âm lượng vừa phải; tắt công tắc là dừng ngay.
 * - Hook này được gọi ở màn hình học (màn hình chính); rời màn hình thì
 *   nhạc dừng để không phát chồng sang các màn hình khác.
 */

let player: AudioPlayer | null = null;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(require("@/assets/sfx/ambient-garden.mp3"));
    player.loop = true;
    player.volume = 0.5;
  }
  return player;
}

export function useAmbientMusic(): void {
  const musicOn = useProgress((s) => s.musicOn);

  useEffect(() => {
    if (musicOn) {
      try {
        getPlayer().play();
      } catch {
        // Thiết bị không phát được (ví dụ chưa có tương tác trên web): bỏ qua.
      }
    } else if (player) {
      player.pause();
    }
  }, [musicOn]);

  useEffect(
    () => () => {
      player?.pause();
    },
    []
  );
}
