import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
for (const width of [1440, 1100]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
  for (const [name, label] of [
    ['dash', 'Decision Dashboard'],
    ['budget', 'Hedge Budget'],
    ['ins', 'Hedge Instruments'],
    ['acct', 'Hedge Accounting'],
    ['cosa', 'Chart of Accounts'],
    ['mat', 'Materiality'],
    ['metrics', 'Metrics Entry'],
    ['scen', 'Scenarios'],
  ]) {
    await page.locator('.nav-item', { hasText: label }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}/audit-${width}-${name}.png`, fullPage: true })
  }
  // exotic tab
  await page.locator('.nav-item', { hasText: 'Hedge Instruments' }).click()
  await page.getByRole('button', { name: /Double-KO quanto/ }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/audit-${width}-exotic.png`, fullPage: true })
  await page.close()
}
await browser.close()
