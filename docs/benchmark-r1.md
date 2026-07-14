# 벤치마크 라운드 1 — 국내 4대 회계법인 ESG 솔루션 (2026-07-14)

홍ERP가 채울 빈칸을 확정하기 위한 1차 조사. 결론부터: **4사 전부 "공시 워크플로/컨설팅" 층에 머물러 있고, 의사결정 층(최적 공시강도 d\*, 최적 헤지 h\*)을 제품화한 곳은 없다.** 홍ERP의 포지션은 유효하다.

## 비교표

| | 삼일PwC | 삼정KPMG | 딜로이트 안진 | EY한영 |
|---|---|---|---|---|
| 제품명 | Sustainability Solutions | **ESG 링크(LINC)** + ESG 리포팅 어시스턴트 | One ESG (자문 총괄기구) | ESG Impact Hub (전문조직) |
| 형태 | 워크플로 SaaS | IT 플랫폼 + 생성형 AI 보조 | 컨설팅 중심 + 외부 툴(Measurabl·GRESB) 재판매 | 컨설팅 중심 (150인 조직) |
| 계정체계 | **COSA** (지속가능성 계정 계층코드 → GRI/ISSB/KCGS/MSCI 매핑) | 계정별 재무제표 영향 도출 언급 | — | — |
| 중대성 평가 | IRO 표준 DB → 설문 자동화 → 이중 중대성 매트릭스 | 기후 리스크·기회 식별 | 기후 리스크 측정·관리 자문 | 기후 리스크 평가 자문 |
| 보고서 | 전기 학습·AI 초안·번역·디자인 | 생성형 AI 리포팅 어시스턴트 | 지속가능경영보고서 자문 | 통합보고·TCFD·IFRS S2 대응 |
| 정량 모듈 | 지표 입력→증빙→Validation→결재 | 공시 데이터 플랫폼 | SHE/공시 데이터 플랫폼 구축(SI) | Scope 1~3 산정 지원 |
| 거버넌스 | RBAC·Audit Trail | — | ESG 감사·인증 | ESG 인증 |
| **의사결정 층** | **없음** | **없음** (재무 영향 "도출"까지만 — 최적화 아님) | **없음** | **없음** |

## 관찰

1. **KPMG ESG 링크가 홍ERP에 가장 가까운 경쟁자다.** "기후 리스크 → 계정별 영향 → 재무제표 변화 도출"까지 간다고 홍보한다. 그러나 이는 *영향의 회계적 번역*(translation)이지 *통제변수의 최적화*(optimization)가 아니다. "공시를 얼마나 할지, 그에 따라 헤지를 어떻게 조정할지"라는 FOC는 여전히 없다.
2. **딜로이트·EY는 제품이 아니라 조직이다.** One ESG·Impact Hub는 자문 인력 풀의 브랜딩이고, 소프트웨어는 외부 툴(Measurabl, GRESB) 연동이나 고객사별 SI다. 벤치마킹 대상은 화면이 아니라 서비스 스코프.
3. **4사 공통의 암묵적 가정**: 공시는 컴플라이언스 비용이다. 홍ERP의 차별점은 논문의 Λ(d) = φ + λe^(−kd) — 공시를 잔존위험 그림자가격을 낮추는 **통제변수**로 보고, 헤지비율과 연립으로 푸는 것. 이 층은 4사 어디에도 없다.
4. **UI 벤치마킹 우선순위**: PwC(COSA 계정 트리·중대성 매트릭스·검증 워크플로) > KPMG(재무 영향 화면) > 나머지. 상표·브랜딩은 참조하지 않는다 — 구조만.

## 라운드 2 후보 (추후)

- 글로벌 SaaS: Workiva, Watershed, Persefoni (공시·탄소회계 전문 — 결정 층 유무 확인)
- KPMG ESG 링크 데모/스크린샷 확보 시 화면 단위 비교
- KSSB 공시 기준 확정 일정 추적 (엔진의 노출-정량화 사다리 스토리와 직결)

## 출처

- [ZDNet — 삼정KPMG ESG 링크 런칭](https://zdnet.co.kr/view/?no=20230619163956) · [서울경제 — ESG 대응 플랫폼 업계 최초 출시](https://www.sedaily.com/NewsView/29QWZHJSX1) · [헤럴드경제 — ESG 리포팅 어시스턴트](https://biz.heraldcorp.com/article/10663266)
- [Deloitte Korea — One ESG](https://www.deloitte.com/kr/ko/services/firmwide-integrated-services/services/one-esg.html) · [딜로이트-어패스리질리언스 MOU (Measurabl·GRESB)](https://www2.deloitte.com/kr/ko/footerlinks/pressreleasespage/2022/press-release-20220407.html)
- [EY Korea — ESG 및 지속가능성](https://www.ey.com/ko_kr/services/assurance/esg-sustainability) · [EY 지속가능성 서비스](https://www.ey.com/ko_kr/services/sustainability/services)
- 삼일PwC 브로슈어 분석은 2026-07-14 modeling 세션 기록 기준 (samilpwc_kr-sustainability-solutions.pdf, 15쪽 전수 검토)
