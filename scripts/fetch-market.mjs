// Fetch the latest WTI spot and USD/KRW from FRED and write the market
// snapshot the app ships with. Run by the scheduled market workflow (secret
// FRED_API_KEY) and locally with the key in the environment.
//   node scripts/fetch-market.mjs
import { writeFileSync } from 'node:fs'

const KEY = process.env.FRED_API_KEY
if (!KEY) {
  console.error('FRED_API_KEY not set')
  process.exit(1)
}

async function latest(seriesId) {
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${KEY}&file_type=json&sort_order=desc&limit=10`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${seriesId}: HTTP ${res.status}`)
  const json = await res.json()
  const obs = json.observations.find((o) => o.value !== '.')
  if (!obs) throw new Error(`${seriesId}: no numeric observation`)
  return { value: Number(obs.value), date: obs.date }
}

const [wti, usdkrw] = await Promise.all([latest('DCOILWTICO'), latest('DEXKOUS')])
const snapshot = {
  wti, // USD/bbl, FRED DCOILWTICO
  usdkrw, // KRW per USD, FRED DEXKOUS
  fetchedAt: new Date().toISOString(),
  source: 'FRED (Federal Reserve Bank of St. Louis)',
}
writeFileSync(new URL('../src/data/market_snapshot.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n')
console.log('market_snapshot.json:', JSON.stringify(snapshot))
