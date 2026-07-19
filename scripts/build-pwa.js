import fs from 'fs'
import path from 'path'
import esbuild from 'esbuild'
import { injectManifest } from 'workbox-build'

async function buildPWA() {
  console.log('Building PWA...')

  const rootDir = process.cwd()
  const srcPwaDir = path.join(rootDir, 'src-pwa')
  const publicDir = path.join(rootDir, 'public')
  const distDir = path.join(rootDir, 'dist')

  // 1. Copy manifest.json to public and dist
  const manifestSrc = path.join(srcPwaDir, 'manifest.json')
  if (fs.existsSync(manifestSrc)) {
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }
    fs.copyFileSync(manifestSrc, path.join(publicDir, 'manifest.json'))
    console.log('Copied manifest.json to public/')
    if (fs.existsSync(distDir)) {
      fs.copyFileSync(manifestSrc, path.join(distDir, 'manifest.json'))
      console.log('Copied manifest.json to dist/')
    }
  } else {
    console.warn('manifest.json not found in src-pwa/')
  }

  // 2. Bundle the custom service worker with esbuild
  const swSrc = path.join(srcPwaDir, 'custom-service-worker.ts')
  if (!fs.existsSync(swSrc)) {
    console.error(`Service worker source file not found at: ${swSrc}`)
    process.exit(1)
  }

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  const swTempDest = path.join(distDir, 'sw-temp.js')

  console.log('Bundling custom-service-worker.ts with esbuild...')
  await esbuild.build({
    entryPoints: [swSrc],
    bundle: true,
    outfile: swTempDest,
    platform: 'browser',
    target: 'es2020',
    define: {
      'import.meta.env.MODE': '"production"',
      'import.meta.env.PROD': 'true',
      'import.meta.env.PWA_FALLBACK_HTML': '"/index.html"',
      'import.meta.env.PWA_SERVICE_WORKER_REGEX': '"/sw\\\\.js"',
    },
    banner: {
      js: "importScripts('/firebase-messaging-sw.js');",
    },
  })

  // 3. Inject the precache manifest using workbox-build
  console.log('Injecting precache manifest into service worker...')
  try {
    const { count, size } = await injectManifest({
      swSrc: swTempDest,
      swDest: path.join(distDir, 'sw.js'),
      globDirectory: distDir,
      globPatterns: ['**/*.{html,js,css,png,svg,ico,txt,json}'],
      globIgnores: ['sw.js', 'sw-temp.js', 'firebase-messaging-sw.js'],
    })
    console.log(
      `PWA service worker generated successfully. Precached ${count} assets (${(size / 1024 / 1024).toFixed(2)} MB).`,
    )
  } catch (err) {
    console.error('Error injecting precache manifest:', err)
    process.exit(1)
  }

  // 4. Clean up temporary file
  if (fs.existsSync(swTempDest)) {
    fs.unlinkSync(swTempDest)
  }

  // 5. Also copy the generated sw.js to public/sw.js so it is available in dev or for references
  fs.copyFileSync(path.join(distDir, 'sw.js'), path.join(publicDir, 'sw.js'))
  console.log('Copied sw.js to public/')
}

buildPWA().catch((err) => {
  console.error('Build PWA failed:', err)
  process.exit(1)
})
