import { describe, expect, it } from 'vitest'
import { textSlug, sliceSlug } from '../../../src/helpers/index'

describe('textSlug', () => {
  it('should return an empty array when given an empty string', () => {
    expect(textSlug('')).toEqual('')
  })

  it('should return an array of words when given a string with hyphens', () => {
    expect(textSlug('Петровац на мору')).toEqual('petrovac-na-moru')
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
