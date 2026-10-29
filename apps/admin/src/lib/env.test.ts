import { describe, expect, it } from 'vitest'
import { readEnv } from './env'

describe('readEnv', () => {
  it('fails clearly when the Supabase settings are missing', () => {
    expect(() => readEnv({})).toThrow(/missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.*\.env\.example/)
    expect(() => readEnv({ VITE_SUPABASE_URL: 'http://x' })).toThrow(/missing VITE_SUPABASE_ANON_KEY/)
  })

  it('treats the public site URL as optional', () => {
    expect(readEnv({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({
      supabaseUrl: 'http://x',
      supabaseAnonKey: 'k',
      publicSiteUrl: null,
    })
  })
})
