// Chrome DevTools Protocol perf harness for first-load measurement.
// Usage: node .perf/measure.mjs <url> [--runs=N] [--throttle=4g|none] [--label=name]
// Requires Chrome at CHROME_PATH (or the macOS default) and a server on the target URL.
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const url = process.argv[2]
if (!url) {
  console.error('usage: node .perf/measure.mjs <url> [--runs=N] [--throttle=4g|none]')
  process.exit(1)
}
const flag = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const runs = Number(flag('runs', '3'))
const throttle = flag('throttle', '4g')
const label = flag('label', url)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForWs(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (res.ok) return (await res.json()).webSocketDebuggerUrl
    } catch {
      /* not up yet */
    }
    await sleep(120)
  }
  throw new Error('Chrome devtools endpoint did not come up')
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    const listeners = new Set()
    const timer = setTimeout(() => reject(new Error('websocket connect timeout')), 10000)
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (process.env.PERF_DEBUG) process.stderr.write(`[cdp] ${event.data.slice(0, 200)}\n`)
      if (msg.id !== undefined) {
        const entry = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) entry?.reject(new Error(JSON.stringify(msg.error)))
        else entry?.resolve(msg.result)
      } else {
        for (const listener of listeners) listener(msg)
      }
    })
    ws.addEventListener('error', (err) => reject(err))
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      resolve({
        on: (listener) => listeners.add(listener),
        send: (method, params = {}, sessionId) =>
          Promise.race([
            new Promise((res, rej) => {
              const msgId = ++id
              pending.set(msgId, { resolve: res, reject: rej })
              ws.send(JSON.stringify({ id: msgId, method, params, sessionId }))
            }),
            sleep(30000).then(() => {
              throw new Error(`CDP timeout: ${method}`)
            }),
          ]),
        close: () => {
          try {
            if (ws.readyState === 1) ws.close()
          } catch {
            /* already gone */
          }
        },
      })
    })
  })
}

async function runOnce(port, profileDir) {
  const step = (m) => process.stderr.write(`[measure] ${m}\n`)
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-crash-reporter',
      '--disable-breakpad',
      '--no-sandbox',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--disable-features=Translate,OptimizationHints,MediaRouter',
      '--enable-unsafe-swiftshader',
      '--remote-allow-origins=*',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  try {
    step('waiting for devtools')
    const wsUrl = await waitForWs(port)
    step('connecting ws')
    const client = await connect(wsUrl)
    step('connected')
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    const send = (method, params) => client.send(method, params, sessionId)

    await send('Page.enable')
    await send('Network.enable')
    await send('Performance.enable')

    if (throttle !== 'none') {
      await send('Network.setCacheDisabled', { cacheDisabled: true })
      await send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
        connectionType: 'cellular4g',
      })
    }

    const requests = new Map()
    const finished = []
    client.on((msg) => {
      if (msg.sessionId !== sessionId) return
      if (msg.method === 'Network.requestWillBeSent') {
        requests.set(msg.params.requestId, {
          url: msg.params.request.url,
          type: msg.params.type,
        })
      }
      if (msg.method === 'Network.loadingFinished') finished.push(msg.params)
      if (msg.method === 'Network.loadingFailed') finished.push({ ...msg.params, failed: true })
    })

    const loaded = new Promise((resolve) => {
      client.on((msg) => {
        if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') resolve()
      })
    })

    step('navigating')
    await send('Page.navigate', { url })
    await Promise.race([loaded, sleep(45000)])
    step('load fired')
    await sleep(2500) // let hydration/main-thread work settle

    const { metrics } = await send('Performance.getMetrics')
    const value = (name) => metrics.find((m) => m.name === name)?.value ?? null
    const { result } = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        fp: performance.getEntriesByType('paint')[0]?.startTime ?? null,
        nav: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, responseEnd: n.responseEnd, transferSize: n.transferSize, encodedBodySize: n.encodedBodySize } : null })(),
        scripts: performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).length,
        resources: performance.getEntriesByType('resource').length,
        transferBytes: performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0),
        decodedBytes: performance.getEntriesByType('resource').reduce((a, r) => a + (r.decodedBodySize || 0), 0),
        imgBytes: performance.getEntriesByType('resource').filter(r => r.initiatorType === 'css' || /\.(jpe?g|png|webp)$/.test(r.name)).reduce((a, r) => a + (r.transferSize || 0), 0),
      })`,
      returnByValue: true,
    })

    const payload = JSON.parse(result.value)
    const bytesFromEvents = finished
      .filter((f) => !f.failed && requests.get(f.requestId)?.type !== 'Document')
      .reduce((a, f) => a + (f.encodedDataLength || 0), 0)

    step('collecting metrics')
    client.close()
    return {
      ...payload,
      wallClockLoad: value('NavigationTime') ?? value('LoadTime'),
      jsHeapUsed: value('JSHeapUsedSize'),
      taskDuration: value('TaskDuration'),
      scriptDuration: value('ScriptDuration'),
      layoutDuration: value('LayoutDuration'),
      resourcesFromEvents: finished.length,
      eventBytes: bytesFromEvents,
    }
  } finally {
    chrome.kill('SIGKILL')
  }
}

const port = 9333
const results = []
for (let i = 0; i < runs; i++) {
  process.stderr.write(`[measure] run ${i + 1}/${runs}\n`)
  const profileDir = await mkdtemp(join(tmpdir(), 'perf-chrome-'))
  try {
    results.push(await runOnce(port, profileDir))
  } finally {
    await rm(profileDir, { recursive: true, force: true })
  }
  await sleep(400)
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
const summary = {
  label,
  runs,
  throttle,
  fcpMs: median(results.map((r) => r.fcp).filter((v) => v !== null)),
  loadMs: median(results.map((r) => r.nav?.load).filter((v) => typeof v === 'number')),
  dclMs: median(results.map((r) => r.nav?.dcl).filter((v) => typeof v === 'number')),
  jsRequests: median(results.map((r) => r.scripts)),
  requests: median(results.map((r) => r.resources)),
  transferBytes: median(results.map((r) => r.transferBytes)),
  decodedBytes: median(results.map((r) => r.decodedBytes)),
  scriptDurationMs: Math.round(median(results.map((r) => r.scriptDuration * 1000))),
  taskDurationMs: Math.round(median(results.map((r) => r.taskDuration * 1000))),
  heapMB: +(median(results.map((r) => r.jsHeapUsed)) / 1048576).toFixed(1),
}

console.log(JSON.stringify({ summary, runs: results }, null, 2))
process.exit(0)
