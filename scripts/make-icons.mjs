// public/icon.svg → PNG 아이콘들 (Playwright 사용)
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icon.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
for (const [size, name, pad] of [[192,'pwa-192.png',0],[512,'pwa-512.png',0],[512,'maskable-512.png',56],[180,'apple-touch-icon.png',0]]) {
  await p.setViewportSize({ width: size, height: size });
  const bg = pad ? '#1D4ED8' : 'transparent';
  await p.setContent(`<html><body style="margin:0;background:${bg}"><div style="padding:${pad*size/512}px">${svg.replace('<svg ', `<svg width="${size-2*pad*size/512}" height="${size-2*pad*size/512}" `)}</div></body></html>`);
  await p.screenshot({ path: `public/${name}`, omitBackground: !pad });
}
await b.close();
console.log('icons done');
