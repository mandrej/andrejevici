import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { fileURLToPath } from 'url'
import exifReader from 'exifreader'
import readExif from '../src/helpers/exif'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const only = [
  'Make',
  'Model',
  'LensModel',
  'DateTimeOriginal',
  'ApertureValue',
  'ExposureTime',
  'FocalLength',
  'ISOSpeedRatings',
  'Flash',
]

describe('exifReader', () => {
  test('should return an object with the EXIF data', async () => {
    const imagePath = path.resolve(__dirname, './test.jpg')
    const exif = await exifReader.load(imagePath)
    assert.ok(exif)
    for (const key of only) {
      assert.ok(exif[key])
      console.log(key, exif[key].description)
    }
  })
})

describe('readExif', () => {
  test('should return an object with the EXIF data', async () => {
    const imagePath = path.resolve(__dirname, './test.jpg')
    const exif = await readExif(imagePath)
    assert.ok(exif)
    console.log(exif)
  })
})
