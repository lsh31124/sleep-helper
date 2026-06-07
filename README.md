# 🌙 고요한 밤 — 수면 도우미

> 불면증을 겪는 사람들을 위한 PWA 수면 도우미 앱

[![Vercel](https://img.shields.io/badge/Vercel-배포중-black?logo=vercel)](https://sleep-helper-six.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

<br/>

## 📱 데모

**[https://sleep-helper-six.vercel.app](https://sleep-helper-six.vercel.app)**

<br/>

## ✨ 기능

### 🔊 사운드
| 소리 | 방식 |
|------|------|
| 빗소리 | 실제 녹음 MP3 |
| 파도소리 | 실제 녹음 MP3 |
| 귀뚜라미 | 실제 녹음 MP3 |
| 백색소음 | Web Audio API 생성 |
| 핑크노이즈 | Web Audio API 생성 |
| 브라운노이즈 | Web Audio API 생성 |

- 단일 재생 (하나씩만 재생)
- 개별 볼륨 조절

### 🫁 호흡법 가이드
- **4-7-8 호흡법** — 깊은 이완
- **박스 호흡법** — 균형 호흡
- **단순 호흡법** — 초보자용
- 시각적 원형 애니메이션 + 카운트다운

### ⏱ 수면 타이머
- 5 / 10 / 15 / 20 / 30 / 45 / 60분 선택
- 시간 종료 시 소리 자동 페이드아웃

<br/>

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 스타일링 | Tailwind CSS |
| 오디오 | Web Audio API + HTMLAudioElement |
| PWA | @ducanh2912/next-pwa |
| 배포 | Vercel |

<br/>

## 🚀 로컬 실행

```bash
# 클론
git clone https://github.com/lsh31124/sleep-helper.git
cd sleep-helper

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

<br/>

## 📁 프로젝트 구조

```
sleep-helper/
├── src/
│   ├── app/
│   │   ├── page.jsx          # 페이지 진입점
│   │   ├── layout.jsx        # 레이아웃 + 메타데이터
│   │   └── globals.css       # 전역 스타일
│   └── components/
│       └── SleepHelper.jsx   # 메인 컴포넌트
├── public/
│   ├── sounds/               # MP3 사운드 파일
│   │   ├── rain.mp3
│   │   ├── ocean.mp3
│   │   └── crickets.mp3
│   └── manifest.json         # PWA 매니페스트
├── next.config.js
├── tailwind.config.js
└── ISSUES.md                 # 이슈 트래킹
```

<br/>

## 📋 이슈 트래킹

발견된 버그 및 개선사항은 [ISSUES.md](./ISSUES.md) 참고

<br/>

## 📄 라이선스

MIT © [lsh31124](https://github.com/lsh31124)
