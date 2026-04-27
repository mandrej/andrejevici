import exifReader from 'exifreader'
import { formatDatum } from './index'
import type { ExifType } from './models'
import CONFIG from 'src/config'

import { getDoc, doc } from 'firebase/firestore'
import { renameCollection } from './collections'

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
    let finalModel = makeArr.some((it) => modelArr.includes(it)) ? model : `${make} ${model}`

    const safeModel = finalModel.replace(/\//g, '')
    try {
      const renameDoc = await getDoc(doc(renameCollection, safeModel))
      if (renameDoc.exists()) {
        finalModel = renameDoc.data().newValue
      }
    } catch (e) {
      if (process.env.DEV) console.warn('Failed to query Rename collection for model', e)
    }
    result.model = finalModel
  }

  if (exif && 'LensModel' in exif) {
    let lens = exif.LensModel.description.replace('/', '')
    const safeLens = lens.replace(/\//g, '')
    try {
      const renameDoc = await getDoc(doc(renameCollection, safeLens))
      if (renameDoc.exists()) {
        lens = renameDoc.data().newValue
      }
    } catch (e) {
      if (process.env.DEV) console.warn('Failed to query Rename collection for lens', e)
    }
    result.lens = lens
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
