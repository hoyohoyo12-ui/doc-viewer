import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';

/**
 * .hwpx (한글 2014 이후 기본 저장 형식, ZIP+XML 구조) 간이 렌더러.
 * 문단·표·이미지·굵게/기울임을 보여준다. 정확한 서식(여백, 글꼴 크기 등)은 근사치.
 */
export default function HwpxViewer({ file, zoom }: { file: File; zoom: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const urls: string[] = [];
    el.innerHTML = '';
    setLoading(true);
    setError('');
    (async () => {
      try {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const parser = new DOMParser();

        // 이미지 id → 파일 경로 (content.hpf 매니페스트)
        const images = new Map<string, string>();
        const hpf = zip.file(/content\.hpf$/i)[0];
        let sectionPaths: string[] = [];
        if (hpf) {
          const doc = parser.parseFromString(await hpf.async('text'), 'application/xml');
          for (const item of Array.from(doc.getElementsByTagNameNS('*', 'item'))) {
            const id = item.getAttribute('id') ?? '';
            const href = item.getAttribute('href') ?? '';
            if (/^section\d+/i.test(id) || /section\d+\.xml$/i.test(href)) sectionPaths.push(href);
            else if (href) images.set(id, href);
          }
        }
        if (!sectionPaths.length) {
          sectionPaths = Object.keys(zip.files)
            .filter((p) => /Contents\/section\d+\.xml$/i.test(p))
            .sort((a, b) => Number(a.match(/(\d+)\.xml/)![1]) - Number(b.match(/(\d+)\.xml/)![1]));
        }

        // 글자 모양(굵게/기울임/크기/색) — header.xml의 charPr
        const charPr = new Map<string, Partial<CSSStyleDeclaration>>();
        const header = zip.file(/Contents\/header\.xml$/i)[0];
        if (header) {
          const hdoc = parser.parseFromString(await header.async('text'), 'application/xml');
          for (const cp of Array.from(hdoc.getElementsByTagNameNS('*', 'charPr'))) {
            const st: Partial<CSSStyleDeclaration> = {};
            const h = Number(cp.getAttribute('height'));
            if (h) st.fontSize = `${(h / 100) * 1.333}px`; // 1/100 pt → px
            const color = cp.getAttribute('textColor');
            if (color && color !== '#000000') st.color = color;
            for (const c of Array.from(cp.children)) {
              if (c.localName === 'bold') st.fontWeight = '700';
              if (c.localName === 'italic') st.fontStyle = 'italic';
              if (c.localName === 'underline' && c.getAttribute('type') !== 'NONE') st.textDecoration = 'underline';
            }
            charPr.set(cp.getAttribute('id') ?? '', st);
          }
        }

        const imgUrl = async (id: string) => {
          const href = images.get(id);
          const f = href ? zip.file(href) ?? zip.file(href.replace(/^\//, '')) : zip.file(new RegExp(`BinData/${id}\\.`, 'i'))[0];
          if (!f) return '';
          const u = URL.createObjectURL(await f.async('blob'));
          urls.push(u);
          return u;
        };

        const renderChildren = async (node: Element, out: HTMLElement) => {
          for (const c of Array.from(node.children)) await renderNode(c, out);
        };

        const renderNode = async (n: Element, out: HTMLElement): Promise<void> => {
          switch (n.localName) {
            case 'p': {
              const p = document.createElement('p');
              await renderChildren(n, p);
              if (!p.textContent && !p.querySelector('img,table')) p.innerHTML = '&nbsp;';
              out.appendChild(p);
              return;
            }
            case 'run': {
              const span = document.createElement('span');
              Object.assign(span.style, charPr.get(n.getAttribute('charPrIDRef') ?? '') ?? {});
              await renderChildren(n, span);
              out.appendChild(span);
              return;
            }
            case 't': {
              for (const node of Array.from(n.childNodes)) {
                if (node.nodeType === Node.TEXT_NODE) out.append(node.textContent ?? '');
                else if ((node as Element).localName === 'tab') out.append(' ');
                else if ((node as Element).localName === 'lineBreak') out.appendChild(document.createElement('br'));
              }
              return;
            }
            case 'tbl': {
              const table = document.createElement('table');
              for (const tr of Array.from(n.children).filter((c) => c.localName === 'tr')) {
                const row = document.createElement('tr');
                for (const tc of Array.from(tr.children).filter((c) => c.localName === 'tc')) {
                  const td = document.createElement('td');
                  const span = Array.from(tc.children).find((c) => c.localName === 'cellSpan');
                  if (span) {
                    td.colSpan = Number(span.getAttribute('colSpan') ?? 1);
                    td.rowSpan = Number(span.getAttribute('rowSpan') ?? 1);
                  }
                  await renderChildren(tc, td);
                  row.appendChild(td);
                }
                table.appendChild(row);
              }
              out.appendChild(table);
              return;
            }
            case 'pic': {
              const img = n.getElementsByTagNameNS('*', 'img')[0];
              const id = img?.getAttribute('binaryItemIDRef');
              if (id) {
                const src = await imgUrl(id);
                if (src) {
                  const im = document.createElement('img');
                  im.src = src;
                  const sz = Array.from(n.children).find((c) => c.localName === 'curSz' || c.localName === 'sz');
                  const w = Number(sz?.getAttribute('width'));
                  if (w) im.style.width = `${Math.min(w / 75, 700)}px`; // HWPUNIT(1/7200 inch) → px
                  out.appendChild(im);
                }
              }
              return;
            }
            // 머리말/꼬리말/각주/쪽번호/필드 같은 것은 건너뛰고 본문만
            case 'secPr':
            case 'ctrl':
            case 'linesegarray':
            case 'header':
            case 'footer':
              return;
            default:
              await renderChildren(n, out);
          }
        };

        for (const path of sectionPaths) {
          const f = zip.file(path) ?? zip.file(`Contents/${path.split('/').pop()}`);
          if (!f) continue;
          const doc = parser.parseFromString(await f.async('text'), 'application/xml');
          const page = document.createElement('div');
          page.className = 'hwpx-page';
          await renderChildren(doc.documentElement, page);
          el.appendChild(page);
        }
        if (!el.children.length) throw new Error('본문을 찾지 못했습니다');
        setLoading(false);
      } catch (e) {
        setLoading(false);
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [file]);

  const fit = Math.min(1, (window.innerWidth - 16) / 820) * zoom;
  return (
    <>
      {loading && <div className="msg">불러오는 중…</div>}
      {error && <div className="msg error">HWPX 문서를 열 수 없습니다: {error}</div>}
      <div className="scaled" style={{ zoom: fit } as React.CSSProperties}>
        <div ref={ref} />
      </div>
    </>
  );
}
