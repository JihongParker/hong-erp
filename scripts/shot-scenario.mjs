import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.click('text=시나리오')
await page.waitForTimeout(400)
await page.screenshot({ path: process.argv[2] + '/scenario.png' })
await browser.close()
