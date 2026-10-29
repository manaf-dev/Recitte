import { describe, expect, it } from 'vitest'
import { interestMessage, waMeUrl, whatsappDigits } from './whatsapp'

describe('interestMessage', () => {
  it('includes the date in parentheses when there is one', () => {
    expect(interestMessage('Recitte Huruf Workshop', 'Sat 14 Nov 2026')).toBe(
      'Assalamu alaikum, I am interested in the Recitte Huruf Workshop (Sat 14 Nov 2026). Please share how I can attend.',
    )
  })

  it('omits the parenthetical without a date', () => {
    expect(interestMessage('Recitte Monthly Seminar', null)).toBe(
      'Assalamu alaikum, I am interested in the Recitte Monthly Seminar. Please share how I can attend.',
    )
  })
})

describe('waMeUrl', () => {
  it('uses digits only and encodes the text', () => {
    expect(waMeUrl('+233 54 063 4141', 'Hi there')).toBe('https://wa.me/233540634141?text=Hi%20there')
  })

  it('omits text when none is given', () => {
    expect(waMeUrl('+233 54 063 4141')).toBe('https://wa.me/233540634141')
  })
})

describe('whatsappDigits', () => {
  it('strips everything but digits', () => {
    expect(whatsappDigits(' +233 (54) 063-4141 ')).toBe('233540634141')
    expect(whatsappDigits('')).toBe('')
  })
})
