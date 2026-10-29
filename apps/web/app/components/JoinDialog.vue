<script setup lang="ts">
const { state, close } = useDialogs()
const { communityLink } = useSiteSettings()

const open = computed(() => state.value.join.open && communityLink.value !== '')
const qr = ref('')

// Drawn in the browser; the link is never sent to a QR service.
watch(
  [open, communityLink],
  async ([isOpen, link]) => {
    if (!isOpen || !link || !import.meta.client) return
    const QRCode = await import('qrcode')
    qr.value = await QRCode.toDataURL(link, { margin: 0, width: 240, color: { dark: '#202545', light: '#ffffff' } })
  },
  { immediate: true },
)

function confirm() {
  close('join')
  window.open(communityLink.value, '_blank', 'noopener')
}
</script>

<template>
  <BaseDialog :open="open" labelledby="join-title" @close="close('join')">
    <div class="flex flex-col gap-2 bg-soft px-9 py-7">
      <span class="text-sm font-bold text-umber">Recitte Connect</span>
      <h3 id="join-title" class="m-0 font-serif text-[32px] leading-[1.05] font-semibold text-ink">Join the Recitte Community</h3>
    </div>
    <div class="flex flex-col gap-4.5 px-9 pt-7 pb-9">
      <p class="m-0 text-[17px] leading-[1.7]">You're about to leave the Recitte website and open our community on WhatsApp.</p>
      <div v-if="qr" class="hidden items-center gap-4.5 rounded-2xl bg-ground p-4 min-[940px]:flex">
        <img :src="qr" alt="QR code to join the Recitte WhatsApp community" width="112" height="112" class="block size-28 flex-none rounded-[10px] bg-white p-1.5" />
        <div class="flex flex-col gap-1">
          <span class="text-[17px] font-bold text-ink">On your phone?</span>
          <span class="text-sm leading-[1.55] text-[#4a4a4a]">Scan with your camera to join straight from WhatsApp.</span>
        </div>
      </div>
      <ul class="m-0 flex list-none flex-col gap-2 p-0 text-sm text-ink">
        <li>One reminder a day, ayah, reflection, action</li>
        <li>First notice of seminars and workshops</li>
        <li>Free, and you can leave anytime</li>
      </ul>
      <div class="flex flex-wrap gap-2.5 pt-1">
        <button type="button" class="btn btn-ink" @click="confirm">Continue to WhatsApp</button>
        <button type="button" class="btn btn-sand font-medium" @click="close('join')">Not now</button>
      </div>
    </div>
  </BaseDialog>
</template>
