/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// 앱 파일을 미리 저장 → 인터넷이 없어도 실행됨
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 한글 엔진(약 12MB)은 처음 한글 파일을 열 때 한 번만 받아 저장 → 이후 오프라인 사용 가능
registerRoute(({ url }) => url.pathname.endsWith('.wasm'), new CacheFirst({ cacheName: 'engines' }));

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// 다른 앱의 '공유하기' → 문서뷰어 로 들어온 파일을 받아 IndexedDB에 넣고 앱을 연다
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(
      (async () => {
        const form = await event.request.formData();
        const file = form.get('file');
        if (file instanceof File) await putShared(file);
        return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
      })(),
    );
  }
});

function putShared(file: File): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.open('docviewer', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('recent')) db.createObjectStore('recent', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('shared')) db.createObjectStore('shared');
    };
    req.onsuccess = () => {
      const t = req.result.transaction('shared', 'readwrite');
      t.objectStore('shared').put({ name: file.name, type: file.type, data: file }, 'last');
      t.oncomplete = () => resolve();
      t.onerror = () => resolve();
    };
    req.onerror = () => resolve();
  });
}
