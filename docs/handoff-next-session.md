# 다음 세션 인수인계 (2026-07-17)

현 상태: 마스터 플랜(docs/erp-master-plan.md) 전 페이즈 완주, main 최신 `b9e9f44`, CI(Verify engine + Pages 배포) 그린. 남은 것은 아래 2건의 **미해결 품질 문제**다.

## 1. 얼음 애니메이션 — 해결됨 (2026-07-17, WebGL 구현)

옵션 B로 해결: `src/components/IceField.tsx` — three.js 실시간 수중 씬(굴절 얼음 큐브 8개 transmission/ior 1.31, 기포 파티클 160, 수면 광선, 스크롤 다이브 카메라, 테마 연동, reduced-motion 정지 프레임). 커밋 `504c50d`. 카드는 유리 패널로 복귀(가짜 상단면 제거, 틸트 축소). 남은 것 없음 — 미세 톤 조정 요청만 가능성.

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
