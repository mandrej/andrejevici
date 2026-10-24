import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  isEmptyValue,
  mergeUserData,
  normalizeUserEmail,
  planUserDoc,
  stripLegacyFields,
  toMillis,
} from '@/helpers/userDoc'

/** Minimal stand-in for a Firestore Timestamp. */
const stamp = (ms: number) => ({ toMillis: () => ms })

describe('normalizeUserEmail', () => {
  test('trims and lowercases', () => {
    assert.equal(normalizeUserEmail('  John.Doe@Example.COM '), 'john.doe@example.com')
  })

  test('maps missing values to an empty string', () => {
    assert.equal(normalizeUserEmail(undefined), '')
    assert.equal(normalizeUserEmail(null), '')
  })
})

describe('isEmptyValue', () => {
  test('treats blank strings as empty', () => {
    assert.equal(isEmptyValue(''), true)
    assert.equal(isEmptyValue('   '), true)
  })

  test('treats null and undefined as empty', () => {
    assert.equal(isEmptyValue(null), true)
    assert.equal(isEmptyValue(undefined), true)
  })

  test('treats false and zero as information', () => {
    assert.equal(isEmptyValue(false), false)
    assert.equal(isEmptyValue(0), false)
  })
})

describe('toMillis', () => {
  test('reads a Firestore-like timestamp', () => {
    assert.equal(toMillis(stamp(1234)), 1234)
  })

  test('reads anything else as zero', () => {
    assert.equal(toMillis(undefined), 0)
    assert.equal(toMillis('2026-01-01'), 0)
  })
})

describe('stripLegacyFields', () => {
  test('removes uid and id without touching other fields', () => {
    const data = { uid: 'abc', id: 'abc', email: 'a@b.c', nick: 'nick' }
    assert.deepEqual(stripLegacyFields(data), { email: 'a@b.c', nick: 'nick' })
  })

  test('leaves data already free of legacy fields unchanged', () => {
    const data = { email: 'a@b.c', isAdmin: false }
    assert.deepEqual(stripLegacyFields(data), data)
  })

  test('does not mutate its input', () => {
    const data = { uid: 'abc', email: 'a@b.c' }
    stripLegacyFields(data)
    assert.equal(data.uid, 'abc')
  })
})

describe('mergeUserData', () => {
  const legacy = {
    name: 'Legacy Name',
    email: 'a@b.c',
    nick: 'admin',
    isAdmin: true,
    isAuthorized: true,
    allowPush: false,
    timestamp: stamp(1000),
  }

  test('returns the legacy document when there is no live one', () => {
    assert.deepEqual(mergeUserData(legacy, null), legacy)
  })

  test('lets the live document win for fields it has set', () => {
    const current = { ...legacy, nick: 'renamed', timestamp: stamp(2000) }
    assert.equal(mergeUserData(legacy, current).nick, 'renamed')
  })

  test('keeps a legacy value the live document lost', () => {
    const current = { name: '', email: 'a@b.c', nick: '', timestamp: stamp(2000) }
    const merged = mergeUserData(legacy, current)
    assert.equal(merged.nick, 'admin')
    assert.equal(merged.name, 'Legacy Name')
  })

  test('never revokes a permission granted on either side', () => {
    const current = { ...legacy, isAdmin: false, isAuthorized: false }
    const merged = mergeUserData(legacy, current)
    assert.equal(merged.isAdmin, true)
    assert.equal(merged.isAuthorized, true)
  })

  test('keeps push enabled when either document subscribed', () => {
    const current = { ...legacy, allowPush: true }
    assert.equal(mergeUserData(legacy, current).allowPush, true)
  })

  test('keeps the newer timestamp so a stale one cannot expire the session', () => {
    const current = { ...legacy, timestamp: stamp(5000) }
    assert.equal(toMillis(mergeUserData(legacy, current).timestamp), 5000)
    assert.equal(
      toMillis(mergeUserData({ ...legacy, timestamp: stamp(9000) }, current).timestamp),
      9000,
    )
  })

  test('does not mutate either input', () => {
    const legacyCopy = { ...legacy }
    const current = { ...legacy, nick: 'renamed' }
    const currentCopy = { ...current }
    mergeUserData(legacy, current)
    assert.deepEqual(legacy, legacyCopy)
    assert.deepEqual(current, currentCopy)
  })
})

describe('planUserDoc', () => {
  test('migrates a document keyed by a uid', () => {
    assert.deepEqual(planUserDoc('Xk3p9Q', { email: 'A@B.c' }), {
      action: 'migrate',
      email: 'a@b.c',
    })
  })

  test('strips legacy fields from a correctly keyed document', () => {
    assert.equal(planUserDoc('a@b.c', { email: 'a@b.c', uid: 'Xk3p9Q' }).action, 'strip')
  })

  test('leaves a correctly keyed, clean document alone', () => {
    assert.equal(planUserDoc('a@b.c', { email: 'a@b.c', nick: 'admin' }).action, 'none')
  })

  test('skips a document with no email to key it by', () => {
    assert.deepEqual(planUserDoc('Xk3p9Q', { nick: 'admin' }), { action: 'skip', email: '' })
  })

  test('compares keys case-insensitively through the normalised email', () => {
    assert.equal(planUserDoc('a@b.c', { email: ' A@B.C ' }).action, 'none')
  })
})
