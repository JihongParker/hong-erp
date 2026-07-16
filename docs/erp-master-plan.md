# HongERP 마스터 플랜 v2 — 정확성 감사 + 완전한 ERP 로드맵

작성: Fable, 2026-07-16. `ux-overhaul-plan.md`(UX 전용, Phase 0–8 완료)를 승계·확장한다.
> **진행 (2026-07-16)**: F ✓ `be588b7` · R1 ✓ `33bc979` · R2+R3 ✓ `f89109d`(Overview 인증일 배지만 이월) · E1 ✓ `ceccebd` · E2 ✓ `b3dfe42` · E4 ✓ `64dcbb2` · 논문 P1/P3/P5/P6 위생 ✓ modeling `9e909fc`. **전 페이즈 완주 (2026-07-16)**: E3+E5 `baef011` · P1 팔레트+P3/D1 `442fbe8` · D2+배지 `7928a3f` · 웨이브2(스티치·KR/EN·OG·D3) `d4dd4e4`+`a02c6d3` · 논문 dash 패스 modeling `b1fa10a`. 잔여 없음 — 이후 작업은 신규 요구 기준.

실행 규약은 동일: **한 세션 한 Phase**, 수치 임의 변경 금지, 끝나면 tsc+build+스크린샷(라이트/다크×1440/390) 검증 후 커밋. 이모지 금지.

---

## Part A — 정확성 감사 결과 (2026-07-16)

### A1. 검증돼 있는 것 (건드리지 말 것)
| 대상 | 검증 방법 | 상태 |
|---|---|---|
| P4 ESG 엔진 (`engine/model.ts`) | 독립 최소화기 200 draws, worst gap ≤3e-6 (`verify-engine.mjs`) | CERTIFIED |
| P1 예산 엔진 (`engine/budget.ts`) | 논문 앵커 재현 0.9705/0.0295, σ0.0916, 45bn binding | 일치 |
| 바닐라 데스크 (`engine/instruments.ts`) | 칼라 패리티 1e-14, three-way/seagull 제로코스트 1e-15, 꼬리 정직 표기 | 일치 |
| P2 표면 (exotic_surface.json) | KO 앵커 43.5% vs 논문 43.7% | 일치 |
| European quanto (`engine/quanto.ts`) | 점프-콴토 MC 대비 <0.1%, 배리어 MC가 표면 재현 | 일치 |
| 격자 foil (`engine/lattice.ts`) | CRR↔고유함수 해석해↔good-RNG MC 삼자 수렴 (27.4/27.9/26.8%) | 일치 |
| 백테스트 (`engine/backtest.ts`) | Python↔TS 완전 일치 (89.1/75.0/90.0, ρ<0 79%), 윈도우 36–120m·예산 스윕 robust, 무룩어헤드+거래비용 | 일치 |
| P2 c* 모순 | build_ultimate(“c=1 최적”) 독립 반증 → `_archive/` 퇴출. ERP 포물선은 논문 인증 모멘트(−0.548, 51.90→48.76bn)에서 정확 복원, ~6% 2차 레버로 정직 표기 | 해결 |

핵심 판단: **연구 정합성은 건전하다.** 유일한 실질 모순(c=1 vs c*<0)은 판정·해소됐고, ERP의 모든 수치는 (a) frozen 논문 엔진, (b) 논문 인증값, (c) 독립 재현 셋 중 하나로 소급 가능하며 과장(“72배” 정규화 아티팩트, Sharpe 알파 프레이밍)은 기각됐다.

### A2. 발견된 부정확·부채 (Phase F에서 일괄 수정)
1. **`index.html` AI-가독성 폴백이 구식** — 바닐라는 “zero-cost collar desk”만, 전략 라이브러리(swap·cap·three-way·seagull)·European ablation·lattice foil·**Out-of-sample 모듈 전체** 누락. OG 설명도 동반 갱신.
2. **죽은 CSS**: `.ins-bookflash`(Instruments.css:313), `.me-flash`(MetricEntry.css:284) — 토스트 전환 후 잔재. `.bt-tiles`(Backtest.css:17) — 히어로 카드 전환 후 미사용.
3. **라벨 혼동**: 백테스트 “Naive 1:1 split”(= 커버리지 균등분할)이 P2의 c=1(델타 패스스루)과 다른 개념인데 이름이 겹침 → “Naive even split”으로.
4. **투어 미커버**: Out-of-sample 모듈이 7스텝 투어에 없음.
5. **Overview 체인이 4편 고정** — P5(KIKO note)·P6(비교 노트)가 리포에 있는데 미반영.
6. **backtest.json 정적** — 2026-07-16 고정 스냅샷. “라이브 파이프라인” 주장을 완성하려면 자동 갱신 필요(Phase R1).
7. **P3 앵커 미재검증** — cfh_summary.json을 논문 엔진 출력 그대로 신뢰 중(23.4/6.4/71.9bn). 체크섬+앵커 단언 스크립트 없음(Phase R3).
8. modeling repo: ESG 논문 WIP 미커밋(사용자 소관, 건드리지 말 것), backtest CSV는 gitignore(재생성 스크립트 문서화됨 — 정상).

---

## Part B — 완전한 ERP 로드맵

우선순위: **F → R1 → E1 → E2 → E4 → R2·R3 → E3 → E5 → P1 → P3 → P2 → P4 → D**
(F는 1커밋짜리 즉시 수정. R1이 최대 가치 — “라이브 추정 파이프라인” 주장을 실체로. E계열이 ‘완전한 ERP’ 정체성.)

### Phase F — 즉시 수정 (감사 A2의 1–5)
- F1 `index.html` 폴백 재작성: 모듈 10개 전부(Validation 그룹 포함), 전략 라이브러리·ablation·foil·백테스트 결과 요지 반영. OG description 동기화.
- F2 죽은 CSS 3건 제거.
- F3 백테스트 라벨 “Naive even split”으로 (TSX LABEL + NOTE만, 엔진 키는 유지).
- F4 투어 8스텝 추가: module 'backtest', target `.bt-controls`, lift `.bt-hero, .bt-table-wrap`, 제목 “Prove it out of sample” — 카피는 ‘40년 실데이터, 분산 89%, 알파 아님’ 요지.
- F5 Overview 체인 밑에 한 줄 노트 행: “+ two applied notes: KIKO forensics (P5) · benign vs lethal barrier (P6)” — 카드 아님, 텍스트 행.

### Phase R — Rigor/자동화
- R1 **월간 백테스트 자동 갱신**: `.github/workflows/backtest.yml` (market.yml 패턴 복제, `cron: '0 7 3 * *'` 매월 3일). 스텝: checkout → setup-python(3.11) → `FRED_API_KEY` secret으로 modeling의 fetch+`backtest.py` 로직을 **hong-erp 내 `scripts/refresh-backtest.py`로 이식**(stdlib+numpy만) → `src/data/backtest.json` 갱신 커밋 → deploy.yml dispatch. Backtest 모듈 meta에 “auto-refreshed monthly” 문구.
- R2 **엔진 인증 CI**: `scripts/verify-engine.mjs` + 칼라 패리티 + TS↔JSON 백테스트 스모크를 deploy 전 잡으로. Overview 증명 스트립에 최근 인증일 표시(빌드타임 주입).
- R3 **P3 앵커 테스트**: `scripts/verify-cfh.mjs` — cfh_summary.json의 ineffA/ineffB/postKO/premium을 논문 수치와 단언, R2 CI에 포함.

### Phase E — ERP 완전성 (핵심)
- E1 **역할 스위처**: erp.tsx에 `role: 'division' | 'treasury' | 'audit' | 'cfo'` (localStorage 영속, 기본 treasury). 사이드바 브랜드 아래 컴팩트 셀렉터. 게이팅 — division: 메트릭 제출만 / treasury: 부킹만 / audit: 승인·반려만 / cfo: 지정(designation)만 + 전체 열람. 게이팅은 **버튼 disabled + title 사유**(숨기지 말 것 — 데모 목적상 구조가 보여야 함). 액터 이름도 역할 따라(제출자=디비전 헤드, 승인=J. Kim…).
- E2 **Audit trail 화면**: Validation 그룹에 “Audit trail” 모듈. `state.events` 전체를 시간역순 테이블(actor/verb/detail/timeAgo), 필터 칩(division·verb), 이벤트 수 배지. 기존 Activity 컴포넌트 확장으로 최소 구현.
- E3 **Period close**: “마감” 액션(CFO 전용) — 현 월 승인 메트릭·블로터를 스냅샷으로 동결(`closes: [{month, metricsHash, tradeCount, dStar}]`), 마감 후 해당 월 수정은 신규 이벤트로만. Metrics 화면에 잠금 배지.
- E4 **Disclosure report builder** (ESG ERP의 산출물 그 자체): 새 모듈 “Disclosure report”. 승인 메트릭(프레임워크 매핑 칩 포함) + 중대성 결과 + d*·h* + 헤지북 요약 + KO 리스크를 ISSB/KSSB 4기둥(Governance/Strategy/Risk/Metrics) 구조의 읽기 전용 문서로 조립. `@media print` CSS로 PDF 저장 가능. 데이터는 전부 기존 state/spine에서 — 새 엔진 없음.
- E5 **CSV**: 메트릭 가져오기(파싱→검증→승인큐 일괄 투입), 블로터/원장 내보내기. 파일 API만, 라이브러리 금지.

### Phase P — Product
- P1 **Cmd+K 커맨드 팔레트**: 모듈 점프 + 주요 액션(Reset demo, Start tour, 역할 전환). 자체 구현(리스트+fuzzy startsWith), 포털+포커스 트랩, `⌘K`/`ctrl+K`.
- P2 **KR/EN 토글**: copy dictionary 방식은 과대 — **모듈 desc·투어·배너 등 ‘설명 층’만** KR 번역 오버레이(`i18n.ts`, 기본 EN). 숫자·차트 라벨은 EN 유지.
- P3 파라미터 세션 유지: 각 콕핏 파라미터를 `hongerp-params-v1`로 localStorage 저장/복원. Reset demo가 함께 초기화.
- P4 검색엔진/공유 대비: sitemap 정적 갱신, OG 이미지 재생성(`shot-og.mjs` 재실행 — 새 모듈 반영).

### Phase D — 승계된 UX 잔여 (ux-overhaul-plan.md에서 이관)
- D1 타일 값 펄스 — settle-only 감지기(드래그 중 억제: 마지막 변경 후 250ms 지나야 1회 펄스).
- D2 수면(waterline) 섹션 디바이더 모티프 + 다크 검증.
- D3 가로 스크롤 표 우측 페이드 힌트, 히어로 캐러셀 스와이프.

### 연구 사이드 (modeling repo, 별도 세션급 — ERP와 분리)
- 2D-BS / 1D-Merton ablation (P2 벤치마크 표 — 이전에 합의된 정석, 미착수).
- P2 −0.548 robustness appendix(논문 스스로 “re-implementation-derived” 명시 — 원하면 seed·basis 민감도 표 추가).
- ESG 논문 WIP 커밋은 사용자 판단.

### 세션 시작 프롬프트 템플릿
```
~/hong-erp에서 docs/erp-master-plan.md의 Phase X를 실행해라.
스펙 수치 그대로, 스코프 밖 파일 금지. 끝나면 tsc/build + 검증 후
"Phase X: <제목>"으로 커밋·push·배포 확인까지.
```
