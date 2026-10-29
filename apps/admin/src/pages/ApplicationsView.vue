<script setup lang="ts">
import type { Application } from '@recitte/shared'
import SubmissionList from '@/components/SubmissionList.vue'
import type { SubmissionView } from '@/composables/useSubmissions'
import { mailto, tel } from '@/lib/links'

function describe(a: Application): SubmissionView {
  return {
    heading: a.full_name,
    subheading: a.program_title,
    fields: [
      { label: 'Email', value: a.email, href: mailto(a.email) },
      { label: 'Phone / WhatsApp', value: a.phone, href: tel(a.phone) },
      { label: 'Country', value: a.country },
      { label: 'Age', value: a.age },
      { label: 'Program', value: a.program_title },
      { label: 'Recitation level', value: a.level },
      { label: 'Tajweed experience', value: a.tajweed_experience },
      { label: 'Additional information', value: a.additional_info, wide: true },
    ],
  }
}
</script>

<template>
  <SubmissionList
    table="applications"
    title="Applications"
    noun="application"
    empty-text="No applications yet. Academy applications from the site appear here."
    :describe="describe"
  />
</template>
