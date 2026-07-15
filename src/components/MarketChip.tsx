import { MARKET, marketDate } from '../state/market'

// "The engines run on today's market" — one badge, same everywhere.
export default function MarketChip() {
  return (
    <span className="market-chip" title={`Snapshot committed ${MARKET.fetchedAt} · ${MARKET.source}`}>
      <span className="market-dot" />
      WTI <strong>${MARKET.wti.value.toFixed(2)}</strong> · USD/KRW{' '}
      <strong>₩{MARKET.usdkrw.value.toLocaleString()}</strong>
      <span className="market-date">FRED · {marketDate}</span>
    </span>
  )
}
