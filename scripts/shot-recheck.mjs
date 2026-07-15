import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 980 } })
const nav = (l) => page.locator('.nav-item', { hasText: l }).click()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })

// exotic booking flow (밤에 미검증)
await nav('Hedge Instruments')
await page.getByRole('button', { name: /Double-KO quanto/ }).click()
await page.waitForTimeout(500)
await page.locator('.ins-binline select').selectOption('chemicals')
await page.locator('.ins-binline input').fill('0.30')
await page.getByRole('button', { name: 'Book quanto' }).click()
await page.waitForTimeout(300)
console.log('exotic book flash:', (await page.locator('.ins-bookflash').textContent())?.slice(0, 50))
await page.screenshot({ path: `${out}/rc-exotic.png`, fullPage: true })
await nav('Hedge Accounting')
await page.waitForTimeout(300)
const top = await page.locator('.ac-blotter tbody tr').first().textContent()
console.log('blotter top:', top?.slice(0, 70), top?.includes('Chemicals') && top?.includes('quanto') ? 'OK' : 'FAIL')

// tour with new panels (glow targets intact)
await nav('Overview')
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Take a look/ }).click()
await page.waitForTimeout(1300)
const glow1 = await page.locator('.tour-glow').count()
await page.getByRole('button', { name: 'Next →' }).click() // budget
await page.getByRole('button', { name: 'Next →' }).click() // instruments cap
await page.waitForTimeout(1300)
const glow3 = await page.locator('.tour-glow').count()
console.log(`tour glows: step1=${glow1} step3=${glow3} (${glow1 === 1 && glow3 === 1 ? 'OK' : 'FAIL'})`)
await page.locator('.tour-close').click()

// full-page audits of remaining modules
for (const [n, l] of [['ov','Overview'],['bud','Hedge Budget'],['cosa','Chart of Accounts'],['mat','Materiality'],['scen','Scenarios']]) {
  await nav(l)
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}/rc-${n}.png`, fullPage: true })
}
// dark mode ERP screens
await page.emulateMedia({ colorScheme: 'dark' })
await nav('Metrics Entry')
await page.waitForTimeout(350)
await page.screenshot({ path: `${out}/rc-metrics-dark.png`, fullPage: true })
await nav('Decision Dashboard')
await page.waitForTimeout(350)
await page.screenshot({ path: `${out}/rc-dash-dark.png`, fullPage: true })

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
console.log('h-overflow:', overflow, '| console/page errors:', errors.length ? errors : 'none')
await browser.close()
