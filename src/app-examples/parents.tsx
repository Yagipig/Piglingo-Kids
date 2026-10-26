/**
 * ROUTE MẪU cho expo-router — copy file này thành `src/app/parents.tsx`
 * trong project gốc (đường dẫn import giữ nguyên nếu project dùng
 * src/app + src/features cùng cấp như gói này).
 *
 * ⚠️ Bản dưới đây dùng DEV_SAMPLE_SNAPSHOT để chạy thử giao diện ngay.
 * Khi nối store thật, thay `progressSource` bằng adapter bọc zustand store
 * của app (xem INTEGRATION.md mục 4.2) và xóa import DEV_SAMPLE_SNAPSHOT.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { ParentAreaScreen } from '../features/parents/ParentAreaScreen';
import {
  createStaticProgressSource,
  DEV_SAMPLE_SNAPSHOT,
} from '../features/parents/progressAdapter';

const progressSource = createStaticProgressSource(DEV_SAMPLE_SNAPSHOT);

export default function ParentsRoute() {
  const router = useRouter();
  return (
    <ParentAreaScreen
      progressSource={progressSource}
      onOpenAccount={() => router.push('/account')}
    />
  );
}
