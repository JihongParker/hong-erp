// 홍ERP 지속가능성 계정체계 (가상 taxonomy)
// 코드 체계는 자체 설계: <필라>-<카테고리2자리>-<계정2자리>-<데이터포인트2자리>
// 프레임워크 매핑: GRI(공개 표준 번호), KSSB(S1/S2 문단), KCGS·MSCI(범주 수준)
// 실무 매핑의 정합성 검증은 하지 않은 데모 데이터다 — 구조를 보여주는 것이 목적.

export interface Datapoint {
  code: string
  name: string
  unit?: string
  frameworks: { gri?: string; kssb?: string; kcgs?: string; msci?: string }
}

export interface Account {
  code: string
  name: string
  datapoints: Datapoint[]
}

export interface Category {
  code: string
  name: string
  accounts: Account[]
}

export interface Pillar {
  code: 'E' | 'S' | 'G'
  name: string
  categories: Category[]
}

export const TAXONOMY: Pillar[] = [
  {
    code: 'E',
    name: '환경',
    categories: [
      {
        code: 'E-01',
        name: '기후변화',
        accounts: [
          {
            code: 'E-01-01',
            name: '온실가스 배출',
            datapoints: [
              { code: 'E-01-01-01', name: 'Scope 1 총배출량', unit: 'tCO₂eq', frameworks: { gri: '305-1', kssb: 'S2-29(a)', kcgs: 'E-기후', msci: 'Carbon Emissions' } },
              { code: 'E-01-01-02', name: 'Scope 2 총배출량 (지역기반)', unit: 'tCO₂eq', frameworks: { gri: '305-2', kssb: 'S2-29(a)', kcgs: 'E-기후', msci: 'Carbon Emissions' } },
              { code: 'E-01-01-03', name: 'Scope 2 총배출량 (시장기반)', unit: 'tCO₂eq', frameworks: { gri: '305-2', kssb: 'S2-29(a)' } },
              { code: 'E-01-01-04', name: 'Scope 3 총배출량', unit: 'tCO₂eq', frameworks: { gri: '305-3', kssb: 'S2-29(a)', msci: 'Carbon Emissions' } },
              { code: 'E-01-01-05', name: '배출집약도 (매출액당)', unit: 'tCO₂eq/억원', frameworks: { gri: '305-4', kssb: 'S2-29(b)' } },
            ],
          },
          {
            code: 'E-01-02',
            name: '기후 리스크·기회',
            datapoints: [
              { code: 'E-01-02-01', name: '물리적 리스크 노출 자산 비중', unit: '%', frameworks: { kssb: 'S2-10', msci: 'Climate Vuln.' } },
              { code: 'E-01-02-02', name: '전환 리스크 노출 매출 비중', unit: '%', frameworks: { kssb: 'S2-10' } },
              { code: 'E-01-02-03', name: '내부 탄소가격', unit: '원/tCO₂eq', frameworks: { kssb: 'S2-29(f)' } },
              { code: 'E-01-02-04', name: '기후 시나리오 분석 수행 여부', frameworks: { kssb: 'S2-22' } },
            ],
          },
          {
            code: 'E-01-03',
            name: '에너지',
            datapoints: [
              { code: 'E-01-03-01', name: '총 에너지 사용량', unit: 'TJ', frameworks: { gri: '302-1', kcgs: 'E-환경' } },
              { code: 'E-01-03-02', name: '재생에너지 비중', unit: '%', frameworks: { gri: '302-1', msci: 'Clean Tech' } },
              { code: 'E-01-03-03', name: '에너지 집약도', unit: 'TJ/억원', frameworks: { gri: '302-3' } },
            ],
          },
        ],
      },
      {
        code: 'E-02',
        name: '물·자원',
        accounts: [
          {
            code: 'E-02-01',
            name: '용수',
            datapoints: [
              { code: 'E-02-01-01', name: '총 취수량', unit: '천㎥', frameworks: { gri: '303-3', msci: 'Water Stress' } },
              { code: 'E-02-01-02', name: '물 스트레스 지역 취수 비중', unit: '%', frameworks: { gri: '303-3', msci: 'Water Stress' } },
              { code: 'E-02-01-03', name: '용수 재이용률', unit: '%', frameworks: { gri: '303-4' } },
            ],
          },
          {
            code: 'E-02-02',
            name: '폐기물·순환',
            datapoints: [
              { code: 'E-02-02-01', name: '총 폐기물 발생량', unit: 't', frameworks: { gri: '306-3', kcgs: 'E-환경' } },
              { code: 'E-02-02-02', name: '재활용률', unit: '%', frameworks: { gri: '306-4' } },
              { code: 'E-02-02-03', name: '유해폐기물 발생량', unit: 't', frameworks: { gri: '306-3' } },
            ],
          },
        ],
      },
      {
        code: 'E-03',
        name: '오염·생물다양성',
        accounts: [
          {
            code: 'E-03-01',
            name: '대기·수질 오염',
            datapoints: [
              { code: 'E-03-01-01', name: 'NOx 배출량', unit: 't', frameworks: { gri: '305-7' } },
              { code: 'E-03-01-02', name: 'SOx 배출량', unit: 't', frameworks: { gri: '305-7' } },
              { code: 'E-03-01-03', name: '환경법규 위반 건수', unit: '건', frameworks: { gri: '2-27', kcgs: 'E-환경' } },
            ],
          },
          {
            code: 'E-03-02',
            name: '생물다양성',
            datapoints: [
              { code: 'E-03-02-01', name: '보호지역 인접 사업장 수', unit: '개', frameworks: { gri: '304-1', msci: 'Biodiversity' } },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'S',
    name: '사회',
    categories: [
      {
        code: 'S-01',
        name: '인적자본',
        accounts: [
          {
            code: 'S-01-01',
            name: '고용·다양성',
            datapoints: [
              { code: 'S-01-01-01', name: '총 임직원 수', unit: '명', frameworks: { gri: '2-7', kcgs: 'S-근로자' } },
              { code: 'S-01-01-02', name: '여성 임직원 비중', unit: '%', frameworks: { gri: '405-1', msci: 'HC Development' } },
              { code: 'S-01-01-03', name: '여성 관리자 비중', unit: '%', frameworks: { gri: '405-1', kcgs: 'S-근로자' } },
              { code: 'S-01-01-04', name: '자발적 이직률', unit: '%', frameworks: { gri: '401-1' } },
            ],
          },
          {
            code: 'S-01-02',
            name: '안전보건',
            datapoints: [
              { code: 'S-01-02-01', name: '근로손실재해율 (LTIFR)', unit: '건/백만시간', frameworks: { gri: '403-9', kcgs: 'S-근로자', msci: 'HSE' } },
              { code: 'S-01-02-02', name: '사망사고 건수', unit: '건', frameworks: { gri: '403-9', kcgs: 'S-근로자' } },
              { code: 'S-01-02-03', name: '협력사 재해율 포함 여부', frameworks: { gri: '403-8' } },
            ],
          },
          {
            code: 'S-01-03',
            name: '교육·개발',
            datapoints: [
              { code: 'S-01-03-01', name: '1인당 교육시간', unit: '시간', frameworks: { gri: '404-1' } },
              { code: 'S-01-03-02', name: '1인당 교육투자액', unit: '만원', frameworks: { gri: '404-2' } },
            ],
          },
        ],
      },
      {
        code: 'S-02',
        name: '공급망·제품',
        accounts: [
          {
            code: 'S-02-01',
            name: '공급망 관리',
            datapoints: [
              { code: 'S-02-01-01', name: 'ESG 평가 대상 협력사 비중', unit: '%', frameworks: { gri: '308-1', msci: 'Supply Chain' } },
              { code: 'S-02-01-02', name: '고위험 협력사 시정조치 건수', unit: '건', frameworks: { gri: '414-2' } },
            ],
          },
          {
            code: 'S-02-02',
            name: '제품 책임',
            datapoints: [
              { code: 'S-02-02-01', name: '제품 리콜 건수', unit: '건', frameworks: { gri: '416-2', msci: 'Product Safety' } },
              { code: 'S-02-02-02', name: '고객 정보 유출 건수', unit: '건', frameworks: { gri: '418-1', msci: 'Privacy' } },
            ],
          },
        ],
      },
      {
        code: 'S-03',
        name: '지역사회',
        accounts: [
          {
            code: 'S-03-01',
            name: '사회공헌',
            datapoints: [
              { code: 'S-03-01-01', name: '사회공헌 지출액', unit: '억원', frameworks: { gri: '413-1', kcgs: 'S-지역사회' } },
              { code: 'S-03-01-02', name: '임직원 봉사 시간', unit: '시간', frameworks: { gri: '413-1' } },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'G',
    name: '지배구조',
    categories: [
      {
        code: 'G-01',
        name: '이사회',
        accounts: [
          {
            code: 'G-01-01',
            name: '이사회 구성',
            datapoints: [
              { code: 'G-01-01-01', name: '사외이사 비중', unit: '%', frameworks: { gri: '2-9', kcgs: 'G-이사회', msci: 'Board' } },
              { code: 'G-01-01-02', name: '여성 이사 수', unit: '명', frameworks: { gri: '405-1', kcgs: 'G-이사회', msci: 'Board' } },
              { code: 'G-01-01-03', name: '이사회 출석률', unit: '%', frameworks: { kcgs: 'G-이사회' } },
              { code: 'G-01-01-04', name: '지속가능성 관장 위원회 유무', frameworks: { gri: '2-12', kssb: 'S1-27' } },
            ],
          },
          {
            code: 'G-01-02',
            name: '보수',
            datapoints: [
              { code: 'G-01-02-01', name: '대표이사 보수 대 직원 중위보수 배율', unit: '배', frameworks: { gri: '2-21', msci: 'Pay' } },
              { code: 'G-01-02-02', name: 'ESG 연계 보수 비중', unit: '%', frameworks: { kssb: 'S2-6(a)(v)' } },
            ],
          },
        ],
      },
      {
        code: 'G-02',
        name: '윤리·리스크',
        accounts: [
          {
            code: 'G-02-01',
            name: '윤리·반부패',
            datapoints: [
              { code: 'G-02-01-01', name: '부패 관련 제재 건수', unit: '건', frameworks: { gri: '205-3', kcgs: 'G-감사', msci: 'Ethics' } },
              { code: 'G-02-01-02', name: '윤리교육 이수율', unit: '%', frameworks: { gri: '205-2' } },
              { code: 'G-02-01-03', name: '내부신고 접수 건수', unit: '건', frameworks: { gri: '2-26' } },
            ],
          },
          {
            code: 'G-02-02',
            name: '리스크 관리',
            datapoints: [
              { code: 'G-02-02-01', name: '전사 리스크관리체계(ERM) 운영 여부', frameworks: { kssb: 'S1-43', kcgs: 'G-감사' } },
              { code: 'G-02-02-02', name: '기후 리스크의 ERM 통합 여부', frameworks: { kssb: 'S2-25' } },
              { code: 'G-02-02-03', name: '시장위험 헤지비율 공시 여부', frameworks: { kssb: 'S2-29(e)' } },
            ],
          },
        ],
      },
      {
        code: 'G-03',
        name: '주주',
        accounts: [
          {
            code: 'G-03-01',
            name: '주주권리',
            datapoints: [
              { code: 'G-03-01-01', name: '전자투표 도입 여부', frameworks: { kcgs: 'G-주주' } },
              { code: 'G-03-01-02', name: '배당성향', unit: '%', frameworks: { kcgs: 'G-주주' } },
            ],
          },
        ],
      },
    ],
  },
]

export function countDatapoints(): number {
  return TAXONOMY.reduce(
    (n, p) =>
      n +
      p.categories.reduce(
        (m, c) => m + c.accounts.reduce((k, a) => k + a.datapoints.length, 0),
        0,
      ),
    0,
  )
}
