<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Staff, StaffRole } from '@recitte/shared'
import AppModal from '@/components/AppModal.vue'
import FormField from '@/components/FormField.vue'
import { useStaffAdmin, type InviteResult } from '@/composables/useStaffAdmin'
import { useStaffProfile } from '@/composables/useStaffProfile'
import { confirmAction } from '@/lib/confirm'
import { formatDate } from '@/lib/format'

const { staff, loading, loaded, error, load, invite, remove } = useStaffAdmin()
const { profile } = useStaffProfile()

const ROLE_LABELS: Record<StaffRole, string> = { super_admin: 'Super admin', staff: 'Staff' }

const inviteOpen = ref(false)
const email = ref('')
const role = ref<StaffRole>('staff')
const inviteError = ref('')
const inviting = ref(false)
const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
const removing = ref<string | null>(null)
/** The last invite's one-time link. Kept in memory only, gone on reload or dismiss. */
const created = ref<InviteResult | null>(null)
const copyState = ref<'idle' | 'copied' | 'manual'>('idle')
const linkInput = ref<HTMLInputElement | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

/** Only invited staff can be removed here, and never your own account. */
function canRemove(member: Staff) {
  return member.role === 'staff' && member.user_id !== profile.value?.user_id
}

function openInvite() {
  email.value = ''
  role.value = 'staff'
  inviteError.value = ''
  inviteOpen.value = true
}

function closeInvite() {
  if (!inviting.value) inviteOpen.value = false
}

async function onInvite() {
  inviteError.value = ''
  notice.value = null
  inviting.value = true
  const result = await invite(email.value, role.value)
  inviting.value = false
  if (!result.ok) {
    inviteError.value = result.error
    return
  }
  email.value = ''
  inviteOpen.value = false
  copyState.value = 'idle'
  created.value = result.invite
}

function selectLink() {
  linkInput.value?.focus()
  linkInput.value?.select()
}

async function copyLink() {
  if (!created.value) return
  clearTimeout(copiedTimer)
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(created.value.invite_url)
    copyState.value = 'copied'
    copiedTimer = setTimeout(() => (copyState.value = 'idle'), 2500)
  } catch {
    copyState.value = 'manual'
    selectLink()
  }
}

function dismissInvite() {
  clearTimeout(copiedTimer)
  created.value = null
  copyState.value = 'idle'
}

async function onRemove(member: Staff) {
  const ok = await confirmAction({
    title: 'Remove this person?',
    message: `${member.email} loses access straight away. An invite they have not accepted stops working.`,
    confirmLabel: 'Remove',
  })
  if (!ok) return
  removing.value = member.user_id
  const result = await remove(member)
  removing.value = null
  notice.value = result.ok
    ? { kind: 'ok', text: `${member.email} was removed.` }
    : { kind: 'error', text: `Not removed. ${result.error}` }
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex flex-col gap-1">
      <h1 class="page-title">Staff</h1>
      <p class="m-0 max-w-[640px] text-[14px] text-muted">
        Staff can use every section except this one. Super admins can also invite and remove staff.
      </p>
    </div>
    <button type="button" class="btn btn-primary" @click="openInvite">+ Invite someone</button>
  </div>

  <p v-if="notice" class="notice" :class="notice.kind === 'ok' ? 'notice-ok' : 'notice-error'" role="status">
    {{ notice.text }}
  </p>

  <section v-if="created" class="card flex flex-col gap-3 p-5" aria-labelledby="invite-link-title">
    <div class="flex items-start justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 id="invite-link-title" class="card-title">Invite link ready</h2>
        <span class="text-[13px] text-muted">
          <span class="break-all font-bold text-ink">{{ created.email }}</span> · {{ ROLE_LABELS[created.role] }}
        </span>
      </div>
      <button type="button" class="btn-link shrink-0" @click="dismissInvite">Dismiss</button>
    </div>
    <p class="m-0 text-[14px] text-muted">
      Send this link to {{ created.email }} privately. It works once and expires in 24 hours. They will choose a
      password, then sign in.
    </p>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label for="invite-link" class="sr-only">Invite link for {{ created.email }}</label>
      <input
        id="invite-link"
        ref="linkInput"
        :value="created.invite_url"
        type="text"
        readonly
        class="input min-w-0 flex-1 font-mono text-[13px]"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <button type="button" class="btn btn-primary shrink-0" @click="copyLink">
        {{ copyState === 'copied' ? 'Copied' : 'Copy link' }}
      </button>
    </div>
    <p class="m-0 text-[13px]" :class="copyState === 'manual' ? 'text-ink' : 'sr-only'" role="status">
      <template v-if="copyState === 'copied'">Link copied.</template>
      <template v-else-if="copyState === 'manual'">
        Copying is not available here. The link is selected, so press Ctrl+C (or Cmd+C) to copy it.
      </template>
    </p>
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

  <AppModal :open="inviteOpen" title="Invite someone" size="sm" @close="closeInvite">
    <form id="invite-form" class="flex flex-col gap-3" novalidate @submit.prevent="onInvite">
      <FormField id="invite-email" label="Email" required :error="inviteError" hint="No email is sent. You will get a link to send them.">
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
      <FormField id="invite-role" label="Role" hint="Super admins can invite and remove staff.">
        <template #default="{ id, describedBy }">
          <select :id="id" v-model="role" class="input" :aria-describedby="describedBy">
            <option value="staff">{{ ROLE_LABELS.staff }}</option>
            <option value="super_admin">{{ ROLE_LABELS.super_admin }}</option>
          </select>
        </template>
      </FormField>
    </form>
    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="inviting" @click="closeInvite">Cancel</button>
      <button type="submit" form="invite-form" class="btn btn-primary" :disabled="inviting">
        {{ inviting ? 'Creating…' : 'Create invite link' }}
      </button>
    </template>
  </AppModal>
</template>
