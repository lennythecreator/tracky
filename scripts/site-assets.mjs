/**
 * Regenerate the landing page's share image and icon set with the locally
 * installed Chrome. Run from the repository root:
 *
 *   node scripts/site-assets.mjs
 *
 * Set CHROME_PATH to a Chrome or Chromium binary if Chrome is not installed in
 * its default location. The script downloads no browser and makes no network
 * request.
 */
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const siteDir = path.join(repoRoot, 'website')
const svgPath = path.join(siteDir, 'favicon.svg')
const tempCard = path.join(siteDir, '.social-card.tmp.html')

const launchOptions = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: 'chrome', headless: true }

/** A PNG screenshot of the favicon at one square size, with transparency. */
async function iconPng(browser, size) {
  const svg = readFileSync(svgPath, 'utf8')
  const page = await browser.newPage()

  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  )

  const png = await page.screenshot({
    type: 'png',
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  })
  await page.close()
  return png
}

/** ICO with PNG payloads: 16, 32, and 48 pixels, 32-bit. */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + images.length * 16
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size === 256 ? 0 : size, 0)
    entry.writeUInt8(size === 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)])
}

const card = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    @font-face { font-family: "Plus Jakarta Sans"; src: url("./fonts/plus-jakarta-sans-regular.ttf") format("truetype"); font-weight: 400; }
    @font-face { font-family: "Plus Jakarta Sans"; src: url("./fonts/plus-jakarta-sans-bold.ttf") format("truetype"); font-weight: 700; }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1200px; height: 630px; }
    body { display: flex; flex-direction: column; padding: 56px 64px 48px; color: #15324f; background: #ffffff; font-family: "Plus Jakarta Sans", sans-serif; }
    .top { display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 12px; font-size: 34px; font-weight: 700; letter-spacing: -0.035em; }
    .mark { width: 44px; height: 44px; color: #3e7fb7; }
    .pill { padding: 8px 14px; border: 1px solid #d9e6f2; border-radius: 999px; color: #1d4f7c; background: #f8fbff; font-size: 15px; font-weight: 700; }
    h1 { margin: 44px 0 18px; font-size: 76px; line-height: 0.99; letter-spacing: -0.035em; font-weight: 700; }
    h1 span { color: #3e7fb7; }
    .deck { max-width: 780px; margin: 0; color: #4e6a84; font-size: 21px; line-height: 1.55; }
    .route { margin-top: auto; display: grid; grid-template-columns: 1fr 96px 1fr 96px 1fr; align-items: center; padding: 22px 26px; border: 1px solid #d5e6f5; border-radius: 20px; background: #f8fbff; }
    .node { position: relative; z-index: 1; padding: 16px 18px; border: 1px solid #c8dced; border-radius: 12px; background: #ffffff; }
    .node.accent { border-color: #9fc4e5; background: #e7f2fc; }
    .kicker { margin: 0 0 8px; color: #28669f; font-family: "Plus Jakarta Sans", sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
    .node h2 { margin: 0 0 6px; font-size: 19px; letter-spacing: -0.02em; }
    .node code { color: #4e6a84; font-size: 14px; }
    .link { position: relative; height: 2px; background: #8aafd2; }
    .link { z-index: 2; }
    .link span { position: absolute; z-index: 3; left: 50%; bottom: 12px; transform: translateX(-50%); padding: 5px 8px; border: 1px solid #d9e8f6; border-radius: 6px; color: #4e6a84; background: #ffffff; font-size: 11px; white-space: nowrap; }
    .foot { margin-top: 16px; color: #536e87; font-size: 14px; }
  </style>
</head>
<body>
  <div class="top">
    <div class="brand">
      <svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8.5h8.5v7H21v8h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="8.5" r="2.5" fill="currentColor"/><circle cx="13.5" cy="15.5" r="2.5" fill="currentColor"/><circle cx="21" cy="23.5" r="2.5" fill="currentColor"/><circle cx="27" cy="23.5" r="2.5" fill="currentColor"/></svg>
      tracky
    </div>
    <span class="pill">React analytics SDK · in development</span>
  </div>
  <h1>Track React events.<br /><span>Own the data path.</span></h1>
  <p class="deck">Batch the product events you choose and post them to the endpoint you control. Your endpoint owns storage, access, and dashboards.</p>
  <div class="route">
    <div class="node"><p class="kicker">Source · your app</p><h2>React event</h2><code>report_exported</code></div>
    <div class="link"><span>track()</span></div>
    <div class="node accent"><p class="kicker">Process · Tracky</p><h2>Buffer &amp; batch</h2><code>up to 10 events</code></div>
    <div class="link"><span>batch POST</span></div>
    <div class="node"><p class="kicker">Endpoint · yours</p><h2>Configured endpoint</h2><code>POST /events</code></div>
  </div>
  <p class="foot">Illustration only · not published yet · no hosted collector</p>
</body>
</html>`

writeFileSync(tempCard, card)

const browser = await puppeteer.launch(launchOptions)

try {
  const cardPage = await browser.newPage()
  await cardPage.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await cardPage.goto(pathToFileURL(tempCard).href, { waitUntil: 'load' })
  await cardPage.screenshot({ path: path.join(siteDir, 'og-image.png'), type: 'png' })
  await cardPage.close()

  const sizes = [16, 32, 48]
  const images = []
  for (const size of sizes) images.push({ size, data: await iconPng(browser, size) })

  await writeFile(path.join(siteDir, 'favicon.ico'), ico(images))
  await writeFile(path.join(siteDir, 'apple-touch-icon.png'), await iconPng(browser, 180))

  console.log('site-assets: wrote og-image.png (1200×630), favicon.ico (16/32/48), apple-touch-icon.png (180×180).')
} finally {
  await browser.close()
  unlinkSync(tempCard)
}
