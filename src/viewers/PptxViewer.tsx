import { useEffect, useRef, useState } from 'react';
import { init } from 'pptx-preview';

export default function PptxViewer({ file, zoom }: { file: File; zoom: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    const width = Math.min(window.innerWidth - 16, 1000) * zoom;
    const viewer = init(el, { width, height: (width * 9) / 16, mode: 'list' });
    setLoading(true);
    setError('');
    file
      .arrayBuffer()
      .then((buf) => viewer.preview(buf))
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      try {
        viewer.destroy();
      } catch {
        /* noop */
      }
    };
  }, [file, zoom]);

  return (
    <>
      {loading && <div className="msg">불러오는 중…</div>}
      {error && <div className="msg error">파워포인트를 열 수 없습니다: {error}<br />(.ppt 구형 형식은 지원하지 않습니다)</div>}
      <div ref={ref} className="pptx" />
    </>
  );
}
