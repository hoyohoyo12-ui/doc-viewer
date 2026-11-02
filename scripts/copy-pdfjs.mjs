// pdf.js의 한글 CMap / 표준 폰트를 public/ 으로 복사 (한글 PDF 깨짐 방지)
import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/pdfjs', { recursive: true });
cpSync('node_modules/pdfjs-dist/cmaps', 'public/pdfjs/cmaps', { recursive: true });
cpSync('node_modules/pdfjs-dist/standard_fonts', 'public/pdfjs/standard_fonts', { recursive: true });
console.log('pdf.js cmaps/standard_fonts copied');
