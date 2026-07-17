// verify: hero scrollcue centred+enlarged, ov-live lede sentence-break,
// strategy/structure HelpDots, exotic slider dots — KO mode
import { chromium } from 'playwright'
const out = process.argv[2] ?? '/tmp'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4200/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('hongerp-lang', 'ko'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/ov-hero.png` })

// live section lede
await page.locator('.ov-live-head').scrollIntoViewIfNeeded()
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/ov-live.png` })

// instruments: strategy help dots
await page.getByRole('button', { name: '헤지 상품', exact: true }).click()
await page.waitForTimeout(500)
const stratDots = page.locator('.ins-strat .p-help-btn')
console.log('strategy dots:', await stratDots.count())
await stratDots.nth(3).hover()
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/ins-help.png` })

// exotic desk: structure + slider dots
await page.locator('.ins-tabs button').nth(1).click()
await page.waitForTimeout(600)
console.log('exotic dots:', await page.locator('.ex .p-help-btn').count())
await page.locator('.ex-deck .p-help-btn').first().hover()
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/ex-help.png` })
await browser.close()
