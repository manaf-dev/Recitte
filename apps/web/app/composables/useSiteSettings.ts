import { SOCIAL_LABELS, whatsappDigits, type Settings, type SocialLink } from '@recitte/shared'
import { whatsappChannelLink } from '~/utils/whatsappChannel'

export interface ActiveSocial extends SocialLink {
  label: string
}

/** The settings row and social links, loaded once per request and shared. */
export function useSiteSettings() {
  const { data } = useAsyncData(
    'site-settings',
    async () => {
      const supabase = useSupabaseClient()
      const [settings, socials] = await Promise.all([
        supabase.from('settings').select('*').maybeSingle<Settings>(),
        supabase.from('social_links').select('*').order('sort_order').returns<SocialLink[]>(),
      ])
      if (settings.error) console.error('Loading settings failed', settings.error.message)
      if (socials.error) console.error('Loading social links failed', socials.error.message)
      return { settings: settings.data ?? null, socials: socials.data ?? [] }
    },
    { default: () => ({ settings: null as Settings | null, socials: [] as SocialLink[] }) },
  )

  const settings = computed(() => data.value?.settings ?? null)
  const activeSocials = computed<ActiveSocial[]>(() =>
    (data.value?.socials ?? [])
      .filter((s) => s.active && s.url.trim() !== '')
      .map((s) => ({ ...s, label: SOCIAL_LABELS[s.platform] })),
  )
  const communityLink = computed(() => settings.value?.community_link.trim() ?? '')
  const whatsapp = computed(() => (whatsappDigits(settings.value?.whatsapp ?? '').length ? settings.value!.whatsapp : ''))
  const email = computed(() => settings.value?.email.trim() ?? '')
  const phone = computed(() => settings.value?.phone.trim() ?? '')
  /** Where the Connect page's "Join the WhatsApp channel" goes. */
  const whatsappChannel = computed(() =>
    whatsappChannelLink(data.value?.socials ?? [], communityLink.value, whatsapp.value),
  )

  return {
    settings,
    activeSocials,
    whatsappChannel,
    communityLink,
    whatsapp,
    email,
    phone,
    /** Join controls show only when there is a community link. */
    canJoin: computed(() => communityLink.value !== ''),
  }
}
