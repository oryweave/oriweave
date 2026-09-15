import { afterEach, describe, expect, it } from 'vitest'
import { getSecretValue } from '@/common/utils/env'

const TEST_KEY = 'TEST_SECRET_KEY'

afterEach(() => {
  delete process.env[TEST_KEY]
  delete process.env.NODE_ENV
})

describe('getSecretValue', () => {
  it('falls back to the dev default when unset and NODE_ENV is unset', () => {
    expect(getSecretValue(TEST_KEY, 'dev-default')).toBe('dev-default')
  })

  it('falls back to the dev default when unset in local', () => {
    process.env.NODE_ENV = 'local'
    expect(getSecretValue(TEST_KEY, 'dev-default')).toBe('dev-default')
  })

  it('falls back to the dev default when unset in development', () => {
    process.env.NODE_ENV = 'development'
    expect(getSecretValue(TEST_KEY, 'dev-default')).toBe('dev-default')
  })

  it('falls back to the dev default when set to an empty string in local', () => {
    process.env.NODE_ENV = 'local'
    process.env[TEST_KEY] = ''
    expect(getSecretValue(TEST_KEY, 'dev-default')).toBe('dev-default')
  })

  it('returns the real value when set, regardless of environment', () => {
    process.env.NODE_ENV = 'production'
    process.env[TEST_KEY] = 'a-real-secret'
    expect(getSecretValue(TEST_KEY, 'dev-default')).toBe('a-real-secret')
  })

  it('throws instead of silently using the dev default when unset in production', () => {
    process.env.NODE_ENV = 'production'
    expect(() => getSecretValue(TEST_KEY, 'dev-default')).toThrow(/TEST_SECRET_KEY/)
  })

  it('throws instead of silently using the dev default when blank in production', () => {
    process.env.NODE_ENV = 'production'
    process.env[TEST_KEY] = ''
    expect(() => getSecretValue(TEST_KEY, 'dev-default')).toThrow(/TEST_SECRET_KEY/)
  })

  it('throws instead of silently using the dev default when unset in staging', () => {
    process.env.NODE_ENV = 'staging'
    expect(() => getSecretValue(TEST_KEY, 'dev-default')).toThrow(/TEST_SECRET_KEY/)
  })
})
