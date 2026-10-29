import { reactive, ref } from 'vue'
import { isValidEmail, phoneDigitCount, SOCIAL_PLATFORMS, type Settings, type SocialLink } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText } from '@/lib/errors'

export type SettingsForm = Pick<Settings, 'hero_title' | 'hero_intro' | 'email' | 'phone' | 'whatsapp' | 'community_link'>

const URL_RE = /^https?:\/\/\S+$/i

/** Mirrors the database checks on `settings`, with messages staff can act on. */
export function validateSettings(form: SettingsForm): { ok: true; value: SettingsForm } | { ok: false; errors: Record<string, string> } {
  const value: SettingsForm = {
    hero_title: form.hero_title.trim(),
    hero_intro: form.hero_intro.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    whatsapp: form.whatsapp.trim(),
    community_link: form.community_link.trim(),
  }
  const errors: Record<string, string> = {}
  if (!value.hero_title) errors.hero_title = 'The homepage needs a headline.'
  if (!isValidEmail(value.email)) errors.email = 'Enter a valid email address. Submission notices go here.'
  if (phoneDigitCount(value.whatsapp) < 7) errors.whatsapp = 'Enter a WhatsApp number with at least 7 digits.'
  if (value.community_link && !URL_RE.test(value.community_link)) {
    errors.community_link = 'Use a full link starting with https://, or leave it empty to hide Join.'
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value }
}

export function validateSocialUrl(url: string): string | null {
  const v = url.trim()
  return v === '' || URL_RE.test(v) ? null : 'Use a full link starting with https://'
}

type SocialRow = Pick<SocialLink, 'platform' | 'url' | 'active' | 'sort_order'>

export function useSiteSettings() {
  const form = reactive<SettingsForm>({
    hero_title: '',
    hero_intro: '',
    email: '',
    phone: '',
    whatsapp: '',
    community_link: '',
  })
  const socials = ref<SocialRow[]>([])
  /** What is saved in the database, to send only changed social rows. */
  let savedSocials: SocialRow[] = []

  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [settings, links] = await Promise.all([
        supabase.from('settings').select('*').eq('id', true).single(),
        supabase.from('social_links').select('platform, url, active, sort_order').order('sort_order'),
      ])
      const failed = settings.error ?? links.error
      if (failed) {
        error.value = dbErrorMessage(failed)
        return
      }
      const s = settings.data as Settings
      Object.assign(form, {
        hero_title: s.hero_title,
        hero_intro: s.hero_intro,
        email: s.email,
        phone: s.phone,
        whatsapp: s.whatsapp,
        community_link: s.community_link,
      })
      const rows = (links.data ?? []) as SocialRow[]
      const order = (p: string) => SOCIAL_PLATFORMS.indexOf(p as SocialRow['platform'])
      rows.sort((a, b) => a.sort_order - b.sort_order || order(a.platform) - order(b.platform))
      savedSocials = rows.map((r) => ({ ...r }))
      socials.value = rows.map((r) => ({ ...r }))
      loaded.value = true
    } catch (e) {
      error.value = errorText(e)
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(): Promise<{ ok: true } | { ok: false; error?: string; errors?: Record<string, string> }> {
    const valid = validateSettings(form)
    if (!valid.ok) return { ok: false, errors: valid.errors }
    try {
      // `.single()` turns "no row updated" (e.g. access revoked) into an error.
      const { error: err } = await supabase
        .from('settings')
        .update(valid.value)
        .eq('id', true)
        .select('id')
        .single()
      if (err) return { ok: false, error: dbErrorMessage(err) }
      Object.assign(form, valid.value)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  async function saveSocials(): Promise<{ ok: true; changed: number } | { ok: false; error?: string; errors?: Record<string, string> }> {
    const errors: Record<string, string> = {}
    for (const row of socials.value) {
      const msg = validateSocialUrl(row.url)
      if (msg) errors[row.platform] = msg
    }
    if (Object.keys(errors).length) return { ok: false, errors }

    const changed = socials.value
      .map((r) => ({ ...r, url: r.url.trim() }))
      .filter((r) => {
        const before = savedSocials.find((s) => s.platform === r.platform)
        return !before || before.url !== r.url || before.active !== r.active
      })
    try {
      const results = await Promise.all(
        changed.map((r) =>
          supabase
            .from('social_links')
            .update({ url: r.url, active: r.active })
            .eq('platform', r.platform)
            .select('platform')
            .single(),
        ),
      )
      const failed = results.find((r) => r.error)
      // Remember what did save, so a retry only sends what is still different.
      changed.forEach((r, i) => {
        if (!results[i]?.error) {
          savedSocials = savedSocials.map((s) => (s.platform === r.platform ? { ...r } : s))
        }
      })
      if (failed?.error) return { ok: false, error: dbErrorMessage(failed.error) }
      socials.value = socials.value.map((r) => ({ ...r, url: r.url.trim() }))
      return { ok: true, changed: changed.length }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  return { form, socials, loading, loaded, error, load, saveSettings, saveSocials }
}
