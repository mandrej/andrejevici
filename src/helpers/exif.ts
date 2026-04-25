import exifReader from 'exifreader'
import { formatDatum } from './index'
import type { ExifType } from './models'
import CONFIG from 'src/config'

// interface LensSwap {
//   [key: string]: string
// }

// const LENSES: LensSwap = {
//   1007: '30mm F2.8',
//   '70-300 mm f4.5-5.6': 'VR 70-300mm f4.5-5.6E',
//   '70.0-300.0 mm f4.5-5.6': 'VR 70-300mm f4.5-5.6E',
//   'Nikon NIKKOR Z 24-70mm f4 S': 'NIKKOR Z 24-70mm f4 S',
//   'Canon EF-S 17-55mm f2.8 IS USM': 'EF-S17-55mm f2.8 IS USM',
//   'Canon EF 100mm f2.8 Macro USM': 'EF100mm f2.8 Macro USM',
//   'Canon EF 50mm f1.8 STM': 'EF50mm f1.8 STM',
// }

/**
 * Reads the EXIF data from a file.
 *
 * @param {string} url - The URL of the file to read.
 * @return {Promise<ExifType | null>} A promise that resolves to an object containing the EXIF data, or null if the file does not contain EXIF data.
 */
const readExif = async (url: string): Promise<ExifType | null> => {
  const result: ExifType = { model: CONFIG.unknownModel, date: formatDatum(new Date()) }
  const tags = await exifReader.load(url, { expanded: true })

  if (tags.exif) delete tags.exif.MakerNote
  if (tags.Thumbnail) delete tags.Thumbnail
  if (tags.icc) delete tags.icc
  if (tags.iptc) delete tags.iptc
  if (tags.xmp) delete tags.xmp

  const exif = tags.exif

  if (exif && 'Make' in exif && 'Model' in exif) {
    const make = exif.Make.description.replace('/', '')
    let model = exif.Model.description.replace('/', '')
    if (model.toLowerCase() === 'model') model = CONFIG.unknownModel
    const makeArr = make.split(' ')
    const modelArr = model.split(' ')
    result.model = makeArr.some((it) => modelArr.includes(it)) ? model : `${make} ${model}`
  }

  if (exif && 'LensModel' in exif) {
    result.lens = exif.LensModel.description.replace('/', '')
    // result.lens = LENSES[lens] || lens
  }

  if (exif && 'DateTimeOriginal' in exif) {
    const rex = /(\d{4}):(\d{2}):(\d{2})/i
    const date = exif.DateTimeOriginal.description.replace(rex, '$1-$2-$3')
    const datum = new Date(Date.parse(date))
    result.date = formatDatum(datum)
    result.year = datum.getFullYear()
    result.month = datum.getMonth() + 1
    result.day = datum.getDate()
  }

  if (exif && 'ApertureValue' in exif) result.aperture = parseFloat(exif.ApertureValue.description)
  if (exif && 'ExposureTime' in exif) {
    const shutter = exif.ExposureTime.value[0] / exif.ExposureTime.value[1]
    result.shutter = shutter <= 0.1 ? `1/${Math.round(1 / shutter)}` : `${shutter}`
  }
  if (exif && 'FocalLength' in exif) result.focal_length = parseInt(exif.FocalLength.description)
  if (exif && 'ISOSpeedRatings' in exif) result.iso = parseInt(exif.ISOSpeedRatings.description)
  if (exif && 'Flash' in exif) result.flash = !exif.Flash.description.startsWith('Flash did not')

  if (tags.file && 'Image Height' in tags.file && 'Image Width' in tags.file) {
    result.dim = [tags.file['Image Width'].value, tags.file['Image Height'].value]
  }

  // Fallback if dimensions are missing
  if (!result.dim || result.dim[0] === 0 || result.dim[1] === 0) {
    try {
      const img = document.createElement('img')
      img.crossOrigin = 'anonymous'
      img.src = url
      const promise = new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      await promise
      if (img.naturalWidth && img.naturalHeight) {
        result.dim = [img.naturalWidth, img.naturalHeight]
      }
    } catch (e) {
      if (process.env.DEV) console.warn('Failed to get original image size via Image object', e)
    }
  }

  if (tags.gps && 'Latitude' in tags.gps && 'Longitude' in tags.gps) {
    result.loc = `${tags.gps.Latitude.toFixed(6)}, ${tags.gps.Longitude.toFixed(6)}`
  }
  return result
}

export default readExif
