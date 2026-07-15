# HongERP UX 고도화 플랜 (Fable 작성, Opus 실행용)

실행 규약 — **한 세션에 한 Phase만.** 각 Phase 끝나면: `npx tsc -b` + `npx oxlint` + Playwright 스크린샷(라이트/다크 × 1440/390) 검증 후 커밋. 새 의존성 금지. 토큰은 전부 `src/index.css :root`에. 이모지 금지. 이 파일의 수치를 임의로 바꾸지 말 것 — 바꿔야 하면 사용자에게 먼저.

---

## Phase 1 — Overview "얼음판" 패널 (최우선, 사용자가 두 번 반려한 그 작업)

### 사용자가 원하는 것 (오해 금지)
1. 패널이 **상시** 얇은 3D 판(얼음판)으로 보인다 — 애니메이션 중에만이 아니라 **정지 상태에서도** 미세하게 기울어져 두께가 보인다.
2. 리빌 때 **물에 얼음 빠지듯**: 3D로 기울며 낙하 → 수면 아래로 잠김 → **물이 반응**(리플 링 + 수면띠) → 부력으로 떠오름 → 정착.
3. 정착 후 **영원히 제자리에서 부유**(bob + sway, 위상 어긋남). 일회성 모핑 절대 금지.
4. 진폭은 전부 미세하게. "살아있는데 정신 없지는 않게."

### 이전 시도(ov-plunge/ov-float)가 반려된 이유
- 정지 상태가 완전 평면(transform none) → 3D는 진입 1.3초뿐.
- 물이 전혀 반응 안 함(리플 없음) → "물에 빠지는" 게 아니라 그냥 낙하.
- per-item `perspective` → 카드마다 소실점 따로 = 파워포인트 모핑 느낌.

### 구현 스펙 (파일: `src/modules/Overview.css`, `src/modules/Overview.tsx`)

**A. 장면 원근 통일** — per-item perspective 제거, 컨테이너로 이동:
```css
.chain-track { perspective: 1200px; perspective-origin: 50% -10%; }
.ov-flow-row { perspective: 1200px; }
@media (min-width: 1001px) { .ov-flow-row { overflow: visible; } } /* 리플·3D 잘림 방지, 모바일은 auto 유지 */
```
`.chain-item`의 `perspective: 1100px` 삭제.

**B. 상시 3D 판** — 카드 기본 상태에 미세 틸트 + 하단 두께 스트립:
```css
.chain-card, .ov-node { position: relative; transform: rotateX(1.4deg); }
.chain-card::before, .ov-node::before {
  content: ""; position: absolute; left: 10px; right: 10px; bottom: -5px; height: 5px;
  border-radius: 0 0 12px 12px;
  background: linear-gradient(to bottom,
    color-mix(in srgb, var(--panel) 68%, #35505e),
    color-mix(in srgb, var(--panel) 55%, #2a4250));
  pointer-events: none;
}
```
기존 slab box-shadow(sheen + 2px edge + drop)는 유지 — 스트립과 합쳐져 두께가 된다.

**C. 물 반응** — `.chain-item`/`.ov-flow-item`의 빈 pseudo 슬롯 사용 (2026-07 현재 비어있음 확인됨. 작업 전 `grep -n "chain-item::" src/modules/Overview.css`로 재확인):
```css
/* 리플 링: 착수 순간 퍼지는 타원 */
.chain-item::before { /* flow는 .ov-flow-item::before, left/right 값만 6px/6px */
  content: ""; position: absolute; left: 46px; right: -6px; bottom: 2px; height: 18px;
  border: 1.5px solid color-mix(in srgb, var(--ice-water) 60%, transparent);
  border-radius: 50%; opacity: 0; pointer-events: none;
}
/* 수면띠: 카드 하단이 걸쳐 떠 있는 물 표면, 정착 후에도 옅게 남는다 */
.chain-item::after {
  content: ""; position: absolute; left: 46px; right: -6px; bottom: 6px; height: 10px;
  background: linear-gradient(to bottom, transparent,
    color-mix(in srgb, var(--ice-water) 34%, transparent) 45%, transparent);
  border-radius: 50%; filter: blur(1px); opacity: 0; z-index: 2; pointer-events: none;
}
.chain-item.in::before { animation: ice-ripple 0.9s ease-out 0.48s both; }
.chain-item.in::after  { animation: ice-water 1.4s ease-out 0.4s forwards; }
@keyframes ice-ripple {
  0% { opacity: 0; transform: scaleX(0.55) scaleY(0.5); }
  18% { opacity: 0.5; }
  100% { opacity: 0; transform: scaleX(1.18) scaleY(1); }
}
@keyframes ice-water { 0% { opacity: 0; } 35% { opacity: 0.55; } 100% { opacity: 0.28; } }
```
토큰 추가(`index.css`): 라이트 `--ice-water: #7aa0af;` 다크 `--ice-water: #4a6b78;`

**D. 낙하(plunge) + 영속 sway — 같은 요소에 콤마 체인** (transform 충돌 해결의 핵심):
```css
@keyframes ice-plunge {
  0%   { transform: translateY(-46px) rotateX(-14deg); }
  38%  { transform: translateY(12px)  rotateX(5deg); }    /* 착수: 수면 아래 */
  55%  { transform: translateY(-6px)  rotateX(-2.6deg); } /* 부력 반동 */
  72%  { transform: translateY(3.5px) rotateX(1.2deg); }
  86%  { transform: translateY(-1.5px) rotateX(-0.5deg); }
  100% { transform: translateY(0) rotateX(1.4deg); }      /* 종점 = 기본 틸트와 동일 */
}
@keyframes ice-sway { /* 기본 틸트 포함해야 점프 없음 */
  0%, 100% { transform: rotateX(1.4deg) rotate(-0.12deg); }
  50%      { transform: rotateX(1.4deg) rotate(0.12deg); }
}
@keyframes ice-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

.chain-item { opacity: 0; transition: opacity 0.45s ease; }
.chain-item.in { opacity: 1; animation: ice-bob 6.8s ease-in-out infinite; animation-delay: calc(var(--i, 0) * -1.7s); }
.chain-item.in .chain-card {
  animation:
    ice-plunge 1.25s cubic-bezier(0.3, 0.72, 0.24, 1) backwards,
    ice-sway 9.7s ease-in-out 1.25s infinite;
}
```
- 부모 = translateY만(bob), 카드 = plunge 후 sway. 주기 6.8s/9.7s 소수관계 → 반복 티 안 남.
- flow: 동일 패턴 + `animation-delay: calc(var(--i) * 90ms)`를 plunge·ripple에 추가, bob 위상 `calc(var(--i) * -1.6s)`.
- `.chain-item`에 `--i` 이미 주입돼 있음(tsx). flow도 확인.

**E. hover 규칙 변경** — 카드가 상시 애니메이션 중이므로 **transform hover 금지**(스냅 발생). `.chain-card:hover`의 `transform: translateY(-2px)` 제거 → border-color + box-shadow 심화만. `.ov-node:hover` 동일.

**F. reduced-motion** — 기존 가드 블록에 추가: 4개 keyframe 전부 `animation: none`, `::before/::after` `display: none`, 카드 `transform: none`(평면 복귀), opacity 페이드만.

**G. 검증(필수)** — `scripts/shot-tour.mjs` 패턴 재사용:
1. 스크롤 진입 300ms 시점: `.chain-card` computedStyle transform이 `matrix3d`인지.
2. ~600ms: `.chain-item::before`(리플) opacity > 0.
3. 2초 후: 카드 animation-name에 `ice-sway`, 부모에 `ice-bob`, 수면띠 opacity ≈ 0.28.
4. hover 시 transform 스냅 없음(카드 transform은 sway 값 그대로).
5. `page.emulateMedia({reducedMotion:'reduce'})` → animation 없음.
6. 다크모드 스크린샷 — 리플/수면띠/두께 스트립 색 확인.

---

## Phase 0 — 디자인 토큰 기반 다지기 (Phase 2~8의 전제, 30분급)

`src/index.css :root`에 추가하고 **기존 값 치환은 grep으로 일괄**:
```css
/* motion */
--dur-xs: 100ms; --dur-s: 160ms; --dur-m: 240ms; --dur-l: 480ms;
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-spring: cubic-bezier(0.3, 0.72, 0.24, 1);
/* elevation (다크는 알파만 올림) */
--shadow-raised: 0 2px 4px rgb(0 0 0 / 0.05);
--shadow-float: 0 10px 26px -14px rgb(20 30 26 / 0.35);
--shadow-overlay: 0 24px 60px -24px rgb(20 30 26 / 0.45);
/* type scale — 이 7단 밖의 font-size 신설 금지 */
--fs-caption: 11px; --fs-label: 12.5px; --fs-body: 14px; --fs-lede: 17px;
--fs-h3: 21px; --fs-h2: 26px; --fs-stat: 30px;
```
- 각 모듈 CSS의 transition `0.15s ease` → `var(--dur-s) var(--ease-out)` 일괄 치환.
- 한국어 카피 대비: `body { word-break: keep-all; }` (영문 영향 없음).
- 커밋: `Design tokens: motion/elevation/type scale`.

## Phase 2 — 모듈 화면 모션 캄다운 + 탭 전환
- 얼음 모션은 Overview 시그니처 **전용**. 모듈 화면(콕핏들)은 차분하게: 패널 마운트 시 `opacity+translateY(6px)` `--dur-m` 한 번만.
- `.ins-tabs`/`.ins-strat`/`.bg-tabs` 탭 전환: 활성 배경이 스냅 → `transition: background var(--dur-s), box-shadow var(--dur-s)` + 콘텐츠 영역 `opacity 0→1 --dur-m` 크로스페이드. 레이아웃 시프트 금지.
- 모드 전환(ExoticDesk ko↔euro, Instruments 전략 선택) 시 결과 패널만 페이드, 레일은 고정.

## Phase 3 — 숫자·타일 마이크로
- 모든 수치 표기 `font-variant-numeric: tabular-nums` 전수 감사(누락: chain-result, 칩 내부 strong 등).
- 타일 값 변경 시 펄스: `.tile-value` 값 바뀌면 `scale(1.02)` `--dur-xs` 1회 (React: key 변경 or 클래스 토글). 오도미터/카운트업 라이브러리 금지 — 펄스만.
- 타일 4종 높이 통일: `.tile { min-height: 86px; align-content: start; }` 각 콕핏에서 확인.
- 슬라이더 값 칩(ParamRow accent 칩): 드래그 중 `box-shadow: 0 0 0 3px var(--accent-soft)`.

## Phase 4 — 테이블·블로터·큐 프로화
- Accounting 블로터: 우측 정렬 숫자열, designation을 칩으로(CFH-A 초록테두리 / CFH-B 파랑 / FVTPL 주황 — 기존 팔레트 #2e7d52/#2f6db4/#b3610f), row hover는 Instruments 표와 동일 rule 재사용.
- Metrics 승인 큐: Approve/Reject 시 행이 **collapse+fade로 퇴장**(`grid-template-rows 1fr→0fr` + opacity, `--dur-m`). 스냅 삭제 금지.
- 성공 플래시 통일: `ins-bookflash`/`me-flash` → 공용 `.toast` 컴포넌트(우상단 고정, slide-in `--dur-m`, 3.5s 후 fade). `src/components/Toast.tsx` 신설, ERP context에 `toast(msg)` 액션.

## Phase 5 — 네비·사이드바·포커스
- 사이드바 활성 항목: 배경만 → **좌측 3px accent 바 + 배경**(콕핏 표 hl 행과 동일 언어).
- **실데이터 배지**: Metrics Entry 항목에 pending 수(`erp.metrics.filter(pending).length`) 배지 — 살아있는 ERP처럼 보이는 최고 가성비.
- `:focus-visible` 전수: 카드버튼(chain-card, ov-node, ins-strat-btn, 탭들)에 `outline: 2px solid var(--accent); outline-offset: 2px`. 슬라이더 기존 outline-offset 확인.
- 본문 최상단 skip-link(`.sr-only` → focus 시 표시).

## Phase 6 — 폼·슬라이더·입력
- 터치 타깃: 슬라이더 thumb 히트영역 ≥44px(패딩 트릭), 모바일에서 ParamRow 행 높이 확대.
- thumb 상태: hover ring, active `scale(1.15)` `--dur-xs`.
- 숫자 입력(Book notional, crack 입력): 잘못된 값 시 `me-err` 스타일 재사용 + `aria-invalid`. Book 버튼 disabled 사유 title.

## Phase 7 — 다크모드·모바일 총감사
- 하드코딩 `rgb(30 50 60 …)` 계열 그림자 → `--shadow-*` 토큰으로 이관, 다크에서 알파 상향.
- 신규 요소(foil 타일, strat 선택기, 얼음 스트립/리플, 수면띠) 다크 대비 검증 — shot 스크립트 `colorScheme:'dark'`.
- 모바일: 드로어 스와이프 닫기(touchstart/move 30px), 가로 스크롤 표에 우측 그라디언트 페이드 힌트(`.ins-table-wrap` 등), 히어로 캐러셀 스와이프.

## Phase 8 — 랜딩 마감
- 섹션 사이 구분을 **수면(waterline) 모티프**로 통일 — Phase 1의 수면띠 그라디언트를 얇은 섹션 디바이더로 재사용(메타포 일관).
- OG 카드(og.png) 재생성 — 디자인 대개편 반영(`scripts/shot-og.mjs` 재실행).
- 히어로 카피 widow 방지(`&nbsp;` or `text-wrap: balance`), 커스텀 스크롤바(webkit, 8px, `--line`), `text-wrap: balance`를 h2/h3에.

---

### Opus용 세션 시작 프롬프트 템플릿
```
~/hong-erp에서 docs/ux-overhaul-plan.md의 Phase N을 실행해라.
스펙 수치 그대로. 스코프 밖 파일 건드리지 마라.
끝나면 tsc/oxlint + Playwright(라이트·다크×1440·390) 검증 후
"Phase N: <제목>" 으로 커밋하고 push, Pages 배포 확인까지.
```
권장 순서: **1 → 0 → 2 → 4 → 5 → 3 → 7 → 6 → 8** (1이 사용자 최우선, 0이 나머지의 전제).
