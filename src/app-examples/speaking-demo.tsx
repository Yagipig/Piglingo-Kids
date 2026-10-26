/**
 * ROUTE MẪU để chạy thử tính năng luyện nói độc lập — copy thành
 * `src/app/speaking-demo.tsx` trong project gốc, mở app và vào /speaking-demo.
 *
 * Khi nhúng vào bài học thật, không dùng route này: render
 * <SpeakingPracticeScreen targetText={...} language={...} /> ngay trong
 * màn hình bài học và truyền câu mẫu từ content pack (xem INTEGRATION.md mục 3.3).
 * Xóa route demo này khỏi bản phát hành.
 */
import React from 'react';
import { SpeakingPracticeScreen } from '../features/speaking/SpeakingPracticeScreen';

export default function SpeakingDemoRoute() {
  return (
    <SpeakingPracticeScreen
      targetText="Hello, piggy!"
      hintText="Xin chào, heo con!"
      language="en"
    />
  );
}
