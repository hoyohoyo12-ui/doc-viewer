import { useEffect, useState } from 'react';

export function TextViewer({ file, zoom }: { file: File; zoom: number }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    file.arrayBuffer().then((buf) => {
      let t = new TextDecoder('utf-8').decode(buf);
      if (t.includes('�')) t = new TextDecoder('euc-kr').decode(buf); // 옛날 메모장 한글 파일
      setText(t);
    });
  }, [file]);
  if (text === null) return <div className="msg">불러오는 중…</div>;
  return (
    <pre className="text" style={{ fontSize: `${15 * zoom}px` }}>
      {text}
    </pre>
  );
}

export function ImageViewer({ file, zoom }: { file: File; zoom: number }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="image">
      {url && <img src={url} alt={file.name} style={{ width: `${100 * zoom}%` }} />}
    </div>
  );
}
