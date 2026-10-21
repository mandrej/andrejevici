import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { allowedFileExtensions, isAllowedFileType } from '@/helpers'
import CONFIG from '@/config'

describe('allowedFileExtensions', () => {
  test('parses CONFIG.fileType into dotted, trimmed, lowercase extensions', () => {
    const extensions = allowedFileExtensions()
    assert.deepEqual(extensions, ['.jpg', '.jpeg', '.png', '.gif'])
    assert.ok(extensions.every((ext) => ext === ext.trim().toLowerCase()))
  })
})

describe('isAllowedFileType', () => {
  test('accepts every extension listed in CONFIG.fileType', () => {
    for (const ext of allowedFileExtensions()) {
      assert.equal(isAllowedFileType({ name: `photo${ext}` }), true, ext)
    }
  })

  test('ignores the case of the extension', () => {
    assert.equal(isAllowedFileType({ name: 'IMG_1234.JPG' }), true)
    assert.equal(isAllowedFileType({ name: 'Screenshot.PnG' }), true)
  })

  test('accepts a name with several dots', () => {
    assert.equal(isAllowedFileType({ name: 'holiday.2024.final.jpeg' }), true)
  })

  test('rejects an image type that CONFIG.fileType does not list', () => {
    // `accept="image/*"` would have let these through, which is the bug this guard closes.
    for (const name of ['photo.webp', 'photo.bmp', 'photo.tiff', 'photo.heic', 'photo.avif']) {
      assert.equal(isAllowedFileType({ name }), false, name)
    }
  })

  test('rejects a name with no extension, a bare dot, or a leading dot', () => {
    assert.equal(isAllowedFileType({ name: 'photo' }), false)
    assert.equal(isAllowedFileType({ name: '.jpg' }), false)
    assert.equal(isAllowedFileType({ name: 'photo.' }), false)
    assert.equal(isAllowedFileType({ name: '' }), false)
  })

  test('does not match an extension that merely ends with an allowed one', () => {
    assert.equal(isAllowedFileType({ name: 'photo.notjpg' }), false)
    assert.equal(isAllowedFileType({ name: 'photo.tjpg' }), false)
  })

  test('the guard follows CONFIG rather than a hard-coded list', () => {
    assert.equal(CONFIG.fileType.includes('.webp'), false)
    assert.equal(allowedFileExtensions().includes('.webp'), false)
  })
})
