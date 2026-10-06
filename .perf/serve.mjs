// Minimal static file server that mimics Firebase Hosting (cleanUrls + SPA rewrite).
// Usage: node .perf/serve.mjs <distDir> <port>
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const distDir = process.argv[2] ?? 'dist'
const port = Number(process.argv[3] ?? 4321)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

async function tryFile(candidates) {
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate)
      if (info.isFile()) return { path: candidate, size: info.size }
    } catch {
      /* keep looking */
    }
  }
  return null
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)
  if (pathname.endsWith('/')) pathname += 'index.html'

  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const base = join(distDir, safe)
  const ext = extname(pathname)

  const found =
    (await tryFile([base])) ??
    (ext === '' ? await tryFile([`${base}.html`]) : null) ??
    (await tryFile([join(distDir, 'index.html')]))

  if (!found) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Not found')
    return
  }

  const body = await readFile(found.path)
  res.writeHead(200, {
    'content-type': types[extname(found.path)] ?? 'application/octet-stream',
    'content-length': body.byteLength,
    'cache-control': 'no-cache',
  })
  res.end(body)
}).listen(port, '127.0.0.1', () => {
  console.log(`serving ${distDir} at http://127.0.0.1:${port}`)
})
