// verify the ParamRow "?" help: icon renders, hover shows the tip, KO too
import { chromium } from 'playwright'
const out = process.argv[2] ?? '/tmp'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 960 } })
await page.goto('http://localhost:4200/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Decision Dashboard', exact: true }).click()
await page.waitForTimeout(400)

const icons = page.locator('.p-help button')
console.log('help icons on dashboard:', await icons.count())
await icons.first().hover()
await page.waitForTimeout(300)
const tip = page.locator('.p-help-tip').first()
console.log('tip visible (EN):', await tip.isVisible(), '| text:', await tip.textContent())
await page.screenshot({ path: `${out}/help-en.png` })

// switch guide language to Korean (set directly — the segment sits under a float)
await page.evaluate(() => localStorage.setItem('hongerp-lang', 'ko'))
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: '의사결정 대시보드', exact: true }).click()
await page.waitForTimeout(400)
await page.locator('.p-help button').first().hover()
await page.waitForTimeout(300)
console.log('tip visible (KO):', await tip.isVisible(), '| text:', await tip.textContent())
await page.screenshot({ path: `${out}/help-ko.png` })

// click-toggle (touch path)
await page.locator('.p-help button').nth(3).click()
await page.waitForTimeout(200)
console.log('click-open works:', await page.locator('.p-help.open .p-help-tip').isVisible())
await browser.close()
