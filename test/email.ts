import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { isValidEmail } from '../src/helpers'

describe('isValidEmail', () => {
  test('should return true for a valid email address', () => {
    assert.equal(isValidEmail('user@example.com'), true)
    assert.equal(isValidEmail('john.doe@domain.co.uk'), true)
  })

  test('should return error message string for invalid email addresses', () => {
    assert.equal(isValidEmail('invalid-email'), 'Invalid email')
    assert.equal(isValidEmail('user@'), 'Invalid email')
    assert.equal(isValidEmail('@domain.com'), 'Invalid email')
    assert.equal(isValidEmail(''), 'Invalid email')
  })
})
