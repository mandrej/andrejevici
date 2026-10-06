// Drives a real browser through the app and reports which chunks load, console output and
// hydration errors. Usage: node .perf/probe.mjs <baseUrl> [--route=/] [--sw=on|off]
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4321'
const flag = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : d
}
const route = flag('route', '/')
const sw = flag('sw', 'off')
const port = 9344 + Math.floor(Math.random() * 200)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profileDir = await mkdtemp(join(tmpdir(), 'probe-'))
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-extensions',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--enable-unsafe-swiftshader',
    '--remote-allow-origins=*',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function ws() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (r.ok) return (await r.json()).webSocketDebuggerUrl
    } catch {
      /* retry */
    }
    await sleep(150)
  }
  throw new Error('no devtools')
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    let id = 0
    const pending = new Map()
    const listeners = new Set()
    socket.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id !== undefined) {
        const p = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? p?.reject(new Error(JSON.stringify(msg.error))) : p?.resolve(msg.result)
      } else for (const l of listeners) l(msg)
    })
    socket.addEventListener('error', reject)
    socket.addEventListener('open', () =>
      resolve({
        on: (l) => listeners.add(l),
        send: (method, params = {}, sessionId) =>
          new Promise((res, rej) => {
            const i = ++id
            pending.set(i, { resolve: res, reject: rej })
            socket.send(JSON.stringify({ id: i, method, params, sessionId }))
          }),
      }),
    )
  })
}

try {
  const client = await connect(await ws())
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
  const send = (m, p) => client.send(m, p, sessionId)

  const console_ = []
  const loaded = []
  const failed = []
  const requestUrls = new Map()
  const sizes = new Map()

  client.on((msg) => {
    if (msg.sessionId !== sessionId) return
    if (msg.method === 'Runtime.consoleAPICalled') {
      console_.push({
        type: msg.params.type,
        text: msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '),
      })
    }
    if (msg.method === 'Log.entryAdded') {
      console_.push({ type: msg.params.entry.level, text: msg.params.entry.text })
    }
    if (msg.method === 'Network.requestWillBeSent') {
      requestUrls.set(msg.params.requestId, msg.params.request.url)
    }
    if (msg.method === 'Network.loadingFinished') {
      const u = requestUrls.get(msg.params.requestId)
      if (u) sizes.set(u.replace(baseUrl, ''), msg.params.encodedDataLength)
    }
    if (msg.method === 'Network.responseReceived') {
      const { url, status } = msg.params.response
      const path = url.replace(baseUrl, '')
      if (status >= 400) failed.push({ status, path })
      loaded.push(path)
    }
  })

  await send('Page.enable')
  await send('Network.enable')
  await send('Runtime.enable')
  await send('Log.enable')

  // Block service worker registration to isolate the cold first load.
  if (sw === 'off') {
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined })`,
    })
  }

  await send('Page.navigate', { url: baseUrl + route })
  await sleep(6000)

  const { result } = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      html: document.body.innerText.slice(0, 200),
      h1: document.querySelector('h1')?.textContent ?? null,
      buttons: [...document.querySelectorAll('button')].map(b => b.textContent.trim()).slice(0, 6),
      hasPhotoLink: !!document.querySelector('a[href="/list"]'),
      scripts: [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')),
    })`,
    returnByValue: true,
  })

  const errs = console_.filter((c) => c.type === 'error')
  console.log(
    JSON.stringify(
      {
        route,
        chunksLoaded: loaded.filter((p) => p.includes('.js')).sort(),
        jsBytes: [...sizes.entries()]
          .filter(([p]) => p.endsWith('.js'))
          .reduce((a, [, n]) => a + n, 0),
        totalBytes: [...sizes.values()].reduce((a, n) => a + n, 0),
        topChunks: [...sizes.entries()]
          .filter(([p]) => p.endsWith('.js'))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([p, n]) => `${(n / 1024).toFixed(1)} KB  ${p.split('/').pop()}`),
        failed,
        dom: JSON.parse(result.value),
        consoleErrors: errs,
        consoleWarnings: console_.filter((c) => c.type === 'warning'),
      },
      null,
      2,
    ),
  )
} finally {
  chrome.kill('SIGKILL')
  await rm(profileDir, { recursive: true, force: true })
}
process.exit(0)
