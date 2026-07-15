import { chromium } from 'playwright'
const out = process.argv[2] ?? '/tmp'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })

// dashboard cockpit: params rail + tiles/chart in one viewport
await page.click('text=Decision Dashboard')
await page.waitForTimeout(500)
await page.screenshot({ path: out + '/dash-cockpit.png' })

// drag a slider, confirm results react without scrolling
const slider = page.locator('.db-params input[type=range]').nth(7) // lambda
await slider.fill('11')
await page.waitForTimeout(300)
await page.screenshot({ path: out + '/dash-drag.png' })

// scenario: sticky params + table
await page.click('text=Scenarios')
await page.waitForTimeout(500)
await page.screenshot({ path: out + '/scenario.png' })

// tour spotlight: step 1 — target must stay bright inside the dim wash
await page.click('text=Overview')
await page.waitForTimeout(400)
await page.click('text=Take a look')
await page.waitForTimeout(1400)
await page.screenshot({ path: out + '/tour-step1.png' })
await page.click('text=Next →')
await page.waitForTimeout(1400)
await page.screenshot({ path: out + '/tour-step2.png' })

await browser.close()
