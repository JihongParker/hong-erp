# 홍ERP

공시·헤지 **의사결정 층**을 갖춘 ESG ERP 프로토타입. 정적 SPA(Vite + React + TS) → GitHub Pages.

기존 회계법인 ESG 솔루션(공시 워크플로)이 비워둔 층을 채운다: 공시를 비용 센터가
아니라 잔존위험의 그림자가격 Λ(d) = φ + λe^(−kd) 를 낮추는 통제변수로 보고,
최적 헤지 h\*와 최적 공시강도 d\*를 하나의 최적화로 함께 푼다. 이론적 기반은
Park ESG-disclosure 논문(연구 프로그램 4편).

## 모듈 로드맵

| 모듈 | 내용 | 상태 |
|---|---|---|
| 결정 대시보드 | 파라미터 슬라이더(λ, k, a, φ, R, Σ, p) → h\*, d\* 라이브 재계산 | planned — 논문 수식 동결 후 엔진 포팅 |
| 계정체계 | COSA형 계정 트리 → 프레임워크 datapoint 매핑 | planned |
| 중대성 평가 | IRO 등록 → 이중 중대성 매트릭스 | planned |
| 지표 입력 | 입력 → 검증 규칙 → 결재 (UI 목업) | planned |
| 시나리오 | division-level 임의 파라미터 → 전략 배분 비교 | planned |

division-level 실데이터는 없다 — 사용자가 임의 파라미터를 넣으면 전략이 어떻게
구축되는지 보여주는 것이 목적. 벤치마크 근거는 `docs/benchmark-r1.md`.

## 원칙

- 특정 법인(PwC 등)의 명칭·로고·브랜딩을 복제하지 않는다. 구조만 참고한다.
- 백엔드 없음 — 모든 연산은 브라우저에서. 인증·DB·결재는 UI 목업으로만.
- 모듈 상태(planned/building/live)는 정직하게 유지한다.

## 개발

```bash
npm install
npm run dev     # 로컬 개발 서버
npm run build   # 프로덕션 빌드 (dist/)
```

`main` 푸시 시 GitHub Actions가 Pages로 자동 배포한다 (`.github/workflows/deploy.yml`).
