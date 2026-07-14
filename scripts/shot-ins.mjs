import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 940 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.click('text=Hedge Instruments')
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/ins-collar.png` })
await browser.close()
