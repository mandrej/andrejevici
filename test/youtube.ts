import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { fetchYouTubeTitle } from '@/helpers'

describe('fetchYouTubeTitle', () => {
  test('should return title and description from mock fetch oEmbed response', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = async (url: string | URL | Request) => {
        const urlString = url.toString()
        assert.ok(urlString.includes('youtube.com/oembed'))
        assert.ok(urlString.includes('v%3DdQw4w9WgXcQ') || urlString.includes('v=dQw4w9WgXcQ'))
        return new Response(
          JSON.stringify({
            title: 'Rick Astley - Never Gonna Give You Up',
            author_name: 'Rick Astley',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const result = await fetchYouTubeTitle({ videoID: 'dQw4w9WgXcQ' })
      assert.deepEqual(result, {
        data: {
          title: 'Rick Astley - Never Gonna Give You Up',
          description: 'By Rick Astley',
        },
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error when oEmbed response is not ok', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = async () => {
        return new Response('Not Found', { status: 404, statusText: 'Not Found' })
      }

      await assert.rejects(
        () => fetchYouTubeTitle({ videoID: 'invalidID' }),
        /Failed to fetch YouTube title: Not Found/,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
