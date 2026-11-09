import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * Lớp BỔ TRỢ quanh thẻ CHI TIẾT TỪ (WordMeta + nút Nghe giọng thật +
 * ảnh Twemoji) ở Luyện Đọc / Luyện Nghe / Sổ tay.
 *
 * Bối cảnh: sự cố 09/11/2026 — một named import bị "treo" trên nhánh
 * (real-voice-button import hasRealVoice mà bản lib/audio trên nhánh
 * chưa có) khiến render chi tiết từ throw TypeError và, vì không có
 * error boundary nào, React gỡ TOÀN BỘ cây -> trắng màn hình. Bản sửa
 * GỐC là khôi phục đúng nội dung file + test test-import-exports.mjs
 * chốt chặn import treo; boundary này CHỈ là lưới an toàn thêm: nếu
 * sau này một lỗi render bất kỳ xảy ra trong thẻ chi tiết, bé thấy một
 * hộp báo thân thiện kèm nút Thử lại thay vì mất cả màn hình. Lỗi vẫn
 * được console.error để còn dấu vết debug, không nuốt im lặng.
 */
type Props = { children: React.ReactNode };
type State = { failed: boolean };

export class WordDetailBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[WordDetailBoundary] lỗi render chi tiết từ:", error);
  }

  private reset = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.box} accessibilityRole="alert">
        <Text style={styles.text} maxFontSizeMultiplier={1.3}>
          🙈 Ôi, chi tiết của từ này chưa mở được. Bé bấm Thử lại hoặc chọn
          từ khác nhé!
        </Text>
        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Thử mở lại chi tiết từ"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.buttonText} maxFontSizeMultiplier={1.3}>
            Thử lại
          </Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#fff7ed",
    borderWidth: 2,
    borderColor: "#fdba74",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#9a3412",
    textAlign: "center",
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
});
