# 🐛 Issues — 고요한 밤 수면 도우미

> 코드 리뷰 및 QA에서 발견된 이슈 목록.

---

## [BUG] `"use client"` 누락 — SSR 빌드 에러
**심각도:** 🔴 Critical  
**파일:** `src/components/SleepHelper.jsx`  
**내용:** Next.js App Router에서 `window`, `AudioContext` 등 브라우저 API를 컴포넌트 최상단에서 직접 참조. `"use client"` 없으면 서버 사이드 렌더링 시 `window is not defined` 에러 발생.  
**수정:** 파일 첫 줄에 `"use client"` 추가.  
**상태:** ✅ 완료

---

## [BUG] `window` / `AudioContext` SSR 가드 없음
**심각도:** 🔴 Critical  
**파일:** `src/components/SleepHelper.jsx` — `getCtx()` 함수  
**내용:** `getCtx()`에서 `typeof window === "undefined"` 체크 없이 `window.AudioContext` 직접 접근. SSR 환경에서 크래시.  
**수정:** SSR 가드 추가 + `page.jsx`에서 `dynamic({ ssr: false })`로 SSR 완전 비활성화.  
**상태:** ✅ 완료

---

## [BUG] Hydration 에러 (#425, #418, #423)
**심각도:** 🔴 Critical  
**파일:** `src/components/SleepHelper.jsx` — `stars` 배열  
**내용:** `useMemo` 안의 `Math.random()`이 SSR/CSR에서 다른 값을 생성해 React hydration 불일치 에러 발생.  
**수정:** `useMemo` → `useEffect` + `useState`로 클라이언트 전용 생성. 추가로 `dynamic({ ssr: false })`로 근본 차단.  
**상태:** ✅ 완료

---

## [BUG] `fadeOut`의 `this` 바인딩 오류
**심각도:** 🟠 High  
**파일:** `src/components/SleepHelper.jsx` — `AudioEngine.fadeOut()`  
**내용:** `setTimeout(() => this.stopAll(), ...)` — `setTimeout` 콜백에서 `this`가 AudioEngine 객체를 가리키지 않아 타이머 종료 시 소리가 안 꺼지는 버그.  
**수정:** `this` 대신 `api` 변수로 직접 참조.  
**상태:** ✅ 완료

---

## [BUG] mp3 볼륨 조절 안되는 버그
**심각도:** 🟠 High  
**파일:** `src/components/SleepHelper.jsx`  
**내용:** `AudioEngine` 클로저 안의 `currentAudioEl`과 React 상태가 분리되어 슬라이더 조작 시 볼륨 변경 안됨.  
**수정:** mp3 `HTMLAudioElement`를 React `audioElRef`로 꺼내서 직접 관리. `changeVolume`에서 `audioElRef.current.volume` 직접 조작.  
**상태:** ✅ 완료

---

## [BUG] 타이머 재클릭 시 동작 안하는 버그
**심각도:** 🟠 High  
**파일:** `src/components/SleepHelper.jsx` — `startTimer()`, `useEffect`  
**내용:** `useEffect([timerActive])`에 의존하는 구조에서 같은 분을 재클릭 시 `timerActive` 값이 변하지 않아 `useEffect`가 재실행되지 않음. 취소 후 재클릭해야만 동작하는 문제.  
**수정:** `useEffect` 완전 제거. `startTimer` 안에서 직접 `setInterval` 시작. `timerRemainingRef`로 클로저 없이 값 추적.  
**상태:** ✅ 완료

---

## [BUG] 타이머 state 비동기 경쟁 조건
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx` — `startTimer()`  
**내용:** `setTimerRemaining()` → `setTimerActive(true)` 연속 호출 시 상태 동기화 문제. 일부 분 단위 타이머 오작동.  
**수정:** `timerRemainingRef`로 ref 미러 추가해 interval 내부에서 직접 추적.  
**상태:** ✅ 완료

---

## [BUG] 모바일 AudioContext suspended 문제
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx` — `toggleSound()`  
**내용:** iOS/Android 브라우저는 사용자 인터랙션 없이 AudioContext 생성을 막음. `getCtxAsync()`를 `.then()` 안에서 호출하면 이벤트 핸들러 컨텍스트를 벗어나 소리 재생 실패.  
**수정:** 이벤트 핸들러 내 동기적으로 `getCtx()` 호출 후 `ctx.state === "suspended"`이면 `resume().then(startNoise)` 패턴 적용.  
**상태:** ✅ 완료

---

## [BUG] `SoundTile` 바 애니메이션 — `Math.random()` 인라인
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx` — `SoundTile` 컴포넌트  
**내용:** `height: 8 + Math.random() * 8` — 렌더마다 랜덤값 재계산, 불필요한 DOM 업데이트 반복.  
**수정:** 고정값 `[6, 12, 8]` 배열로 교체.  
**상태:** ✅ 완료

---

## [BUG] 언마운트 시 `AudioContext` 정리 누락
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx`  
**내용:** 컴포넌트 언마운트 시 재생 중인 오디오 노드 미정리 → 메모리 누수.  
**수정:** `useEffect(() => () => AudioEngine.stopAll(), [])` cleanup 추가.  
**상태:** ✅ 완료

---

## [BUG] 소리 멀티 재생 허용
**심각도:** 🟡 Medium  
**내용:** 여러 소리가 동시에 재생되어 의도치 않은 사운드 중첩 발생.  
**수정:** 단일 재생 구조로 변경. 하나 선택 시 이전 소리 자동 중지.  
**상태:** ✅ 완료

---

## [BUG] 빗소리 이중 `start()` 호출
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx` — `createRain()`  
**내용:** `createRain()` 내부에서 `baseSrc.start()`를 호출하는데 `play()`에서 `source.start()`를 또 호출 → 에러로 빗소리 재생 불가.  
**수정:** `createRain()` 내부 `start()` 제거. `play()`에서 `extras`도 함께 start 처리.  
**상태:** ✅ 완료

---

## [BUG] PWA 아이콘 / favicon 404
**심각도:** 🔵 Low  
**파일:** `public/icons/`, `public/favicon.ico`  
**내용:** `manifest.json`에 선언된 아이콘 파일 미존재로 404 에러 및 PWA 설치 불가.  
**수정:** `icon-192.png`, `icon-512.png`, `favicon.ico` 생성 추가.  
**상태:** ✅ 완료

---

## [BUG] `@ducanh2912/next-pwa` 버전 오류
**심각도:** 🔴 Critical (배포 차단)  
**파일:** `package.json`  
**내용:** `^5.6.0` 버전이 존재하지 않아 Vercel 빌드 시 `npm install` 실패.  
**수정:** 최신 버전 `^10.2.9`로 교체.  
**상태:** ✅ 완료

---

## [IMPROVEMENT] Google Fonts `@import` → `<link>` 태그로 교체
**심각도:** 🔵 Low (보안/성능)  
**내용:** `<style>` 내 `@import` 방식은 CSP 정책에서 차단 가능, 렌더 블로킹 발생.  
**수정:** `layout.jsx`의 `<head>`에 `<link>` 태그 + preconnect 힌트로 이전.  
**상태:** ✅ 완료

---

## [IMPROVEMENT] 대용량 오디오 버퍼 메인 스레드 블로킹
**심각도:** 🔵 Low (성능)  
**내용:** `makeBuffer()`가 동기적으로 수백만 샘플 계산. 저사양 기기에서 UI 멈춤 가능.  
**수정 방안:** `OfflineAudioContext` + `startRendering()` 비동기 처리로 교체.  
**상태:** ⏳ 미완료 (추후 개선)

---

## [IMPROVEMENT] mp3 loop 끊김 현상
**심각도:** 🔵 Low (UX)  
**내용:** 빗소리, 파도, 귀뚜라미 mp3 파일 loop 시 앞뒤 묵음으로 끊김 발생. `<audio loop>` 방식의 구조적 한계.  
**수정 방안:** `fetch` + `decodeAudioData` + `BufferSource` 방식으로 seamless loop 구현, 또는 seamless loop 전용 파일로 교체.  
**상태:** ⏳ 미완료 (추후 개선)

---

_마지막 업데이트: 2026-06-07_
