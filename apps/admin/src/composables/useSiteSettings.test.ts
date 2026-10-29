import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sb } from '@/test/supabaseMock'
import { useSiteSettings, validateSettings } from './useSiteSettings'
import { useTestimonials } from './useTestimonials'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => sb.reset())

const settingsRow = {
  id: true,
  hero_title: 'Spend at least 5 minutes with the Qur’an today.',
  hero_intro: 'Intro',
  email: 'salman@recitte.org',
  phone: '',
  whatsapp: '+233 54 063 4141',
  community_link: '',
  updated_at: '2026-10-01T00:00:00Z',
}

describe('validateSettings', () => {
  it('requires a valid email and a WhatsApp number with 7+ digits', () => {
    const result = validateSettings({ ...settingsRow, email: 'nope', whatsapp: '12-34', community_link: 'chat' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['community_link', 'email', 'whatsapp'])
  })

  it('allows an empty phone and community link', () => {
    expect(validateSettings({ ...settingsRow, phone: '', community_link: '' }).ok).toBe(true)
  })
})

describe('useSiteSettings', () => {
  beforeEach(() => {
    sb.respond('settings', 'select', { data: settingsRow })
    sb.respond('social_links', 'select', {
      data: [
        { platform: 'instagram', url: '', active: false, sort_order: 2 },
        { platform: 'whatsapp', url: '', active: false, sort_order: 1 },
      ],
    })
  })

  it('updates the single settings row by id = true', async () => {
    const s = useSiteSettings()
    await s.load()
    s.form.phone = ' +233 20 000 0000 '
    expect(await s.saveSettings()).toEqual({ ok: true })
    const update = sb.callsFor('settings', 'update')[0]
    expect(update?.filters).toContainEqual(['eq', 'id', true])
    expect(update?.payload).toMatchObject({ phone: '+233 20 000 0000', email: 'salman@recitte.org' })
  })

  it('sends only the social rows that changed', async () => {
    const s = useSiteSettings()
    await s.load()
    expect(s.socials.value.map((r) => r.platform)).toEqual(['whatsapp', 'instagram'])
    s.socials.value[1]!.url = 'https://instagram.com/recitte'
    s.socials.value[1]!.active = true
    expect(await s.saveSocials()).toEqual({ ok: true, changed: 1 })
    const updates = sb.callsFor('social_links', 'update')
    expect(updates).toHaveLength(1)
    expect(updates[0]?.payload).toEqual({ url: 'https://instagram.com/recitte', active: true })
    expect(updates[0]?.filters).toContainEqual(['eq', 'platform', 'instagram'])
  })

  it('rejects a social link that is not a full URL', async () => {
    const s = useSiteSettings()
    await s.load()
    s.socials.value[0]!.url = 'wa.me/233'
    const result = await s.saveSocials()
    expect(result).toMatchObject({ ok: false, errors: { whatsapp: expect.any(String) } })
    expect(sb.callsFor('social_links', 'update')).toHaveLength(0)
  })
})

describe('useTestimonials', () => {
  it('refuses a short quote or missing name without calling the database', async () => {
    const t = useTestimonials()
    const result = await t.save({ quote: 'Too short', name: ' ', session: '' })
    expect(result).toMatchObject({ ok: false, errors: { quote: expect.any(String), name: expect.any(String) } })
    expect(sb.callsFor('testimonials')).toHaveLength(0)
  })

  it('inserts a new testimonial and updates an existing one', async () => {
    sb.respond('testimonials', 'insert', (c) => ({ data: { id: 't1', created_at: 'x', ...(c.payload as object) } }))
    sb.respond('testimonials', 'update', (c) => ({ data: { id: 't1', created_at: 'x', ...(c.payload as object) } }))
    const t = useTestimonials()
    await t.save({ quote: 'This seminar changed my recitation.', name: 'Amina', session: '' })
    expect(sb.callsFor('testimonials', 'insert')[0]?.payload).toEqual({
      quote: 'This seminar changed my recitation.',
      name: 'Amina',
      session: null,
    })
    await t.save({ quote: 'This seminar changed my recitation!', name: 'Amina', session: 'Oct seminar' }, 't1')
    expect(sb.callsFor('testimonials', 'update')[0]?.filters).toContainEqual(['eq', 'id', 't1'])
    expect(t.testimonials.value).toHaveLength(1)
    expect(t.testimonials.value[0]?.session).toBe('Oct seminar')
  })
})
