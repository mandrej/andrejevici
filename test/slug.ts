import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from 'transliteration'
import { sliceSlug } from '../src/helpers/index'

const cir = 'Љубиша Црногорчевић живи да једе шупаљ ђеврек на џаку'
const lat = 'Ljubiša Crnogorčević živi da jede šupalj djevrek na džaku'
const trr = 'ljubisa-crnogorcevic-zivi-da-jede-supalj-djevrek-na-dzaku'

const textSlug = (text: string): string => {
  return slugify(text, {
    replace: {
      ш: 's',
      đ: 'dj',
      џ: 'dz',
      ћ: 'c',
      ч: 'c',
      ж: 'z',
      š: 's',
      dj: 'dj',
      dž: 'dz',
      ć: 'c',
      č: 'c',
      ž: 'z',
    },
  })
}

describe('slugify', () => {
  test('should return an empty string', () => {
    assert.equal(slugify(''), '')
  })

  console.log(slugify(cir))
  console.log(slugify(lat))

  test('should return slug with hyphens', () => {
    // console.log(textSlug(cir))
    assert.equal(textSlug(cir), trr)
  })
  test('should return an array of words when given a string with hyphens', () => {
    // console.log(textSlug(lat))
    assert.equal(textSlug(lat), trr)
  })
})

describe('sliceSlug', () => {
  test('should return an empty array when given an empty string', () => {
    assert.deepEqual(sliceSlug(''), [])
  })

  test('should return an array of words when given a string with hyphens', () => {
    // console.log(sliceSlug(trr))
    assert.deepEqual(sliceSlug(trr), [
      'lju',
      'ljub',
      'ljubi',
      'ljubis',
      'ljubisa',
      'crn',
      'crno',
      'crnog',
      'crnogo',
      'crnogor',
      'crnogorc',
      'ziv',
      'zivi',
      'jed',
      'jede',
      'sup',
      'supa',
      'supal',
      'supalj',
      'dje',
      'djev',
      'djevr',
      'djevre',
      'djevrek',
      'dza',
      'dzak',
      'dzaku',
    ])
  })
})
