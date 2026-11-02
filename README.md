# 문서뷰어 — 광고 없는 모바일 문서 뷰어

PDF · 한글(HWP/HWPX) · 워드(DOCX) · 엑셀(XLSX/XLS/CSV) · 파워포인트(PPTX) · TXT · 이미지를
**광고 없이**, **인터넷 전송 없이(기기 안에서만)** 보는 앱입니다.

| 구분 | 내용 |
|---|---|
| 화면 | React 19 + Vite (TypeScript) |
| 웹앱(PWA) | 홈 화면 설치, 오프라인 실행, 안드로이드 '공유' 메뉴로 파일 받기 |
| 안드로이드 앱 | Capacitor 8 — 파일앱·카톡의 **'연결 프로그램'**, **'공유'** 메뉴에 표시 |
| 자동 빌드 | GitHub Actions (APK·AAB 자동 생성, GitHub Pages 자동 배포) |

## 사용한 오픈소스 엔진

| 형식 | 라이브러리 | 라이선스 |
|---|---|---|
| PDF | pdfjs-dist (Mozilla) | Apache-2.0 |
| HWP / HWPX | @rhwp/core (Rust+WebAssembly) — 실패 시 hwp.js / 자체 HWPX 렌더러로 대체 | MIT / Apache-2.0 |
| DOCX | docx-preview | Apache-2.0 |
| XLSX/XLS/CSV | SheetJS (xlsx) | Apache-2.0 |
| PPTX | pptx-preview | ISC |

> 유료 판매 시 각 라이선스 고지가 필요합니다(앱 설정/정보 화면 또는 스토어 설명에 표기).

## 지원 안 되는 것
- `.doc`, `.ppt`(2003 이전 구형 바이너리), 배포용·암호 HWP
- 복잡한 PPTX 애니메이션, 엑셀 차트(값은 보임)

## 개발 명령
```bash
npm install
npm run dev          # 개발 서버
npm run build        # dist/ 생성
npx cap sync android # 안드로이드 프로젝트에 반영
```

## 폴더 구조
```
src/
  App.tsx              홈(최근 문서) + 뷰어 화면
  viewers/             형식별 뷰어 (Pdf/Docx/Sheet/Pptx/Hangul…)
  lib/storage.ts       최근 문서(기기 안 IndexedDB)
  lib/native.ts        안드로이드 '연결 프로그램' 연동
  sw.ts                오프라인 + 공유받기 서비스워커
android/               안드로이드 앱 프로젝트 (Capacitor)
  app/src/main/java/kr/docviewer/noads/MainActivity.java   파일 받기 네이티브 코드
.github/workflows/     자동 빌드·배포
```
