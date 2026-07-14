import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } })
await page.goto('https://jihongparker.github.io/hong-erp/', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.screenshot({ path: process.argv[2] + '/live.png' })
await browser.close()
