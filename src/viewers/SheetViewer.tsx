import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

const MAX_ROWS = 3000;

export default function SheetViewer({ file, zoom }: { file: File; zoom: number }) {
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [sheet, setSheet] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        let book: XLSX.WorkBook;
        if (isCsv) {
          // 한국 CSV는 EUC-KR(CP949)인 경우가 많아 깨짐 방지
          let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
          if (text.includes('�')) text = new TextDecoder('euc-kr').decode(buf);
          book = XLSX.read(text, { type: 'string' });
        } else {
          book = XLSX.read(buf, { type: 'array', cellDates: true });
        }
        setWb(book);
        setSheet(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [file]);

  const html = useMemo(() => {
    if (!wb) return '';
    const ws = wb.Sheets[wb.SheetNames[sheet]];
    if (!ws || !ws['!ref']) return '<p class="msg">빈 시트입니다.</p>';
    const range = XLSX.utils.decode_range(ws['!ref']);
    if (range.e.r - range.s.r > MAX_ROWS) {
      range.e.r = range.s.r + MAX_ROWS;
      ws['!ref'] = XLSX.utils.encode_range(range);
    }
    return XLSX.utils.sheet_to_html(ws, { header: '', footer: '' });
  }, [wb, sheet]);

  if (error) return <div className="msg error">엑셀 파일을 열 수 없습니다: {error}</div>;
  if (!wb) return <div className="msg">불러오는 중…</div>;

  return (
    <div className="sheet-wrap">
      {wb.SheetNames.length > 1 && (
        <div className="sheet-tabs">
          {wb.SheetNames.map((n, i) => (
            <button key={n} className={i === sheet ? 'tab on' : 'tab'} onClick={() => setSheet(i)}>
              {n}
            </button>
          ))}
        </div>
      )}
      <div className="sheet" style={{ fontSize: `${13 * zoom}px` }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
