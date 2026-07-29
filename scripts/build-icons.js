import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

async function generateIcons() {
  const rootDir = process.cwd()
  const svgPath = path.join(rootDir, 'public', 'logo.svg')
  const publicDir = path.join(rootDir, 'public')
  const iconsDir = path.join(publicDir, 'icons')
  const screenshotsDir = path.join(publicDir, 'screenshots')

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }

  console.log('Generating icons & screenshots from logo.svg...')

  // 1. Generate public/logo.png
  await sharp(svgPath)
    .resize(512, 512)
    .toFile(path.join(publicDir, 'logo.png'))
  console.log('Generated public/logo.png')

  // 2. Favicons & Standard App Icons (padded logo at 85% to preserve white circular border)
  const squareIconSizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon-128x128.png', size: 128 },
    { name: 'icon-128x128.png', size: 128 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-256x256.png', size: 256 },
    { name: 'icon-384x384.png', size: 384 },
    { name: 'icon-512x512.png', size: 512 },
  ]

  for (const { name, size } of squareIconSizes) {
    const innerSize = Math.max(1, Math.round(size * 0.85))
    const logoBuffer = await sharp(svgPath).resize(innerSize, innerSize).toBuffer()

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .toFile(path.join(iconsDir, name))

    console.log(`Generated public/icons/${name}`)
  }

  // 2b. Maskable App Icons for Android (padded 70% logo within safe zone on #212121 background)
  const maskableIconSizes = [
    { name: 'icon-maskable-192x192.png', size: 192 },
    { name: 'icon-maskable-512x512.png', size: 512 },
  ]

  for (const { name, size } of maskableIconSizes) {
    const innerSize = Math.round(size * 0.7)
    const logoBuffer = await sharp(svgPath).resize(innerSize, innerSize).toBuffer()

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 33, g: 33, b: 33, alpha: 1 }, // #212121
      },
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .toFile(path.join(iconsDir, name))

    console.log(`Generated public/icons/${name}`)
  }

  // 3. Favicon.ico
  await sharp(svgPath)
    .resize(32, 32)
    .toFile(path.join(publicDir, 'favicon.ico'))
  console.log('Generated public/favicon.ico')

  // 4. Apple Launch Screens (centered logo with white border on #212121 dark background)
  const appleLaunchScreens = [
    [750, 1334],
    [828, 1792],
    [1080, 2340],
    [1125, 2436],
    [1170, 2532],
    [1179, 2556],
    [1242, 2208],
    [1242, 2688],
    [1284, 2778],
    [1290, 2796],
    [1536, 2048],
    [1620, 2160],
    [1668, 2224],
    [1668, 2388],
    [2048, 2732],
  ]

  for (const [w, h] of appleLaunchScreens) {
    const filename = `apple-launch-${w}x${h}.png`
    const logoSize = Math.round(Math.min(w, h) * 0.35)
    const logoBuffer = await sharp(svgPath).resize(logoSize, logoSize).toBuffer()

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 33, g: 33, b: 33, alpha: 1 }, // #212121
      },
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .toFile(path.join(iconsDir, filename))

    console.log(`Generated public/icons/${filename}`)
  }

  // 5. PWA Screenshots (desktop 1280x720 & mobile 750x1334 with background #212121)
  const screenshots = [
    { name: 'desktop.png', w: 1280, h: 720 },
    { name: 'mobile.png', w: 750, h: 1334 },
  ]

  for (const { name, w, h } of screenshots) {
    const logoSize = Math.round(Math.min(w, h) * 0.4)
    const logoBuffer = await sharp(svgPath).resize(logoSize, logoSize).toBuffer()

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 33, g: 33, b: 33, alpha: 1 }, // #212121
      },
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .toFile(path.join(screenshotsDir, name))

    console.log(`Generated public/screenshots/${name}`)
  }

  console.log('All icons & screenshots generated successfully!')
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons & screenshots:', err)
  process.exit(1)
})
