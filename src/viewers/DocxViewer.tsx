import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocxViewer({ file, zoom }: { file: File; zoom: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    setLoading(true);
    renderAsync(file, el, undefined, {
      className: 'docx',
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
    })
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [file]);

  // 워드 페이지(약 794px 폭)를 화면 폭에 맞춘다
  const fit = Math.min(1, (window.innerWidth - 16) / 820) * zoom;

  return (
    <>
      {loading && <div className="msg">불러오는 중…</div>}
      {error && <div className="msg error">워드 문서를 열 수 없습니다: {error}<br />(.doc 구형 형식은 지원하지 않습니다)</div>}
      <div className="scaled" style={{ zoom: fit } as React.CSSProperties}>
        <div ref={ref} />
      </div>
    </>
  );
}
