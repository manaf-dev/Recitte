import { describe, expect, it } from 'vitest'
import { whatsappChannelLink } from './whatsappChannel'

const channel = { platform: 'whatsapp' as const, url: 'https://whatsapp.com/channel/abc' }
const blank = { platform: 'whatsapp' as const, url: '' }

describe('whatsappChannelLink', () => {
  it('prefers the WhatsApp channel link', () => {
    expect(whatsappChannelLink([channel], 'https://chat.whatsapp.com/x', '+233 54 063 4141')).toEqual({
      href: 'https://whatsapp.com/channel/abc',
      kind: 'channel',
    })
  })

  it('falls back to the community link', () => {
    expect(whatsappChannelLink([blank], 'https://chat.whatsapp.com/x', '+233 54 063 4141')).toEqual({
      href: 'https://chat.whatsapp.com/x',
      kind: 'community',
    })
  })

  it('otherwise opens a WhatsApp message to the team, so a fresh setup still shows the CTA', () => {
    const link = whatsappChannelLink([blank], '', '+233 54 063 4141')
    expect(link?.kind).toBe('message')
    expect(link?.href).toMatch(/^https:\/\/wa\.me\/233540634141\?text=Assalamu%20alaikum/)
  })

  it('returns null only when nothing is set', () => {
    expect(whatsappChannelLink([], '', '')).toBeNull()
  })
})
