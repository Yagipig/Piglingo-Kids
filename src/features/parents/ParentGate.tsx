import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PARENT_STORAGE_KEYS } from './types';

/**
 * Cổng xác thực "người lớn": chỉ mở khu vực phụ huynh khi trả lời đúng một
 * phép tính ngẫu nhiên (ví dụ 27 + 14 = ?). Bé 7 tuổi khó qua được, người lớn
 * thì làm trong vài giây — cách làm phổ biến của các app trẻ em.
 *
 * Sau khi mở, phiên được lưu bằng AsyncStorage trong `sessionMinutes` phút
 * (mặc định 10) để phụ huynh không phải tính lại liên tục.
 */

const DEFAULT_SESSION_MINUTES = 10;

interface ParentSession {
  unlockedUntil: number; // epoch ms
}

async function readSession(): Promise<ParentSession | null> {
  try {
    const raw = await AsyncStorage.getItem(PARENT_STORAGE_KEYS.session);
    return raw ? (JSON.parse(raw) as ParentSession) : null;
  } catch {
    return null;
  }
}

/** Kiểm tra phiên phụ huynh còn hiệu lực không (dùng ngoài component khi cần). */
export async function isParentSessionActive(): Promise<boolean> {
  const session = await readSession();
  return !!session && session.unlockedUntil > Date.now();
}

/** Khóa ngay khu vực phụ huynh (xóa phiên). */
export async function lockParentSession(): Promise<void> {
  await AsyncStorage.removeItem(PARENT_STORAGE_KEYS.session);
}

function newChallenge(): { a: number; b: number } {
  // Cộng hai số có tổng phải nhớ (khó với bé, dễ với người lớn).
  const a = 12 + Math.floor(Math.random() * 37); // 12–48
  const b = 7 + Math.floor(Math.random() * 23); // 7–29
  return { a, b };
}

interface ParentGateProps {
  /** Thời gian phiên mở khóa, mặc định 10 phút. */
  sessionMinutes?: number;
  /** Nội dung khu vực phụ huynh, chỉ hiển thị sau khi mở khóa. */
  children: ReactNode;
  /** Gọi mỗi khi mở khóa thành công. */
  onUnlocked?: () => void;
}

export function ParentGate({
  sessionMinutes = DEFAULT_SESSION_MINUTES,
  children,
  onUnlocked,
}: ParentGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [challenge, setChallenge] = useState(newChallenge);
  const [answer, setAnswer] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setIsUnlocked(await isParentSessionActive());
      setIsCheckingSession(false);
    })();
  }, []);

  const submit = useCallback(async () => {
    const expected = challenge.a + challenge.b;
    if (Number.parseInt(answer, 10) === expected) {
      const session: ParentSession = {
        unlockedUntil: Date.now() + sessionMinutes * 60 * 1000,
      };
      await AsyncStorage.setItem(PARENT_STORAGE_KEYS.session, JSON.stringify(session));
      setIsUnlocked(true);
      setErrorText(null);
      onUnlocked?.();
    } else {
      setErrorText('Chưa đúng rồi, ba/mẹ thử lại nhé.');
      setAnswer('');
      setChallenge(newChallenge());
    }
  }, [answer, challenge, onUnlocked, sessionMinutes]);

  if (isCheckingSession) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Đang kiểm tra…</Text>
      </View>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>Khu vực dành cho ba/mẹ</Text>
      <Text style={styles.hint}>Ba/mẹ trả lời giúp câu hỏi này để mở khóa:</Text>
      <Text style={styles.question}>
        {challenge.a} + {challenge.b} = ?
      </Text>
      <TextInput
        style={styles.input}
        value={answer}
        onChangeText={setAnswer}
        keyboardType="number-pad"
        placeholder="Nhập kết quả"
        placeholderTextColor="#999999"
        onSubmitEditing={() => void submit()}
        accessibilityLabel="Nhập kết quả phép tính"
      />
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => void submit()}
        style={({ pressed }: { pressed: boolean }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>Mở khóa</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: '800', color: '#1B1B1B', textAlign: 'center' },
  hint: { fontSize: 17, color: '#555555', textAlign: 'center' },
  question: { fontSize: 36, fontWeight: '800', color: '#208AEF' },
  input: {
    minWidth: 200,
    borderWidth: 2,
    borderColor: '#208AEF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    textAlign: 'center',
    color: '#1B1B1B',
    backgroundColor: '#FFFFFF',
  },
  error: { fontSize: 16, color: '#B3261E' },
  button: { backgroundColor: '#208AEF', borderRadius: 999, paddingHorizontal: 32, paddingVertical: 14 },
  buttonLabel: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});
