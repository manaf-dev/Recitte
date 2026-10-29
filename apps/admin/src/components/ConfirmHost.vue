<script setup lang="ts">
import { computed } from 'vue'
import AppModal from './AppModal.vue'
import { pendingConfirm, settleConfirm } from '@/lib/confirm'

const current = computed(() => pendingConfirm.value)
</script>

<template>
  <AppModal :open="!!current" :title="current?.title ?? ''" size="sm" @close="settleConfirm(false)">
    <p class="m-0 whitespace-pre-line text-[15px] leading-relaxed text-[#343434]">{{ current?.message }}</p>
    <template #footer>
      <button type="button" class="btn btn-secondary" data-autofocus @click="settleConfirm(false)">Cancel</button>
      <button
        type="button"
        class="btn"
        :class="current?.danger ? 'btn-destructive' : 'btn-primary'"
        data-confirm
        @click="settleConfirm(true)"
      >
        {{ current?.confirmLabel }}
      </button>
    </template>
  </AppModal>
</template>
