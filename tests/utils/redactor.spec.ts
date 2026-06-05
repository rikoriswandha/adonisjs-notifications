import { test } from '@japa/runner'
import { redactValue, redactObject } from '../../src/utils/redactor.ts'

test.group('redactValue', () => {
  test('masks email addresses in strings', ({ assert }) => {
    const input = 'User email is john.doe@example.com and backup is jane@test.org'
    const result = redactValue(input)
    assert.include(result, '[REDACTED_EMAIL]')
    assert.notInclude(result, 'john.doe@example.com')
    assert.notInclude(result, 'jane@test.org')
  })

  test('masks phone numbers in strings', ({ assert }) => {
    const input = 'Call us at +1-555-123-4567 or (555) 987-6543'
    const result = redactValue(input)
    assert.include(result, '[REDACTED_PHONE]')
    assert.notInclude(result, '+1-555-123-4567')
    assert.notInclude(result, '(555) 987-6543')
  })

  test('masks URLs containing token/key/secret/password query params', ({ assert }) => {
    const input = 'Visit https://api.example.com/auth?token=abc123xyz to continue'
    const result = redactValue(input)
    assert.include(result, '[REDACTED_URL_WITH_TOKEN]')
    assert.notInclude(result, 'token=abc123xyz')
  })

  test('masks URLs with api_key parameter', ({ assert }) => {
    const input = 'Endpoint: https://service.com/data?api_key=secret456'
    const result = redactValue(input)
    assert.include(result, '[REDACTED_URL_WITH_TOKEN]')
    assert.notInclude(result, 'api_key=secret456')
  })

  test('masks JWT tokens', ({ assert }) => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    const input = `Bearer ${jwt}`
    const result = redactValue(input)
    assert.include(result, '[REDACTED_JWT]')
    assert.notInclude(result, 'eyJhbGci')
  })

  test('passes non-matching strings through unchanged', ({ assert }) => {
    const input = 'This is a regular message with no PII'
    const result = redactValue(input)
    assert.equal(result, input)
  })

  test('handles numeric values', ({ assert }) => {
    const result = redactValue(42)
    assert.equal(result, '42')
  })

  test('handles null gracefully', ({ assert }) => {
    const result = redactValue(null)
    assert.equal(result, 'null')
  })

  test('handles undefined gracefully', ({ assert }) => {
    const result = redactValue(undefined)
    assert.equal(result, 'undefined')
  })

  test('handles object values by stringifying', ({ assert }) => {
    const input = { message: 'Test notification', id: 123 }
    const result = redactValue(input)
    assert.include(result, 'Test notification')
    assert.include(result, '123')
  })

  test('redacts email in object stringification', ({ assert }) => {
    const input = { email: 'user@example.com', name: 'John' }
    const result = redactValue(input)
    assert.include(result, '[REDACTED_EMAIL]')
    assert.notInclude(result, 'user@example.com')
  })

  test('redacts multiple PII types in one string', ({ assert }) => {
    const input = 'Email: admin@test.com, Phone: +1-555-123-4567, JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    const result = redactValue(input)
    assert.include(result, '[REDACTED_EMAIL]')
    assert.include(result, '[REDACTED_PHONE]')
    assert.include(result, '[REDACTED_JWT]')
    assert.notInclude(result, 'admin@test.com')
    assert.notInclude(result, '+1-555-123-4567')
  })
})

test.group('redactObject', () => {
  test('processes all string values in an object', ({ assert }) => {
    const input = {
      email: 'user@example.com',
      phone: '+1-555-123-4567',
      message: 'Normal text',
    }
    const result = redactObject(input)
    assert.include(result.email, '[REDACTED_EMAIL]')
    assert.include(result.phone, '[REDACTED_PHONE]')
    assert.equal(result.message, 'Normal text')
  })

  test('leaves non-string values untouched', ({ assert }) => {
    const input = {
      count: 42,
      active: true,
      data: { nested: 'value' },
      email: 'test@example.com',
    }
    const result = redactObject(input)
    assert.equal(result.count, 42)
    assert.equal(result.active, true)
    assert.deepEqual(result.data, { nested: 'value' })
    assert.include(result.email, '[REDACTED_EMAIL]')
  })

  test('returns new object without mutating original', ({ assert }) => {
    const input = { email: 'user@example.com' }
    const result = redactObject(input)
    assert.notEqual(result, input)
    assert.equal(input.email, 'user@example.com')
    assert.include(result.email, '[REDACTED_EMAIL]')
  })
})
