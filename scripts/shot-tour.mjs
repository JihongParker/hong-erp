import { chromium } from 'playwright'
const out = process.argv[2] || '/tmp/tour'
const port = process.argv[3] || '4200'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Take a tour' }).first().click()
await page.waitForTimeout(1200)

async function measure(step) {
  // rect of the glowing element vs the SVG mask hole that should sit over it
  const data = await page.evaluate(() => {
    const glow = document.querySelector('.tour-glow')
    const holes = Array.from(document.querySelectorAll('#tour-spot-mask rect[fill="#000"]'))
    const g = glow ? glow.getBoundingClientRect() : null
    // find the hole nearest the glow
    const gr = g ? { x: g.left, y: g.top, w: g.width, h: g.height } : null
    const hs = holes.map((r) => ({
      x: +r.getAttribute('x'), y: +r.getAttribute('y'),
      w: +r.getAttribute('width'), h: +r.getAttribute('height'),
    }))
    return { glowClass: glow ? glow.className : null, gr, hs }
  })
  console.log(`\n--- step ${step} ---`)
  console.log('glow el:', JSON.stringify(data.gr))
  console.log('holes  :', JSON.stringify(data.hs))
  await page.screenshot({ path: `${out}/tour-${step}.png` })
}

await measure(1)
await page.getByRole('button', { name: 'Next' }).click()
await page.waitForTimeout(1400)
await measure(2)
await page.getByRole('button', { name: 'Next' }).click()
await page.waitForTimeout(1400)
await measure(3)
await browser.close()
