import { shallowRef } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  /** Label of the confirming button, e.g. "Delete". */
  confirmLabel?: string
  /** Destructive actions get a red confirm button (the default). */
  danger?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/** The confirmation currently on screen, rendered by ConfirmHost. */
export const pendingConfirm = shallowRef<PendingConfirm | null>(null)

/**
 * Asks before a destructive action with a Confirm / Cancel dialog.
 * Resolves true only when the person confirms.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  pendingConfirm.value?.resolve(false)
  return new Promise((resolve) => {
    pendingConfirm.value = { danger: true, confirmLabel: 'Delete', ...options, resolve }
  })
}

export function settleConfirm(ok: boolean) {
  const current = pendingConfirm.value
  pendingConfirm.value = null
  current?.resolve(ok)
}
