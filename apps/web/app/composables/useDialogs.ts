import type { Program, RegistrationKind } from '@recitte/shared'

export type RegisterKind = RegistrationKind

interface DialogState {
  apply: { open: boolean; programId: string | null }
  register: { open: boolean; program: Program | null; kind: RegisterKind }
  join: { open: boolean }
}

/** Which of the three site dialogs is open, shared across the app. */
export function useDialogs() {
  const state = useState<DialogState>('dialogs', () => ({
    apply: { open: false, programId: null },
    register: { open: false, program: null, kind: 'register' },
    join: { open: false },
  }))

  return {
    state,
    openApply(programId: string | null = null) {
      state.value.apply = { open: true, programId }
    },
    openRegister(program: Program, kind: RegisterKind) {
      state.value.register = { open: true, program, kind }
    },
    openJoin() {
      state.value.join = { open: true }
    },
    close(which: keyof DialogState) {
      state.value[which].open = false
    },
  }
}
