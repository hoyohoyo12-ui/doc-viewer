import { useEffect, useRef, useState } from 'react';
import init, { HwpDocument } from '@rhwp/core';
import wasmUrl from '@rhwp/core/rhwp_bg.wasm?url';
import HwpLegacyViewer from './HwpViewer';
import HwpxSimpleViewer from './HwpxViewer';

/**
 * 한글 문서(.hwp / .hwpx) 뷰어 — rhwp(MIT, Rust+WebAssembly) 엔진으로 실제 쪽 모양 그대로 SVG 렌더링.
 * 엔진이 실패하면 예비 렌더러(hwp.js / 간이 HWPX)로 다시 시도한다.
 */
let ready: Promise<unknown> | null = null;
function ensureEngine() {
  if (!ready) {
    let ctx: CanvasRenderingContext2D | null = null;
    let last = '';
    (globalThis as Record<string, unknown>).measureTextWidth = (font: string, text: string) => {
      if (!ctx) ctx = document.createElement('canvas').getContext('2d');
      if (font !== last) {
        ctx!.font = font;
        last = font;
      }
      return ctx!.measureText(text).width;
    };
    ready = init({ module_or_path: wasmUrl }).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

interface Props {
  file: File;
  zoom: number;
  isHwpx: boolean;
  onPages?: (n: number) => void;
}

export default function HangulViewer({ file, zoom, isHwpx, onPages }: Props) {
  const [doc, setDoc] = useState<HwpDocument | null>(null);
  const [count, setCount] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [status, setStatus] = useState('한글 엔진 준비 중…');

  useEffect(() => {
    let cancelled = false;
    let opened: HwpDocument | null = null;
    setDoc(null);
    setFallback(false);
    (async () => {
      try {
        await ensureEngine();
        setStatus('문서 여는 중…');
        const bytes = new Uint8Array(await file.arrayBuffer());
        opened = new HwpDocument(bytes);
        if (cancelled) return;
        const n = opened.pageCount();
        setCount(n);
        onPages?.(n);
        setDoc(opened);
      } catch (e) {
        console.warn('rhwp 실패, 예비 렌더러 사용', e);
        if (!cancelled) setFallback(true);
      }
    })();
    return () => {
      cancelled = true;
      try {
        opened?.free();
      } catch {
        /* noop */
      }
    };
  }, [file, onPages]);

  if (fallback)
    return isHwpx ? <HwpxSimpleViewer file={file} zoom={zoom} /> : <HwpLegacyViewer file={file} zoom={zoom} />;
  if (!doc) return <div className="msg">{status}</div>;

  return (
    <div className="pdf-pages">
      {Array.from({ length: count }, (_, i) => (
        <SvgPage key={i} doc={doc} index={i} zoom={zoom} />
      ))}
    </div>
  );
}

function SvgPage({ doc, index, zoom }: { doc: HwpDocument; index: number; zoom: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [ratio, setRatio] = useState(297 / 210); // 렌더 전에는 A4 비율로 자리 확보

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !svg) {
          try {
            const s = doc.renderPageSvg(index);
            const m = s.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/) ?? s.match(/width="([\d.]+)[^"]*" height="([\d.]+)/);
            if (m) setRatio(Number(m[2]) / Number(m[1]));
            setSvg(s);
          } catch (err) {
            setSvg(`<p style="padding:24px;color:#e5484d">${index + 1}쪽을 그리지 못했습니다</p>`);
            console.warn(err);
          }
        }
      },
      { rootMargin: '1000px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [doc, index, svg]);

  const w = Math.min(window.innerWidth - 16, 1000) * zoom;
  return (
    <div ref={ref} className="page svg-page" style={{ width: w, minHeight: w * ratio }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="page-no">{index + 1}</span>
    </div>
  );
}
