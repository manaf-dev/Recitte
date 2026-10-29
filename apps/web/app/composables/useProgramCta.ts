import { programCta, type Program } from '@recitte/shared'

/**
 * The call to action for a program and what clicking it does. Join hides
 * without a community link, and interest hides without a WhatsApp number.
 */
export function useProgramCta(program: MaybeRefOrGetter<Program>) {
  const { canJoin, whatsapp } = useSiteSettings()
  const dialogs = useDialogs()
  const toast = useToast()

  const cta = computed(() => programCta(toValue(program)))
  const visible = computed(() => {
    if (cta.value.action === 'join') return canJoin.value
    if (cta.value.action === 'interest') return whatsapp.value !== ''
    return true
  })
  const inactive = computed(() => cta.value.action === 'ended' || cta.value.action === 'closed')
  const tone = computed(() => (inactive.value ? 'inactive' : cta.value.action === 'join' ? 'gold' : 'ink'))

  function run() {
    const p = toValue(program)
    switch (cta.value.action) {
      case 'interest':
        return dialogs.openRegister(p, 'interest')
      case 'register':
        return dialogs.openRegister(p, 'register')
      case 'notify':
        return dialogs.openRegister(p, 'notify')
      case 'apply':
        return dialogs.openApply(p.id)
      case 'join':
        return dialogs.openJoin()
      case 'closed':
        return toast.show(`Registration for ${p.title} is closed.`)
      case 'ended':
        return toast.show(`Registration for ${p.title} has ended.`)
    }
  }

  return { cta, visible, inactive, tone, run }
}
