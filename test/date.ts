import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDate,
  formatDateNative,
  formatDatum,
  getDateFields,
  toDateTimeLocalString,
  getAgeDays,
  months,
} from '../src/helpers/index'

describe('Date Helpers', () => {
  describe('parseDate', () => {
    test('should handle Date object', () => {
      const d = new Date(2026, 7, 16, 10, 30, 0) // Month is 0-indexed (7 = August)
      assert.equal(parseDate(d).getTime(), d.getTime())
    })

    test('should handle numeric timestamp', () => {
      const ts = 1755331200000
      assert.equal(parseDate(ts).getTime(), ts)
    })

    test('should handle standard ISO string', () => {
      const d = parseDate('2026-08-16T10:30:00')
      assert.equal(d.getFullYear(), 2026)
      assert.equal(d.getMonth(), 7)
      assert.equal(d.getDate(), 16)
    })

    test('should handle EXIF colon-formatted date string', () => {
      const d = parseDate('2026:08:16 10:30:00')
      assert.equal(d.getFullYear(), 2026)
      assert.equal(d.getMonth(), 7)
      assert.equal(d.getDate(), 16)
    })

    test('should handle Firestore-like Timestamp objects with toDate or seconds', () => {
      const d = parseDate({ toDate: () => new Date(2026, 7, 16) })
      assert.equal(d.getFullYear(), 2026)

      const d2 = parseDate({ seconds: 1755331200 })
      assert.equal(d2.getTime(), 1755331200 * 1000)
    })

    test('should fallback gracefully for null, undefined, or invalid inputs', () => {
      const fallback = new Date(2020, 0, 1)
      assert.equal(parseDate(null, fallback).getTime(), fallback.getTime())
      assert.equal(parseDate(undefined, fallback).getTime(), fallback.getTime())
      assert.equal(parseDate('invalid date string', fallback).getTime(), fallback.getTime())
    })
  })

  describe('formatDateNative & formatDatum', () => {
    test('should format Date with custom tokens', () => {
      const d = new Date(2026, 7, 16, 9, 5, 4)
      assert.equal(formatDateNative(d, 'YYYY-MM-DD HH:mm:ss'), '2026-08-16 09:05:04')
      assert.equal(formatDatum(d, 'DD.MM.YYYY'), '16.08.2026')
    })
  })

  describe('getDateFields', () => {
    test('should return formatted date string and component numbers', () => {
      const fields = getDateFields('2026-08-16', 'DD.MM.YYYY')
      assert.equal(fields.date, '16.08.2026')
      assert.equal(fields.year, 2026)
      assert.equal(fields.month, 8)
      assert.equal(fields.day, 16)
    })
  })

  describe('toDateTimeLocalString', () => {
    test('should format for datetime-local input', () => {
      const d = new Date(2026, 7, 16, 14, 25)
      assert.equal(toDateTimeLocalString(d), '2026-08-16T14:25')
    })
  })

  describe('getAgeDays', () => {
    test('should return age in days', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000)
      assert.equal(getAgeDays(fiveDaysAgo), 5)
      assert.equal(getAgeDays(null), 0)
    })
  })

  describe('months', () => {
    test('should contain 12 months', () => {
      assert.equal(months.length, 12)
      assert.equal(months[0], 'January')
      assert.equal(months[11], 'December')
    })
  })
})
