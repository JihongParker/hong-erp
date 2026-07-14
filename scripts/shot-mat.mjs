import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.locator('.nav-item', { hasText: 'Materiality' }).click()
await page.waitForTimeout(400)
const innerScroll = await page.evaluate(() => {
  const el = document.querySelector('.mat-table-wrap')
  return { x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight }
})
console.log('table inner scroll (should be 0/0):', JSON.stringify(innerScroll))
await page.screenshot({ path: `${out}/v3-mat.png`, fullPage: true })
await browser.close()
