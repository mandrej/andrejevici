import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from 'transliteration'
import { textSlug, sliceSlug } from '../src/helpers/index'

describe('slugify', () => {
  test('should return an empty string', () => {
    assert.equal(slugify(''), '')
  })
  test('should return slug with hyphens', () => {
    assert.equal(slugify('Петровац на мору'), 'petrovac-na-moru')
  })
  test('should return slug with hyphens', () => {
    assert.equal(slugify('Шупаљ ђеврек'), 'shupalj-djevrek')
  })
})

describe('textSlug', () => {
  test('should return an empty string', () => {
    assert.equal(textSlug(''), '')
  })
  test('should return an array of words when given a string with hyphens', () => {
    assert.equal(textSlug('жиле žile'), 'zile-zile')
  })
  test('should return an array of words when given a string with hyphens', () => {
    assert.equal(textSlug('Ђаво носи Pradu'), 'djavo-nosi-pradu')
  })
})

describe('sliceSlug', () => {
  test('should return an empty array when given an empty string', () => {
    assert.deepEqual(sliceSlug(''), [])
  })

  test('should return an array of words when given a string with hyphens', () => {
    assert.deepEqual(sliceSlug('hello-world'), ['hel', 'hell', 'hello', 'wor', 'worl', 'world'])
  })
  test('should return an array of words when given a string with multiple hyphens', () => {
    assert.deepEqual(sliceSlug('hello-world-of-code'), [
      'hel',
      'hell',
      'hello',
      'wor',
      'worl',
      'world',
      'cod',
      'code',
    ])
  })
})
