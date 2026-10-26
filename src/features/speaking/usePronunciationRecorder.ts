import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

/**
 * Hook ghi âm + phát lại cho màn hình luyện nói, dùng API hiện hành của
 * expo-audio (Expo SDK 56):
 *  - `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` tạo recorder
 *  - `useAudioRecorderState(recorder)` lấy trạng thái (isRecording, durationMillis)
 *  - `AudioModule.requestRecordingPermissionsAsync()` xin quyền micro
 *  - `setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })`
 *  - ghi âm xong, file nằm ở `recorder.uri`
 *  - phát lại bằng `useAudioPlayer()` + `player.replace({ uri })` + `player.play()`
 *
 * Tài liệu tham chiếu: https://docs.expo.dev/versions/latest/sdk/audio/
 */

export type RecorderPermission = 'unknown' | 'granted' | 'denied';

export interface UsePronunciationRecorder {
  isRecording: boolean;
  /** Thời lượng đang ghi, cập nhật liên tục (ms). */
  durationMillis: number;
  /** URI file ghi âm gần nhất, null nếu chưa ghi lần nào. */
  recordingUri: string | null;
  /** Thời lượng của bản ghi gần nhất (ms). */
  lastDurationMillis: number;
  permission: RecorderPermission;
  errorMessage: string | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<{ uri: string | null; durationMillis: number } | null>;
  playRecording: () => void;
  requestPermission: () => Promise<boolean>;
}

export function usePronunciationRecorder(): UsePronunciationRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer();

  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [lastDurationMillis, setLastDurationMillis] = useState(0);
  const [permission, setPermission] = useState<RecorderPermission>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermission(status.granted ? 'granted' : 'denied');
      if (!status.granted) {
        setErrorMessage(
          'Chưa được cấp quyền micro. Ba/mẹ hãy bật quyền micro cho Piglingo Kids trong phần Cài đặt của máy nhé.',
        );
      }
      return status.granted;
    } catch {
      setPermission('denied');
      setErrorMessage('Máy chưa sẵn sàng để ghi âm. Hãy thử lại nhé.');
      return false;
    }
  }, []);

  // Xin quyền + cấu hình audio session ngay khi màn hình luyện nói mở ra.
  useEffect(() => {
    void (async () => {
      const current = await AudioModule.getRecordingPermissionsAsync();
      if (current.granted) {
        setPermission('granted');
      } else {
        await requestPermission();
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    })();
  }, [requestPermission]);

  // Khi có bản ghi mới, nạp vào player để bé nghe lại giọng của mình.
  useEffect(() => {
    if (recordingUri) {
      player.replace({ uri: recordingUri });
    }
    // player là object ổn định của expo-audio, chỉ chạy lại khi đổi URI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingUri]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);
    if (permission !== 'granted') {
      const ok = await requestPermission();
      if (!ok) return false;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      await recorder.record();
      startedAtRef.current = Date.now();
      return true;
    } catch {
      setErrorMessage('Chưa ghi âm được. Ba/mẹ kiểm tra micro rồi thử lại nhé.');
      return false;
    }
  }, [permission, recorder, requestPermission]);

  const stopRecording = useCallback(async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri ?? null;
      const durationMillis =
        recorderState.durationMillis > 0
          ? recorderState.durationMillis
          : startedAtRef.current
            ? Date.now() - startedAtRef.current
            : 0;
      startedAtRef.current = null;
      setRecordingUri(uri);
      setLastDurationMillis(durationMillis);
      // Trả audio session về chế độ phát để nghe lại / nghe mẫu TTS rõ ràng.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      return { uri, durationMillis };
    } catch {
      setErrorMessage('Chưa lưu được bản ghi. Hãy thử ghi lại nhé.');
      return null;
    }
  }, [recorder, recorderState.durationMillis]);

  const playRecording = useCallback(() => {
    if (!recordingUri) return;
    player.seekTo(0);
    player.play();
  }, [player, recordingUri]);

  return {
    isRecording: recorderState.isRecording,
    durationMillis: recorderState.durationMillis,
    recordingUri,
    lastDurationMillis,
    permission,
    errorMessage,
    startRecording,
    stopRecording,
    playRecording,
    requestPermission,
  };
}
