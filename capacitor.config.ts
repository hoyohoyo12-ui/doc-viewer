import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.docviewer.noads', // 플레이스토어 고유 ID — 출시 전 원하는 값으로 바꾸고, 출시 후엔 변경 불가
  appName: '문서뷰어',
  webDir: 'dist',
  android: { allowMixedContent: false },
};

export default config;
