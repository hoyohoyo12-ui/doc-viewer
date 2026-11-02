import { useEffect, useRef, useState } from 'react';
import { Viewer } from 'hwp.js';

/** 한글 2007 이후의 .hwp(HWP 5.0 바이너리) — hwp.js(Apache-2.0) 사용 */
export default function HwpViewer({ file, zoom }: { file: File; zoom: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    setError('');
    let viewer: { distory: () => void } | null = null;
    file.arrayBuffer().then((buf) => {
      try {
        viewer = new Viewer(el, new Uint8Array(buf), { type: 'array' });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
    return () => {
      try {
        viewer?.distory();
      } catch {
        /* noop */
      }
    };
  }, [file]);

  // HWP 페이지(A4 ≈ 794px)를 화면 폭에 맞춘다
  const fit = Math.min(1, (window.innerWidth - 16) / 820) * zoom;

  return (
    <>
      {error && (
        <div className="msg error">
          한글 문서를 열 수 없습니다: {error}
          <br />
          배포용·암호 문서나 HWP 3.0 이하 구형 파일은 지원하지 않습니다.
        </div>
      )}
      <div className="scaled hwp" style={{ zoom: fit } as React.CSSProperties}>
        <div ref={ref} />
      </div>
    </>
  );
}
