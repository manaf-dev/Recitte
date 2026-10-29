<script setup lang="ts">
import type { Contact } from '@recitte/shared'
import SubmissionList from '@/components/SubmissionList.vue'
import type { SubmissionView } from '@/composables/useSubmissions'
import { mailto, tel } from '@/lib/links'

function describe(c: Contact): SubmissionView {
  return {
    heading: c.full_name,
    subheading: c.subject ?? undefined,
    fields: [
      { label: 'Subject', value: c.subject },
      { label: 'Email', value: c.email, href: mailto(c.email, c.subject ? `Re: ${c.subject}` : undefined) },
      { label: 'Phone', value: c.phone, href: c.phone ? tel(c.phone) : undefined },
      { label: 'Message', value: c.message, wide: true },
    ],
  }
}
</script>

<template>
  <SubmissionList
    table="contacts"
    title="Messages"
    noun="message"
    empty-text="No messages yet. Messages from the Contact page appear here."
    :describe="describe"
  />
</template>
