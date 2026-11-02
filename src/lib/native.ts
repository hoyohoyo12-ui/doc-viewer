import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface IncomingInfo {
  path?: string;
  name?: string;
  mime?: string;
  error?: string;
}
interface IncomingFilePlugin {
  getPending(): Promise<IncomingInfo>;
  addListener(event: 'fileOpened', cb: (info: IncomingInfo) => void): Promise<PluginListenerHandle>;
}

const IncomingFile = registerPlugin<IncomingFilePlugin>('IncomingFile');
export const isNative = Capacitor.isNativePlatform();

async function toFile(info: IncomingInfo): Promise<File | null> {
  if (info.error) {
    alert(`파일을 열 수 없습니다: ${info.error}`);
    return null;
  }
  if (!info.path) return null;
  const res = await fetch(Capacitor.convertFileSrc(info.path));
  const blob = await res.blob();
  return new File([blob], info.name ?? 'document', { type: info.mime || blob.type });
}

/** 안드로이드 앱: 다른 앱에서 '연결 프로그램/공유'로 넘어온 파일을 받는다 */
export function listenNativeFiles(open: (f: File) => void): () => void {
  if (!isNative) return () => {};
  let handle: PluginListenerHandle | null = null;
  IncomingFile.addListener('fileOpened', async (info) => {
    const f = await toFile(info);
    if (f) open(f);
  }).then((h) => (handle = h));
  IncomingFile.getPending().then(async (info) => {
    const f = await toFile(info);
    if (f) open(f);
  });
  return () => handle?.remove();
}
