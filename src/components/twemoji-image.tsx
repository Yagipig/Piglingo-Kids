import React from "react";
import { Image, Text, type ImageStyle, type StyleProp } from "react-native";

import { TWEMOJI_ASSETS } from "@/content/twemoji-assets";

/**
 * Minh họa Twemoji cho một emoji (Đợt 2 tích hợp nguồn mở).
 *
 * - Nếu emoji có PNG Twemoji đóng gói local trong `assets/twemoji/`
 *   (xem `src/content/twemoji-assets.ts`, sinh bởi
 *   `scripts/build-integration2-media.mjs`) thì render bằng ảnh đó —
 *   graphics Twemoji, giấy phép CC BY 4.0.
 * - Nếu không có asset (emoji không có trong bộ Twemoji, ví dụ các số
 *   khoanh tròn ⑪–⑯/⑳) thì fallback render emoji hệ thống bằng Text,
 *   giữ nguyên hành vi hiển thị cũ.
 *
 * Điểm dùng dự kiến (điều phối viên nối dây): thay đúng một điểm render
 * emoji của từ ở Sổ tay (`src/app/guidebook/[unitId].tsx`) — component
 * này tự lo cả hai trường hợp nên nơi gọi không cần rẽ nhánh.
 */
export function TwemojiImage({
  emoji,
  size = 20,
  style,
}: {
  emoji: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const source = TWEMOJI_ASSETS[emoji];
  if (!source) {
    return (
      <Text
        style={{ fontSize: size, lineHeight: size * 1.2 }}
        maxFontSizeMultiplier={1.3}
      >
        {emoji}
      </Text>
    );
  }
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel={emoji}
    />
  );
}

export default TwemojiImage;
