import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const BASE = import.meta.env.BASE_URL;

interface Props {
  file: File;
  zoom: number;
  onPages?: (n: number) => void;
}

export default function PdfViewer({ file, zoom, onPages }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [error, setError] = useState('');
  const [needPw, setNeedPw] = useState<((pw: string) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const task = pdfjs.getDocument({
          data,
          cMapUrl: `${BASE}pdfjs/cmaps/`, // 한글 CID 폰트 PDF에 필요
          cMapPacked: true,
          standardFontDataUrl: `${BASE}pdfjs/standard_fonts/`,
        });
        loadingTask = task;
        task.onPassword = (update: (pw: string) => void) => {
          if (!cancelled) setNeedPw(() => update);
        };
        const d = await task.promise;
        if (cancelled) return;
        setNeedPw(null);
        const first = await d.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        // 우선 1페이지 크기로 자리만 잡고, 실제 크기는 렌더 때 보정
        setSizes(Array.from({ length: d.numPages }, () => ({ w: vp.width, h: vp.height })));
        setDoc(d);
        onPages?.(d.numPages);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [file, onPages]);

  if (error) return <div className="msg error">PDF를 열 수 없습니다: {error}</div>;
  if (needPw)
    return (
      <form
        className="msg"
        onSubmit={(e) => {
          e.preventDefault();
          const pw = (e.currentTarget.elements.namedItem('pw') as HTMLInputElement).value;
          needPw(pw);
        }}
      >
        <p>암호가 걸린 PDF입니다.</p>
        <input name="pw" type="password" placeholder="비밀번호" autoFocus className="pw" />
        <button className="btn primary">열기</button>
      </form>
    );
  if (!doc) return <div className="msg">불러오는 중…</div>;

  return (
    <div className="pdf-pages">
      {sizes.map((s, i) => (
        <PdfPage key={i} doc={doc} index={i + 1} zoom={zoom} est={s} />
      ))}
    </div>
  );
}

function PdfPage({ doc, index, zoom, est }: { doc: PDFDocumentProxy; index: number; zoom: number; est: { w: number; h: number } }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState(est);

  // 화면 근처에 왔을 때만 그린다 (수백 페이지 PDF도 가볍게)
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const page = await doc.getPage(index);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setSize({ w: base.width, h: base.height });
      const avail = Math.min(window.innerWidth - 16, 1000);
      const cssScale = (avail / base.width) * zoom;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const vp = page.getViewport({ scale: cssScale * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      task = page.render({ canvas, viewport: vp });
      try {
        await task.promise;
      } catch {
        /* 취소됨 */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, index, zoom]);

  const avail = Math.min(window.innerWidth - 16, 1000);
  const w = avail * zoom;
  const h = (w * size.h) / size.w;
  return (
    <div ref={holder} className="page" style={{ width: w, height: h }} data-page={index}>
      {visible && <canvas ref={canvasRef} style={{ width: w, height: h }} />}
      <span className="page-no">{index}</span>
    </div>
  );
}
