<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Staff, StaffRole } from '@recitte/shared'
import FormField from '@/components/FormField.vue'
import { useStaffAdmin } from '@/composables/useStaffAdmin'
import { useStaffProfile } from '@/composables/useStaffProfile'
import { confirmAction } from '@/lib/confirm'
import { formatDate } from '@/lib/format'

const { staff, loading, loaded, error, load, invite, remove } = useStaffAdmin()
const { profile } = useStaffProfile()

const ROLE_LABELS: Record<StaffRole, string> = { super_admin: 'Super admin', staff: 'Staff' }

const email = ref('')
const inviteError = ref('')
const inviting = ref(false)
const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
const removing = ref<string | null>(null)

/** Only invited staff can be removed here, and never your own account. */
function canRemove(member: Staff) {
  return member.role === 'staff' && member.user_id !== profile.value?.user_id
}

async function onInvite() {
  inviteError.value = ''
  notice.value = null
  inviting.value = true
  const address = email.value.trim()
  const result = await invite(address)
  inviting.value = false
  if (!result.ok) {
    inviteError.value = result.error
    return
  }
  email.value = ''
  notice.value = {
    kind: 'ok',
    text: `Invite sent to ${address.toLowerCase()}. They get an email with a link to the admin.`,
  }
}

async function onRemove(member: Staff) {
  if (!confirmAction(`Remove ${member.email}?\n\nThey lose access straight away. An invite they have not accepted stops working.`)) return
  removing.value = member.user_id
  const result = await remove(member)
  removing.value = null
  notice.value = result.ok
    ? { kind: 'ok', text: `${member.email} was removed.` }
    : { kind: 'error', text: `Not removed. ${result.error}` }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-1">
    <h1 class="page-title">Staff</h1>
    <p class="m-0 text-[14px] text-muted">
      Invited people can use every section except this one. Another super admin can only be set in the Supabase
      dashboard.
    </p>
  </div>

  <p v-if="notice" class="notice" :class="notice.kind === 'ok' ? 'notice-ok' : 'notice-error'" role="status">
    {{ notice.text }}
  </p>

  <section class="card p-7" aria-labelledby="invite-title">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="onInvite">
      <h2 id="invite-title" class="card-title">Invite someone</h2>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
        <FormField id="invite-email" label="Email" :error="inviteError" class="flex-1">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="email"
              type="email"
              autocomplete="off"
              inputmode="email"
              class="input"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
        <button type="submit" class="btn btn-primary sm:mt-[26px]" :disabled="inviting">
          {{ inviting ? 'Sending…' : 'Send invite' }}
        </button>
      </div>
      <p class="m-0 text-[13px] text-muted">Supabase emails them a sign-in link. Their role is Staff.</p>
    </form>
  </section>

  <div v-if="error" class="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
    <span>Could not load the staff list. {{ error }}</span>
    <button type="button" class="btn btn-secondary btn-small" @click="load">Try again</button>
  </div>

  <section class="card" aria-label="Current staff" :aria-busy="loading">
    <p v-if="loading && !loaded" class="m-0 p-7 text-[14px] text-muted">Loading…</p>
    <ul v-else class="m-0 list-none p-0">
      <li
        v-for="member in staff"
        :key="member.user_id"
        class="flex flex-col gap-2 border-b border-rule px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="flex flex-wrap items-center gap-2">
            <span class="break-all font-bold text-ink">{{ member.email }}</span>
            <span v-if="member.user_id === profile?.user_id" class="pill bg-ground text-ink">You</span>
          </span>
          <span class="text-[13px] text-muted">
            {{ ROLE_LABELS[member.role] }} · added {{ formatDate(member.created_at) }}
          </span>
        </div>
        <button
          v-if="canRemove(member)"
          type="button"
          class="btn-link btn-danger self-start sm:self-auto"
          :disabled="removing === member.user_id"
          @click="onRemove(member)"
        >
          {{ removing === member.user_id ? 'Removing…' : 'Remove' }}<span class="sr-only"> {{ member.email }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
