import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  getSunriseSunset,
  isNightTime,
  getNextSunTransitionDelay,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
} from '../src/helpers/sun.ts'

describe('Sunrise Sunset calculation helper', () => {
  test('should calculate reasonable sunrise and sunset for summer in Belgrade', () => {
    const summerDate = new Date('2026-07-26T12:00:00Z')
    const { sunrise, sunset } = getSunriseSunset(summerDate, DEFAULT_LATITUDE, DEFAULT_LONGITUDE)

    console.log('Summer sunrise (UTC):', sunrise.toISOString())
    console.log('Summer sunset (UTC):', sunset.toISOString())

    // In Belgrade (UTC+2 in summer), sunrise is around ~05:15 CEST (03:15 UTC), sunset around ~20:15 CEST (18:15 UTC)
    assert.equal(sunrise.getUTCHours() >= 2 && sunrise.getUTCHours() <= 4, true)
    assert.equal(sunset.getUTCHours() >= 17 && sunset.getUTCHours() <= 19, true)
  })

  test('should calculate reasonable sunrise and sunset for winter in Belgrade', () => {
    const winterDate = new Date('2026-12-21T12:00:00Z')
    const { sunrise, sunset } = getSunriseSunset(winterDate, DEFAULT_LATITUDE, DEFAULT_LONGITUDE)

    console.log('Winter sunrise (UTC):', sunrise.toISOString())
    console.log('Winter sunset (UTC):', sunset.toISOString())

    // In Belgrade (UTC+1 in winter), sunrise is around ~07:15 CET (06:15 UTC), sunset around ~16:00 CET (15:00 UTC)
    assert.equal(sunrise.getUTCHours() >= 5 && sunrise.getUTCHours() <= 7, true)
    assert.equal(sunset.getUTCHours() >= 14 && sunset.getUTCHours() <= 16, true)
  })

  test('should correctly identify night time vs day time', () => {
    const nightDate = new Date('2026-07-26T02:00:00Z') // 04:00 CEST -> before sunrise
    const dayDate = new Date('2026-07-26T12:00:00Z') // 14:00 CEST -> day
    const eveningDate = new Date('2026-07-26T21:00:00Z') // 23:00 CEST -> after sunset

    assert.equal(isNightTime(nightDate, DEFAULT_LATITUDE, DEFAULT_LONGITUDE), true)
    assert.equal(isNightTime(dayDate, DEFAULT_LATITUDE, DEFAULT_LONGITUDE), false)
    assert.equal(isNightTime(eveningDate, DEFAULT_LATITUDE, DEFAULT_LONGITUDE), true)
  })

  test('should calculate positive next transition delay', () => {
    const now = new Date('2026-07-26T12:00:00Z')
    const delay = getNextSunTransitionDelay(now, DEFAULT_LATITUDE, DEFAULT_LONGITUDE)
    assert.equal(delay > 0, true)
    // Delay until sunset (around 18:11 UTC) should be roughly 6 hours (22200000ms)
    assert.equal(delay > 5 * 3600 * 1000 && delay < 7 * 3600 * 1000, true)
  })
})
