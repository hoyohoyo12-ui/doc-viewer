export type Kind = 'pdf' | 'docx' | 'sheet' | 'pptx' | 'hwp' | 'hwpx' | 'text' | 'image' | 'unknown';

const MAP: Record<string, Kind> = {
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'sheet',
  xlsm: 'sheet',
  xls: 'sheet',
  csv: 'sheet',
  ods: 'sheet',
  pptx: 'pptx',
  hwp: 'hwp',
  hwpx: 'hwpx',
  txt: 'text',
  md: 'text',
  json: 'text',
  xml: 'text',
  log: 'text',
  html: 'text',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  svg: 'image',
};

export function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function kindOf(name: string, mime = ''): Kind {
  const k = MAP[ext(name)];
  if (k) return k;
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('text/')) return 'text';
  return 'unknown';
}

export const BADGE: Record<Kind, { label: string; color: string }> = {
  pdf: { label: 'PDF', color: '#E5484D' },
  docx: { label: 'DOC', color: '#3E63DD' },
  sheet: { label: 'XLS', color: '#30A46C' },
  pptx: { label: 'PPT', color: '#F76B15' },
  hwp: { label: 'HWP', color: '#0090FF' },
  hwpx: { label: 'HWPX', color: '#0090FF' },
  text: { label: 'TXT', color: '#6E6E73' },
  image: { label: 'IMG', color: '#8E4EC6' },
  unknown: { label: '?', color: '#8B8D98' },
};

export const ACCEPT =
  '.pdf,.docx,.xlsx,.xlsm,.xls,.csv,.ods,.pptx,.hwp,.hwpx,.txt,.md,.json,.xml,.log,.html,image/*';
