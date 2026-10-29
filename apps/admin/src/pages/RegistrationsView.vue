<script setup lang="ts">
import type { Registration } from '@recitte/shared'
import SubmissionList from '@/components/SubmissionList.vue'
import type { SubmissionView } from '@/composables/useSubmissions'
import { REGISTRATION_KIND_LABELS } from '@/lib/labels'
import { mailto, tel } from '@/lib/links'

function describe(r: Registration): SubmissionView {
  return {
    heading: r.full_name,
    subheading: `${REGISTRATION_KIND_LABELS[r.kind]} · ${r.program_title}`,
    fields: [
      { label: 'Program', value: r.program_title },
      { label: 'Kind', value: REGISTRATION_KIND_LABELS[r.kind] },
      { label: 'Email', value: r.email, href: mailto(r.email) },
      { label: 'Phone', value: r.phone, href: r.phone ? tel(r.phone) : undefined },
    ],
  }
}
</script>

<template>
  <SubmissionList
    table="registrations"
    title="Registrations"
    noun="registration"
    empty-text="No registrations yet. Registrations, “Notify me” requests and “I'm interested” clicks appear here."
    :describe="describe"
  />
</template>
