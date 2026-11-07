import { describe, expect, it } from 'vitest'
import { STAFF_NAME_MAX, staffDisplayName, staffNameError } from './staff'

const email = 'amina@example.com'

describe('staffDisplayName', () => {
  it('joins first and last name', () => {
    expect(staffDisplayName({ email, first_name: 'Amina', last_name: 'Mensah' })).toBe('Amina Mensah')
  })

  it('trims each part', () => {
    expect(staffDisplayName({ email, first_name: '  Amina ', last_name: ' Mensah  ' })).toBe('Amina Mensah')
  })

  it('uses whichever part is present', () => {
    expect(staffDisplayName({ email, first_name: 'Amina', last_name: null })).toBe('Amina')
    expect(staffDisplayName({ email, first_name: '  ', last_name: 'Mensah' })).toBe('Mensah')
  })

  it('falls back to the email when both are missing', () => {
    expect(staffDisplayName({ email, first_name: null, last_name: null })).toBe(email)
    expect(staffDisplayName({ email, first_name: ' ', last_name: '' })).toBe(email)
  })
})

describe('staffNameError', () => {
  it('requires a name', () => {
    expect(staffNameError('', 'first')).toBe('Enter a first name.')
    expect(staffNameError('   ', 'last')).toBe('Enter a last name.')
  })

  it('allows up to the limit after trimming', () => {
    expect(staffNameError(` ${'a'.repeat(STAFF_NAME_MAX)} `, 'first')).toBeNull()
  })

  it('rejects names over the limit', () => {
    expect(staffNameError('a'.repeat(STAFF_NAME_MAX + 1), 'last')).toBe(
      `Keep the last name to ${STAFF_NAME_MAX} characters or fewer.`,
    )
  })
})
