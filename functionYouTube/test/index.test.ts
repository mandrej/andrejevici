import test, { describe, before, mock } from 'node:test'
import assert from 'node:assert/strict'

// ---------------------------------------------------------------------------
// Lightweight stubs — no real Firebase Admin or network calls
// mock.module() intercepts require() calls before the module under test loads
// ---------------------------------------------------------------------------

const stubModule = (moduleName: string, exportsObj: Record<string, unknown>) => {
  try {
    mock.module(moduleName, { exports: exportsObj, namedExports: exportsObj } as any)
  } catch {
    // ignore
  }
  try {
    const resolved = require.resolve(moduleName)
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports: exportsObj,
    } as unknown as NodeModule
  } catch {
    // ignore if package unresolved
  }
}

// Stub firebase-admin/app so initializeApp() is a no-op
stubModule('firebase-admin/app', {
  initializeApp: () => ({}),
})

// Stub firebase-functions/logger so log/error calls are silent
stubModule('firebase-functions/logger', {
  log: () => undefined,
  error: () => undefined,
})

// Stub firebase-functions/v2/https — capture the registered handler
let capturedHandler: ((request: { data: unknown }) => Promise<unknown>) | undefined

// Custom HttpsError class mirroring the real one
class HttpsError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'HttpsError'
  }
}

stubModule('firebase-functions/v2/https', {
  onCall: (_opts: unknown, handler: (request: { data: unknown }) => Promise<unknown>) => {
    capturedHandler = handler
    return handler
  },
  HttpsError,
})

// Default youtube-caption-extractor stub (success path)
const defaultVideoDetails = {
  title: 'Default Title',
  description: 'Default Description',
  subtitles: [],
}

let mockGetVideoDetails: (opts: { videoID: string }) => Promise<typeof defaultVideoDetails> =
  async () => defaultVideoDetails

stubModule('youtube-caption-extractor', {
  getVideoDetails: (opts: { videoID: string }) => mockGetVideoDetails(opts),
})

// ---------------------------------------------------------------------------
// Import module AFTER stubs are set up (mock.module hooks into require())
// ---------------------------------------------------------------------------
describe('getYouTubeDetails cloud function', () => {
  before(async () => {
    await import('../index')
  })

  test('throws HttpsError invalid-argument when videoID is missing', async () => {
    assert.ok(capturedHandler, 'onCall handler should be registered')

    await assert.rejects(
      () => capturedHandler!({ data: {} }),
      (err: { code?: string; name?: string }) => {
        assert.equal(err.name, 'HttpsError')
        assert.equal(err.code, 'invalid-argument')
        return true
      },
    )
  })

  test('throws HttpsError invalid-argument when videoID is blank', async () => {
    assert.ok(capturedHandler)

    await assert.rejects(
      () => capturedHandler!({ data: { videoID: '   ' } }),
      (err: { code?: string; name?: string }) => {
        assert.equal(err.name, 'HttpsError')
        assert.equal(err.code, 'invalid-argument')
        return true
      },
    )
  })

  test('returns title and description for a valid videoID', async () => {
    assert.ok(capturedHandler)

    mockGetVideoDetails = async ({ videoID }) => {
      assert.equal(videoID, 'dQw4w9WgXcQ')
      return {
        title: 'Rick Astley - Never Gonna Give You Up',
        description: 'The official video',
        subtitles: [],
      }
    }

    const result = (await capturedHandler!({ data: { videoID: 'dQw4w9WgXcQ' } })) as {
      title: string
      description: string
    }

    assert.equal(result.title, 'Rick Astley - Never Gonna Give You Up')
    assert.equal(result.description, 'The official video')
  })

  test("returns title and description for videoID 'MbB-_2jfApA' and lang 'en'", async () => {
    assert.ok(capturedHandler)

    mockGetVideoDetails = async ({ videoID, lang }: { videoID: string; lang?: string }) => {
      assert.equal(videoID, 'MbB-_2jfApA')
      assert.equal(lang, 'en')
      return {
        title: 'Sample Video Title',
        description: 'Sample Video Description',
        subtitles: [],
      }
    }

    const result = (await capturedHandler!({ data: { videoID: 'MbB-_2jfApA', lang: 'en' } })) as {
      title: string
      description: string
    }

    assert.equal(result.title, 'Sample Video Title')
    assert.equal(result.description, 'Sample Video Description')
  })

  test('wraps extractor errors as HttpsError internal', async () => {
    assert.ok(capturedHandler)

    mockGetVideoDetails = async () => {
      throw new Error('Video not playable on any client')
    }

    await assert.rejects(
      () => capturedHandler!({ data: { videoID: 'badVideoId1' } }),
      (err: { code?: string; name?: string; message?: string }) => {
        assert.equal(err.name, 'HttpsError')
        assert.equal(err.code, 'internal')
        assert.ok(err.message?.includes('Video not playable'))
        return true
      },
    )
  })
})
