/**
 * Route khu vực phụ huynh (/parents) — tích hợp Bước 2.
 *
 * Dùng adapter THẬT (parentProgressSource, đọc zustand store của app) thay cho
 * DEV_SAMPLE_SNAPSHOT của route mẫu trong src/app-examples/.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { ParentAreaScreen } from '@/features/parents/ParentAreaScreen';
import { parentProgressSource } from '@/lib/parentProgress';

export default function ParentsRoute() {
  const router = useRouter();
  return (
    <ParentAreaScreen
      progressSource={parentProgressSource}
      onOpenAccount={() => router.push('/account')}
    />
  );
}
