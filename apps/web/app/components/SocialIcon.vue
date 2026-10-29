<script setup lang="ts">
import { siFacebook, siInstagram, siTelegram, siTiktok, siWhatsapp, siX, siYoutube } from 'simple-icons'
import type { SocialPlatform } from '@recitte/shared'

// Inline paths, so no request goes to a third-party icon service.
const ICONS: Record<SocialPlatform, { path: string }> = {
  whatsapp: siWhatsapp,
  instagram: siInstagram,
  facebook: siFacebook,
  tiktok: siTiktok,
  youtube: siYoutube,
  x: siX,
  telegram: siTelegram,
}

defineProps<{ platform: SocialPlatform }>()
</script>

<template>
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path :d="ICONS[platform].path" />
  </svg>
</template>
