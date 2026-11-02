import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ACCEPT, BADGE, kindOf, type Kind } from './lib/fileTypes';
import { listenNativeFiles } from './lib/native';
import { clearRecent, formatSize, listRecent, removeRecent, saveRecent, takeSharedFile, type RecentDoc } from './lib/storage';

// 형식별 뷰어는 필요할 때만 불러와 첫 실행을 빠르게
const PdfViewer = lazy(() => import('./viewers/PdfViewer'));
const DocxViewer = lazy(() => import('./viewers/DocxViewer'));
const SheetViewer = lazy(() => import('./viewers/SheetViewer'));
const PptxViewer = lazy(() => import('./viewers/PptxViewer'));
const HangulViewer = lazy(() => import('./viewers/HangulViewer'));
const TextViewer = lazy(() => import('./viewers/SimpleViewers').then((m) => ({ default: m.TextViewer })));
const ImageViewer = lazy(() => import('./viewers/SimpleViewers').then((m) => ({ default: m.ImageViewer })));

declare global {
  interface Window {
    launchQueue?: { setConsumer: (cb: (p: { files: FileSystemFileHandle[] }) => void) => void };
  }
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [recent, setRecent] = useState<RecentDoc[]>([]);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [pages, setPages] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => listRecent().then(setRecent), []);

  const open = useCallback(
    async (f: File) => {
      setZoom(1);
      setPages(0);
      setFile(f);
      history.pushState({ viewing: true }, '');
      await saveRecent(f);
      refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    // 1) 다른 앱에서 '공유하기'로 보낸 파일 (안드로이드)
    if (location.search.includes('shared=1')) {
      history.replaceState(null, '', location.pathname);
      takeSharedFile().then((f) => f && open(f));
    }
    // 2) PC 크롬/엣지에서 '연결 프로그램'으로 연 파일
    window.launchQueue?.setConsumer(async ({ files }) => {
      if (files?.[0]) open(await files[0].getFile());
    });
    // 3) 안드로이드 앱: 파일앱/카톡의 '연결 프로그램'·'공유'
    const stopNative = listenNativeFiles(open);
    // 뒤로가기 버튼 → 목록으로
    const onPop = () => setFile(null);
    window.addEventListener('popstate', onPop);
    return () => {
      stopNative();
      window.removeEventListener('popstate', onPop);
    };
  }, [open, refresh]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) open(f);
    e.target.value = '';
  };

  if (file) {
    const kind = kindOf(file.name, file.type);
    return (
      <div className="viewer">
        <header className="bar">
          <button className="icon-btn" onClick={() => history.back()} aria-label="뒤로">
            ←
          </button>
          <div className="title">
            <Badge kind={kind} />
            <span className="name">{file.name}</span>
            {pages > 0 && <span className="meta">{pages}쪽</span>}
          </div>
          <div className="zoom">
            <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="축소">
              −
            </button>
            <button className="zoom-val" onClick={() => setZoom(1)}>
              {Math.round(zoom * 100)}%
            </button>
            <button className="icon-btn" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="확대">
              +
            </button>
          </div>
        </header>
        <main className="doc">
          <Suspense fallback={<div className="msg">불러오는 중…</div>}>
            <DocBody kind={kind} file={file} zoom={zoom} onPages={setPages} />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div
      className={dragging ? 'home dragging' : 'home'}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) open(f);
      }}
    >
      <header className="hero">
        <div className="logo">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={40} height={40} />
          <div>
            <h1>문서뷰어</h1>
            <p>광고 없이, 내 폰 안에서만 열어요</p>
          </div>
        </div>
      </header>

      <button className="open-card" onClick={() => inputRef.current?.click()}>
        <span className="plus">＋</span>
        <span>
          <strong>파일 열기</strong>
          <small>PDF · 한글(HWP/HWPX) · 워드 · 엑셀 · PPT · TXT · 이미지</small>
        </span>
      </button>
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={onPick} hidden />

      <section className="recent">
        <div className="recent-head">
          <h2>최근 문서</h2>
          {recent.length > 0 && (
            <button
              className="link"
              onClick={async () => {
                if (confirm('최근 문서 목록을 모두 지울까요?')) {
                  await clearRecent();
                  refresh();
                }
              }}
            >
              모두 지우기
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="empty">
            아직 연 문서가 없어요.
            <br />
            카톡·파일앱에서 <b>공유 → 문서뷰어</b>를 눌러도 바로 열립니다.
          </p>
        ) : (
          <ul>
            {recent.map((r) => (
              <li key={r.id}>
                <button
                  className="recent-item"
                  onClick={() => open(new File([r.data], r.name, { type: r.type }))}
                >
                  <Badge kind={kindOf(r.name, r.type)} />
                  <span className="r-text">
                    <span className="r-name">{r.name}</span>
                    <span className="r-meta">
                      {formatSize(r.size)} · {new Date(r.openedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </span>
                </button>
                <button
                  className="icon-btn del"
                  aria-label="목록에서 삭제"
                  onClick={async () => {
                    await removeRecent(r.id);
                    refresh();
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer className="foot">파일은 서버로 전송되지 않고 기기 안에서만 처리됩니다.</footer>
    </div>
  );
}

function DocBody({ kind, file, zoom, onPages }: { kind: Kind; file: File; zoom: number; onPages: (n: number) => void }) {
  switch (kind) {
    case 'pdf':
      return <PdfViewer file={file} zoom={zoom} onPages={onPages} />;
    case 'docx':
      return <DocxViewer file={file} zoom={zoom} />;
    case 'sheet':
      return <SheetViewer file={file} zoom={zoom} />;
    case 'pptx':
      return <PptxViewer file={file} zoom={zoom} />;
    case 'hwp':
    case 'hwpx':
      return <HangulViewer file={file} zoom={zoom} isHwpx={kind === 'hwpx'} onPages={onPages} />;
    case 'text':
      return <TextViewer file={file} zoom={zoom} />;
    case 'image':
      return <ImageViewer file={file} zoom={zoom} />;
    default:
      return <div className="msg error">지원하지 않는 형식입니다: {file.name}</div>;
  }
}

function Badge({ kind }: { kind: Kind }) {
  const b = BADGE[kind];
  return (
    <span className="badge" style={{ background: b.color }}>
      {b.label}
    </span>
  );
}
