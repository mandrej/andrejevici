import { describe, expect, it } from 'vitest'
import { slugify } from 'transliteration'
import { textSlug, sliceSlug } from '../../../src/helpers/index'

describe('slugify', () => {
  it('should return an empty array when given an empty string', () => {
    expect(slugify('')).toEqual('')
  })

  it('should return slug with hyphens', () => {
    expect(slugify('Петровац на мору')).toEqual('petrovac-na-moru')
  })
  it('should return slug with hyphens', () => {
    expect(slugify('Шупаљ ђеврек')).toEqual('shupalj-djevrek')
  })
})

describe('textSlug', () => {
  it('should return an empty array when given an empty string', () => {
    expect(textSlug('')).toEqual('')
  })

  it('should return an array of words when given a string with hyphens', () => {
    expect(textSlug('жиле žile')).toEqual('zile-zile')
  })
  it('should return an array of words when given a string with hyphens', () => {
    expect(textSlug('Ђаво носи Pradu')).toEqual('djavo-nosi-pradu')
  })
})

describe('sliceSlug', () => {
  it('should return an empty array when given an empty string', () => {
    expect(sliceSlug('')).toEqual([])
  })

  it('should return an array of words when given a string with hyphens', () => {
    expect(sliceSlug('hello-world')).toEqual(['hel', 'hell', 'hello', 'wor', 'worl', 'world'])
  })
  it('should return an array of words when given a string with multiple hyphens', () => {
    expect(sliceSlug('hello-world-of-code')).toEqual([
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
