import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from './AuthContext';

/**
 * Màn hình tài khoản phụ huynh hoàn chỉnh: đăng nhập / đăng ký / đăng xuất
 * bằng email. Tự hiển thị trạng thái "đang tắt" khi chưa cấu hình Supabase.
 */
export function AuthScreen() {
  const { isEnabled, isLoading, user, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>☁️</Text>
        <Text style={styles.title}>Đồng bộ đám mây đang tắt</Text>
        <Text style={styles.body}>
          App vẫn lưu tiến độ trên máy này như bình thường. Muốn bật tài khoản và đồng bộ, ba/mẹ
          tạo project Supabase, chạy file schema.sql và điền hai biến trong file .env (xem
          README-STEP2.md).
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Đang kiểm tra đăng nhập…</Text>
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.title}>Đã đăng nhập</Text>
        <Text style={styles.body}>{user.email}</Text>
        <Text style={styles.body}>
          Tiến độ học của bé sẽ được đồng bộ với tài khoản này khi app đồng bộ (xem hướng dẫn nối
          nút đồng bộ trong INTEGRATION.md).
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={({ pressed }: { pressed: boolean }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryLabel}>Đăng xuất</Text>
        </Pressable>
      </View>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const result =
      mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
    } else if (mode === 'signUp') {
      setMessage(
        'Đã tạo tài khoản. Nếu Supabase bật xác thực email, ba/mẹ mở hộp thư để xác thực rồi quay lại đăng nhập nhé.',
      );
      setMode('signIn');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>👨‍👩‍👧</Text>
      <Text style={styles.title}>Tài khoản phụ huynh</Text>
      <Text style={styles.body}>
        Tài khoản này của ba/mẹ, dùng để đồng bộ tiến độ học của bé giữa các máy.
      </Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email của ba/mẹ"
        placeholderTextColor="#999999"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="Email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Mật khẩu"
        placeholderTextColor="#999999"
        secureTextEntry
        autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
        accessibilityLabel="Mật khẩu"
      />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy || !email || !password}
        onPress={() => void submit()}
        style={({ pressed }: { pressed: boolean }) => [
          styles.primaryButton,
          (busy || !email || !password) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryLabel}>
          {busy ? 'Đang xử lý…' : mode === 'signIn' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          setMessage(null);
        }}
        style={styles.switchButton}
      >
        <Text style={styles.switchLabel}>
          {mode === 'signIn' ? 'Chưa có tài khoản? Tạo tài khoản mới' : 'Đã có tài khoản? Đăng nhập'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12, alignItems: 'stretch', justifyContent: 'center' },
  emoji: { fontSize: 48, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: '#1B1B1B' },
  body: { fontSize: 17, color: '#555555', textAlign: 'center', lineHeight: 25 },
  input: {
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 18,
    color: '#1B1B1B',
    backgroundColor: '#FFFFFF',
  },
  message: { fontSize: 16, color: '#B3261E', textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#208AEF',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryLabel: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#B3261E',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryLabel: { fontSize: 18, fontWeight: '700', color: '#B3261E' },
  switchButton: { paddingVertical: 8, alignItems: 'center' },
  switchLabel: { fontSize: 16, color: '#208AEF', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
