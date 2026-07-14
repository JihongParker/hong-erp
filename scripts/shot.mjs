import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
// 중대성 평가 모듈로 이동
await page.click('text=중대성 평가')
await page.waitForTimeout(400)
await page.screenshot({ path: process.argv[2] + '/mat-light.png' })
// 다크 모드
await page.emulateMedia({ colorScheme: 'dark' })
await page.waitForTimeout(200)
await page.screenshot({ path: process.argv[2] + '/mat-dark.png' })
// 계정체계도 확인
await page.emulateMedia({ colorScheme: 'light' })
await page.click('text=계정체계')
await page.waitForTimeout(300)
await page.screenshot({ path: process.argv[2] + '/cosa-light.png' })
await browser.close()
