// 최근 문서를 기기 안(IndexedDB)에만 저장한다. 서버로 전송하지 않는다.
const DB_NAME = 'docviewer';
const STORE = 'recent';
const MAX_RECENT = 15;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB 넘는 파일은 최근 목록에 저장하지 않음

export interface RecentDoc {
  id: string;
  name: string;
  type: string;
  size: number;
  openedAt: number;
  data: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('shared')) db.createObjectStore('shared');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
      }),
  );
}

export async function listRecent(): Promise<RecentDoc[]> {
  try {
    const all = await tx<RecentDoc[]>(STORE, 'readonly', (s) => s.getAll() as IDBRequest<RecentDoc[]>);
    return all.sort((a, b) => b.openedAt - a.openedAt);
  } catch {
    return [];
  }
}

export async function saveRecent(file: File): Promise<void> {
  if (file.size > MAX_SIZE) return;
  try {
    const id = `${file.name}__${file.size}`;
    await tx(STORE, 'readwrite', (s) =>
      s.put({ id, name: file.name, type: file.type, size: file.size, openedAt: Date.now(), data: file }),
    );
    const all = await listRecent();
    for (const old of all.slice(MAX_RECENT)) await removeRecent(old.id);
  } catch {
    /* 저장 실패해도 보기는 계속 */
  }
}

export async function removeRecent(id: string): Promise<void> {
  try {
    await tx(STORE, 'readwrite', (s) => s.delete(id));
  } catch {
    /* noop */
  }
}

export async function clearRecent(): Promise<void> {
  try {
    await tx(STORE, 'readwrite', (s) => s.clear());
  } catch {
    /* noop */
  }
}

/** 서비스워커가 '공유하기'로 받은 파일을 꺼낸다 */
export async function takeSharedFile(): Promise<File | null> {
  try {
    const rec = await tx<{ name: string; type: string; data: Blob } | undefined>('shared', 'readonly', (s) =>
      s.get('last'),
    );
    if (!rec) return null;
    await tx('shared', 'readwrite', (s) => s.delete('last'));
    return new File([rec.data], rec.name, { type: rec.type });
  } catch {
    return null;
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
