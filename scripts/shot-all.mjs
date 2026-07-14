import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 940 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
for (const [name, label] of [
  ['dash', 'Decision Dashboard'],
  ['cosa', 'Chart of Accounts'],
  ['mat', 'Materiality'],
  ['metrics', 'Metrics Entry'],
  ['scenario', 'Scenarios'],
]) {
  await page.click(`text=${label}`)
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}/en-${name}.png` })
}
await page.click('text=Decision Dashboard')
await page.emulateMedia({ colorScheme: 'dark' })
const floor = page.locator('.db-params input[type=range]').last()
await floor.fill('4')
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/en-dash-dark-floor.png` })
await browser.close()
