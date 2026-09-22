import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { getUserRecordByEmail } from '../functionUser/index'
import accountsData from '../data/auth_export/accounts.json'
type AuthInstance = NonNullable<Parameters<typeof getUserRecordByEmail>[1]>

describe('functionUser', () => {
  const authMock = {
    getUserByEmail: async (email: string) => {
      const normalized = email.trim().toLowerCase()
      const user = accountsData.users.find((u) => u.email.toLowerCase() === normalized)
      if (!user) {
        const error = new Error(`No user found with email ${normalized}`) as Error & {
          code: string
        }
        error.code = 'auth/user-not-found'
        throw error
      }
      return {
        uid: user.localId,
        email: user.email,
        displayName: user.displayName,
        disabled: Boolean(user.disabled),
      }
    },
  } as unknown as AuthInstance

  test('should return UID and displayName for milan.andrejevic@gmail.com', async () => {
    const result = await getUserRecordByEmail('milan.andrejevic@gmail.com', authMock)
    assert.ok(result)
    assert.equal(result.uid, 'e2nPxKNt1kCH64kyfORGe4bvl3Cq')
    assert.equal(result.email, 'milan.andrejevic@gmail.com')
    assert.equal(result.displayName, 'Milan Andrejevic')
  })

  test('should return UID and displayName for svetlana.andrejevic@gmail.com', async () => {
    const result = await getUserRecordByEmail('svetlana.andrejevic@gmail.com', authMock)
    assert.ok(result)
    assert.equal(result.uid, 'OIWi3wy8EMlm9u85MABzFUMrFhAc')
    assert.equal(result.email, 'svetlana.andrejevic@gmail.com')
    assert.equal(result.displayName, 'Svetlana Andrejevic')
  })

  test('should return null for non-existent email', async () => {
    const result = await getUserRecordByEmail('nonexistent@example.com', authMock)
    assert.equal(result, null)
  })

  test('should verify against live auth instance when FIREBASE_AUTH_EMULATOR_HOST is set', async (t) => {
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      t.skip('FIREBASE_AUTH_EMULATOR_HOST not set, skipping emulator test')
      return
    }
    const milan = await getUserRecordByEmail('milan.andrejevic@gmail.com')
    assert.ok(milan)
    assert.equal(milan.uid, 'FvlXe9WUkgaaRQ2tn7nNDiKfjSu1')
    const mihailo = await getUserRecordByEmail('mihailo.genije@gmail.com')
    assert.ok(mihailo)
    assert.equal(mihailo.uid, 'HG9VdF9syLNxHYbdQcU7kspLZ9H2')
  })
})
