// Render check for the P1 strip ledger panel + mixed-program readout (EN/KO).
import { chromium } from 'playwright'
const out = process.argv[2] ?? '/tmp'
const base = process.argv[3] ?? 'http://localhost:4199/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 960 } })
await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Hedge Budget', exact: true }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/strip-en.png`, fullPage: true })
const ko = page.getByRole('button', { name: /^KO$|한국어|KR/ }).first()
if (await ko.count()) {
  await ko.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/strip-ko.png`, fullPage: true })
}
await browser.close()
