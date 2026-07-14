import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.screenshot({ path: `${out}/final-overview.png` })
// start tour
await page.getByRole('button', { name: /Take the 90-second tour/ }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/final-tour1.png` })
// advance to exotic step (step 4)
await page.getByRole('button', { name: 'Next →' }).click()
await page.getByRole('button', { name: 'Next →' }).click()
await page.getByRole('button', { name: 'Next →' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/final-tour4.png` })
// materiality page-scroll check
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
console.log('page horizontal overflow px:', overflow)
await browser.close()
