import { test } from '@japa/runner'
import { generateDedupeKey } from '../../src/utils/dedupe_key.ts'

test.group('generateDedupeKey', () => {
  test('produces expected key format', ({ assert }) => {
    const key = generateDedupeKey('WelcomeEmail', 'uuid-123', 'User', 42, 'mail')
    assert.equal(key, 'WelcomeEmail:uuid-123:User:42:mail')
  })

  test('same inputs produce same key', ({ assert }) => {
    const key1 = generateDedupeKey('Alert', 'abc', 'User', 1, 'database')
    const key2 = generateDedupeKey('Alert', 'abc', 'User', 1, 'database')
    assert.equal(key1, key2)
  })

  test('different inputs produce different keys', ({ assert }) => {
    const key1 = generateDedupeKey('Alert', 'abc', 'User', 1, 'mail')
    const key2 = generateDedupeKey('Alert', 'abc', 'User', 1, 'database')
    assert.notEqual(key1, key2)
  })

  test('handles string notifiableId', ({ assert }) => {
    const key = generateDedupeKey('Alert', 'abc', 'User', 'user-uuid', 'mail')
    assert.equal(key, 'Alert:abc:User:user-uuid:mail')
  })
})
