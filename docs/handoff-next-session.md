# 다음 세션 인수인계 (2026-07-17)

현 상태: 마스터 플랜(docs/erp-master-plan.md) 전 페이즈 완주, main 최신 `b9e9f44`, CI(Verify engine + Pages 배포) 그린. 남은 것은 아래 2건의 **미해결 품질 문제**다.

## 1. 얼음 애니메이션 — CSS 한계 도달, 접근 자체를 바꿔야 함

**사용자 요구**: 레퍼런스 사진(물속에 가라앉은 반투명 얼음 큐브들, dreamstime 42216628)처럼 보일 것.

**정직한 진단**: 3번 시도(모핑→3D 텀블+기포→반투명 재질+상단면)했지만 결과물은 "기울어진 채 위아래로 움직이는 사각형"이다. 원인은 구조적이다 — **텍스트 콘텐츠 카드 자체를 얼음으로 위장하는 것은 CSS로 불가능**하다. 굴절·커스틱·부피감은 셰이더 영역이고, 카드는 가독성 때문에 각도·투명도를 키울 수 없다.

**옵션 (다음 세션에서 사용자에게 선택받을 것)**:
- **A. 카드=얼음 은유 포기 + 장식 분리**: 카드는 깔끔한 유리 패널로 되돌리고, 물 배경에 **텍스트 없는 진짜 얼음 큐브 오브제**(작은 CSS 3D 큐브 6면체 또는 SVG)를 몇 개 띄워 텀블시킨다. CSS만으로 가능, 리스크 낮음. (추천)
- **B. WebGL/Three.js**: 배경 캔버스에 굴절 셰이더 얼음 큐브 — 사진 수준 가능하지만 의존성+번들+GPU 비용. GitHub Pages 정적 배포와는 호환.
- **C. 사전 렌더 에셋**: 블렌더 등에서 렌더한 투명 WebM/Lottie를 배경 레이어로 재생. 품질 보장, 파일 용량 부담.

**관련 코드** (전부 `src/modules/Overview.css`): `@keyframes ice-plunge / ice-wobble / bubble-rise / ice-bob`, `.chain-card`(재질+::before 상단면+::after 하단면), `.ov-node` 재질 오버라이드, `.chain-item/.ov-flow-item`의 `--rx/--ry/--rz` nth-of-type 자세, `.ice-bubbles`(TSX: Overview.tsx에 span 2군데), 파일 맨 끝 reduced-motion 블록(반드시 마지막 유지). 되돌릴 때 이 목록만 걷어내면 됨.

## 2. 한국어 번역 — 반쪽짜리, 전면 일관성 필요

**사용자 불만**: Overview조차 일부만 번역, 나머지 레이어(모듈)는 거의 미번역. "애매하게 몇 개만"이 문제 — 켰으면 화면 전체가 한국어로 읽혀야 한다.

**현 구조** (`src/i18n.ts`): `useLang()`(localStorage `hongerp-lang`, window 이벤트 동기화) + `useT()`(EN 문자열 키 → KO 사전 조회, 미등록 시 EN 폴백) + `KO_DESC`(사이드바 12) + `KO_TOUR`(8스텝) + `KO_COPY`(15개) + 숫자 포함 블록 12개는 `lang==='ko'` 인라인 분기. 사이드바에 EN/KO 세그먼트 토글.

**번역된 것**: 사이드바 desc, 투어, Overview 히어로 lede·체인 헤드·flow/chain-note, 바닐라 전략 blurb 5, ins-warning, 이그저틱 blurb, Backtest 배너·verdict·method·bt-muted, Report 부제·푸터·4기둥 서술.

**미번역 (다음 세션 작업 목록)**: 
- Overview 잔여: 히어로 버튼·칩, 체인 카드 4장(title/plain/result/link), live 섹션 헤딩·설명, flow 노드 제목·설명, cta 문단.
- Dashboard: 배너, 파라미터 그룹명·라벨·툴팁(p-desc), 타일 라벨, 차트 축·범례, db-note/callout, 사업부 북.
- Budget: 배너, 슬라이더 라벨, 타일, bg-note.
- Instruments: 탭 타이틀/서브, 전략 버튼명, 표 헤더, 붐킹 폼 라벨, 크랙·벤치마크 카드 본문.
- ExoticDesk: 모드명, 리스크 라벨(Low/Elevated/…), foil 표·타일, 컨버전스 캡션.
- Accounting: 배너, 지정 칩, 표 헤더, 연결 리스트.
- CoA/Materiality/MetricsEntry: 트리·매트릭스 라벨, 폼 라벨, 검증 문구, 승인 큐, FY 마감 버튼·토스트.
- Scenario/Backtest 잔여/AuditTrail/Report 잔여: 폼·표·이벤트 동사 등.
- Palette(⌘K) 커맨드명, 토스트 메시지, 투어 버튼(Next/Back 등).
**원칙 유지**: 숫자·차트 눈금·통화·모델 수식 기호는 EN/기호 유지. 방식: 산문은 `t()` 사전, 짧은 라벨은 `L()` 같은 별도 라벨 사전을 추가해 컴포넌트별 일괄 적용. 분량이 커서 에이전트 2기(모듈 절반씩) 병렬 + 명시 pathspec 커밋 권장.

## 작업 규칙 (필수)
- 린 프로토콜: 검증은 `npx tsc -b && npm run build`만, 배포 watch 생략(마지막에 `gh run list` 1줄), 페이즈 묶어 위임, 서브에이전트 model=opus, 이모지 금지.
- dev 포트 4200 재사용, 커밋은 명시 pathspec, push 전 `git pull --rebase origin main`.
- Overview.css의 reduced-motion 블록은 항상 파일 마지막.
- 카피 톤: 자기지시 메타 문구 금지, " — " dash 남용 금지, 강제 `<br>` 금지.
