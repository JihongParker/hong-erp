// HongERP sustainability chart of accounts (demo taxonomy)
// Own code scheme: <pillar>-<category##>-<account##>-<datapoint##>
// Framework mappings: GRI (public standard numbers), KSSB (S1/S2 paragraphs),
// KCGS & MSCI (category level). Mappings are illustrative and NOT validated
// for practice — the point is the structure: hierarchical codes mapped to
// multiple frameworks at the datapoint level.

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
    name: 'Environment',
    categories: [
      {
        code: 'E-01',
        name: 'Climate',
        accounts: [
          {
            code: 'E-01-01',
            name: 'GHG emissions',
            datapoints: [
              { code: 'E-01-01-01', name: 'Scope 1 gross emissions', unit: 'tCO₂eq', frameworks: { gri: '305-1', kssb: 'S2-29(a)', kcgs: 'E-Climate', msci: 'Carbon Emissions' } },
              { code: 'E-01-01-02', name: 'Scope 2 gross emissions (location-based)', unit: 'tCO₂eq', frameworks: { gri: '305-2', kssb: 'S2-29(a)', kcgs: 'E-Climate', msci: 'Carbon Emissions' } },
              { code: 'E-01-01-03', name: 'Scope 2 gross emissions (market-based)', unit: 'tCO₂eq', frameworks: { gri: '305-2', kssb: 'S2-29(a)' } },
              { code: 'E-01-01-04', name: 'Scope 3 gross emissions', unit: 'tCO₂eq', frameworks: { gri: '305-3', kssb: 'S2-29(a)', msci: 'Carbon Emissions' } },
              { code: 'E-01-01-05', name: 'Emissions intensity (per revenue)', unit: 'tCO₂eq/₩100M', frameworks: { gri: '305-4', kssb: 'S2-29(b)' } },
            ],
          },
          {
            code: 'E-01-02',
            name: 'Climate risks & opportunities',
            datapoints: [
              { code: 'E-01-02-01', name: 'Assets exposed to physical risk', unit: '%', frameworks: { kssb: 'S2-10', msci: 'Climate Vuln.' } },
              { code: 'E-01-02-02', name: 'Revenue exposed to transition risk', unit: '%', frameworks: { kssb: 'S2-10' } },
              { code: 'E-01-02-03', name: 'Internal carbon price', unit: '₩/tCO₂eq', frameworks: { kssb: 'S2-29(f)' } },
              { code: 'E-01-02-04', name: 'Climate scenario analysis performed', frameworks: { kssb: 'S2-22' } },
            ],
          },
          {
            code: 'E-01-03',
            name: 'Energy',
            datapoints: [
              { code: 'E-01-03-01', name: 'Total energy consumption', unit: 'TJ', frameworks: { gri: '302-1', kcgs: 'E-Env' } },
              { code: 'E-01-03-02', name: 'Renewable energy share', unit: '%', frameworks: { gri: '302-1', msci: 'Clean Tech' } },
              { code: 'E-01-03-03', name: 'Energy intensity', unit: 'TJ/₩100M', frameworks: { gri: '302-3' } },
            ],
          },
        ],
      },
      {
        code: 'E-02',
        name: 'Water & resources',
        accounts: [
          {
            code: 'E-02-01',
            name: 'Water',
            datapoints: [
              { code: 'E-02-01-01', name: 'Total water withdrawal', unit: '1,000㎥', frameworks: { gri: '303-3', msci: 'Water Stress' } },
              { code: 'E-02-01-02', name: 'Withdrawal in water-stressed areas', unit: '%', frameworks: { gri: '303-3', msci: 'Water Stress' } },
              { code: 'E-02-01-03', name: 'Water reuse rate', unit: '%', frameworks: { gri: '303-4' } },
            ],
          },
          {
            code: 'E-02-02',
            name: 'Waste & circularity',
            datapoints: [
              { code: 'E-02-02-01', name: 'Total waste generated', unit: 't', frameworks: { gri: '306-3', kcgs: 'E-Env' } },
              { code: 'E-02-02-02', name: 'Recycling rate', unit: '%', frameworks: { gri: '306-4' } },
              { code: 'E-02-02-03', name: 'Hazardous waste generated', unit: 't', frameworks: { gri: '306-3' } },
            ],
          },
        ],
      },
      {
        code: 'E-03',
        name: 'Pollution & biodiversity',
        accounts: [
          {
            code: 'E-03-01',
            name: 'Air & water pollution',
            datapoints: [
              { code: 'E-03-01-01', name: 'NOx emissions', unit: 't', frameworks: { gri: '305-7' } },
              { code: 'E-03-01-02', name: 'SOx emissions', unit: 't', frameworks: { gri: '305-7' } },
              { code: 'E-03-01-03', name: 'Environmental law violations', unit: 'cases', frameworks: { gri: '2-27', kcgs: 'E-Env' } },
            ],
          },
          {
            code: 'E-03-02',
            name: 'Biodiversity',
            datapoints: [
              { code: 'E-03-02-01', name: 'Sites adjacent to protected areas', unit: 'sites', frameworks: { gri: '304-1', msci: 'Biodiversity' } },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'S',
    name: 'Social',
    categories: [
      {
        code: 'S-01',
        name: 'Human capital',
        accounts: [
          {
            code: 'S-01-01',
            name: 'Employment & diversity',
            datapoints: [
              { code: 'S-01-01-01', name: 'Total employees', unit: 'persons', frameworks: { gri: '2-7', kcgs: 'S-Labor' } },
              { code: 'S-01-01-02', name: 'Female employee share', unit: '%', frameworks: { gri: '405-1', msci: 'HC Development' } },
              { code: 'S-01-01-03', name: 'Female managers share', unit: '%', frameworks: { gri: '405-1', kcgs: 'S-Labor' } },
              { code: 'S-01-01-04', name: 'Voluntary turnover rate', unit: '%', frameworks: { gri: '401-1' } },
            ],
          },
          {
            code: 'S-01-02',
            name: 'Health & safety',
            datapoints: [
              { code: 'S-01-02-01', name: 'Lost-time injury frequency rate (LTIFR)', unit: 'per 1M hrs', frameworks: { gri: '403-9', kcgs: 'S-Labor', msci: 'HSE' } },
              { code: 'S-01-02-02', name: 'Fatalities', unit: 'cases', frameworks: { gri: '403-9', kcgs: 'S-Labor' } },
              { code: 'S-01-02-03', name: 'Contractor injuries included', frameworks: { gri: '403-8' } },
            ],
          },
          {
            code: 'S-01-03',
            name: 'Training & development',
            datapoints: [
              { code: 'S-01-03-01', name: 'Training hours per employee', unit: 'hours', frameworks: { gri: '404-1' } },
              { code: 'S-01-03-02', name: 'Training spend per employee', unit: '₩10K', frameworks: { gri: '404-2' } },
            ],
          },
        ],
      },
      {
        code: 'S-02',
        name: 'Supply chain & product',
        accounts: [
          {
            code: 'S-02-01',
            name: 'Supply chain management',
            datapoints: [
              { code: 'S-02-01-01', name: 'Suppliers under ESG assessment', unit: '%', frameworks: { gri: '308-1', msci: 'Supply Chain' } },
              { code: 'S-02-01-02', name: 'High-risk supplier corrective actions', unit: 'cases', frameworks: { gri: '414-2' } },
            ],
          },
          {
            code: 'S-02-02',
            name: 'Product responsibility',
            datapoints: [
              { code: 'S-02-02-01', name: 'Product recalls', unit: 'cases', frameworks: { gri: '416-2', msci: 'Product Safety' } },
              { code: 'S-02-02-02', name: 'Customer data breaches', unit: 'cases', frameworks: { gri: '418-1', msci: 'Privacy' } },
            ],
          },
        ],
      },
      {
        code: 'S-03',
        name: 'Community',
        accounts: [
          {
            code: 'S-03-01',
            name: 'Community investment',
            datapoints: [
              { code: 'S-03-01-01', name: 'Community investment spend', unit: '₩100M', frameworks: { gri: '413-1', kcgs: 'S-Community' } },
              { code: 'S-03-01-02', name: 'Employee volunteering hours', unit: 'hours', frameworks: { gri: '413-1' } },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'G',
    name: 'Governance',
    categories: [
      {
        code: 'G-01',
        name: 'Board',
        accounts: [
          {
            code: 'G-01-01',
            name: 'Board composition',
            datapoints: [
              { code: 'G-01-01-01', name: 'Independent director share', unit: '%', frameworks: { gri: '2-9', kcgs: 'G-Board', msci: 'Board' } },
              { code: 'G-01-01-02', name: 'Female directors', unit: 'persons', frameworks: { gri: '405-1', kcgs: 'G-Board', msci: 'Board' } },
              { code: 'G-01-01-03', name: 'Board attendance rate', unit: '%', frameworks: { kcgs: 'G-Board' } },
              { code: 'G-01-01-04', name: 'Committee overseeing sustainability', frameworks: { gri: '2-12', kssb: 'S1-27' } },
            ],
          },
          {
            code: 'G-01-02',
            name: 'Remuneration',
            datapoints: [
              { code: 'G-01-02-01', name: 'CEO pay to median employee pay', unit: 'ratio', frameworks: { gri: '2-21', msci: 'Pay' } },
              { code: 'G-01-02-02', name: 'ESG-linked remuneration share', unit: '%', frameworks: { kssb: 'S2-6(a)(v)' } },
            ],
          },
        ],
      },
      {
        code: 'G-02',
        name: 'Ethics & risk',
        accounts: [
          {
            code: 'G-02-01',
            name: 'Ethics & anti-corruption',
            datapoints: [
              { code: 'G-02-01-01', name: 'Corruption-related sanctions', unit: 'cases', frameworks: { gri: '205-3', kcgs: 'G-Audit', msci: 'Ethics' } },
              { code: 'G-02-01-02', name: 'Ethics training completion', unit: '%', frameworks: { gri: '205-2' } },
              { code: 'G-02-01-03', name: 'Whistleblower reports received', unit: 'cases', frameworks: { gri: '2-26' } },
            ],
          },
          {
            code: 'G-02-02',
            name: 'Risk management',
            datapoints: [
              { code: 'G-02-02-01', name: 'Enterprise risk management (ERM) in place', frameworks: { kssb: 'S1-43', kcgs: 'G-Audit' } },
              { code: 'G-02-02-02', name: 'Climate risk integrated into ERM', frameworks: { kssb: 'S2-25' } },
              { code: 'G-02-02-03', name: 'Market-risk hedge ratio disclosed', frameworks: { kssb: 'S2-29(e)' } },
            ],
          },
        ],
      },
      {
        code: 'G-03',
        name: 'Shareholders',
        accounts: [
          {
            code: 'G-03-01',
            name: 'Shareholder rights',
            datapoints: [
              { code: 'G-03-01-01', name: 'Electronic voting adopted', frameworks: { kcgs: 'G-Shareholder' } },
              { code: 'G-03-01-02', name: 'Dividend payout ratio', unit: '%', frameworks: { kcgs: 'G-Shareholder' } },
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
