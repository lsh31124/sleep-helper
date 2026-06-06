# 🐛 Issues — 고요한 밤 수면 도우미

> 코드 리뷰에서 발견된 이슈 목록. 실제 프로젝트에선 GitHub Issues로 관리.

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
**내용:** `getCtx()`에서 `typeof window === "undefined"` 체크 없이 `window.AudioContext` 직접 접근. SSR 환경(Next.js 빌드)에서 크래시.  
**수정:** `if (typeof window === "undefined") return null;` 가드 추가, 하위 함수들 null 체크 추가.  
**상태:** ✅ 완료

---

## [BUG] `fadeOut`의 `this` 바인딩 오류
**심각도:** 🟠 High  
**파일:** `src/components/SleepHelper.jsx` — `AudioEngine.fadeOut()`  
**내용:** `setTimeout(() => this.stopAll(), ...)` — `setTimeout` 콜백에서 `this`가 `AudioEngine` 객체를 가리키지 않을 수 있음. 타이머 종료 시 소리가 안 꺼지는 버그.  
**수정:** `this` 대신 `api` 변수로 직접 참조 (`api.stopAll()`).  
**상태:** ✅ 완료

---

## [BUG] `SoundTile` 바 애니메이션 — `Math.random()` 인라인
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx` — `SoundTile` 컴포넌트  
**내용:** `height: 8 + Math.random() * 8` — 렌더마다 랜덤값 재계산, React가 불필요한 DOM 업데이트를 반복. 성능 저하 및 콘솔 경고 유발.  
**수정:** 고정값 `[6, 12, 8]` 배열로 교체, CSS 애니메이션으로 움직임 처리.  
**상태:** ✅ 완료

---

## [BUG] 언마운트 시 `AudioContext` 정리 누락
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx` — `SleepHelper` 컴포넌트  
**내용:** 컴포넌트 언마운트 시 재생 중인 오디오 노드가 정리되지 않아 메모리 누수 발생 가능.  
**수정:** `useEffect(() => () => AudioEngine.stopAll(), [])` cleanup 추가.  
**상태:** ✅ 완료

---

## [BUG] 타이머 state 비동기 경쟁 조건
**심각도:** 🟡 Medium  
**파일:** `src/components/SleepHelper.jsx` — `startTimer()`, `useEffect`  
**내용:** `setTimerRemaining()` → `setTimerActive(true)` 를 연속 호출 시, `useEffect([timerActive])`가 실행될 때 `timerRemaining` 상태가 아직 이전 값일 수 있음. 5분 외 다른 시간이 간헐적으로 오작동하던 원인 중 하나.  
**수정:** `timerRemainingRef`로 ref 미러 추가, 시작 시 ref에 먼저 값 동기화.  
**상태:** ✅ 완료

---

## [IMPROVEMENT] Google Fonts `@import` → `<link>` 태그로 교체
**심각도:** 🔵 Low (보안/성능)  
**파일:** `src/components/SleepHelper.jsx` → `src/app/layout.jsx`  
**내용:** `<style>` 내 `@import url(...)` 방식은 CSP(Content Security Policy) `style-src` 정책에서 차단될 수 있고, 렌더 블로킹 발생. Next.js 표준은 `<head>`의 `<link rel="stylesheet">` 또는 `next/font`.  
**수정:** `layout.jsx`의 `<head>`에 `<link>` 태그로 이전. preconnect 힌트 포함.  
**상태:** ✅ 완료

---

## [IMPROVEMENT] 대용량 오디오 버퍼 메인 스레드 블로킹
**심각도:** 🔵 Low (성능)  
**파일:** `src/components/SleepHelper.jsx` — `makeBuffer()`  
**내용:** `makeBuffer()`가 동기적으로 수백만 샘플 계산 (rain 8초 × 44100Hz = 352,800 iteration × 2채널). 저사양 기기에서 소리 선택 시 UI가 100~300ms 멈출 수 있음.  
**수정 방안:** `OfflineAudioContext` + `startRendering()` 비동기 처리로 교체, 로딩 스피너 표시.  
**상태:** ⏳ 미완료 (추후 개선)

---

_마지막 업데이트: 2026-06-07_
