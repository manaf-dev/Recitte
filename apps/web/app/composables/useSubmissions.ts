import type { ApplicationInput, ContactInput, Program, RegistrationInput } from '@recitte/shared'
import { submitApplication, submitContact, submitRegistration, type InsertClient } from '~/utils/submissions'

function client(): InsertClient {
  return useSupabaseClient() as unknown as InsertClient
}

export function useSubmitApplication() {
  const { programs, today } = usePrograms()
  const pending = ref(false)
  async function submit(input: ApplicationInput) {
    pending.value = true
    try {
      return await submitApplication(client(), input, programs.value, today)
    } finally {
      pending.value = false
    }
  }
  return { submit, pending }
}

export function useSubmitRegistration() {
  const pending = ref(false)
  async function submit(input: RegistrationInput, program: Program) {
    pending.value = true
    try {
      return await submitRegistration(client(), input, program)
    } finally {
      pending.value = false
    }
  }
  return { submit, pending }
}

export function useSubmitContact() {
  const pending = ref(false)
  async function submit(input: ContactInput) {
    pending.value = true
    try {
      return await submitContact(client(), input)
    } finally {
      pending.value = false
    }
  }
  return { submit, pending }
}
