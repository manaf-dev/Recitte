import { describe, expect, it } from 'vitest'
import { cardTheme, typeAccent } from './programView'

describe('look for types staff add', () => {
  it('falls back safely for a slug that is also an object property', () => {
    const types = [{ slug: 'constructor', label: 'Constructor', area: 'connect' as const, builtin: false }]
    expect(typeAccent('constructor', types)).toBe('#F2ECB6')
    expect(typeAccent('toString')).toBe('#B29B72')
    expect(cardTheme('constructor', types).headBg).toBe('#F2ECB6')
  })
})
