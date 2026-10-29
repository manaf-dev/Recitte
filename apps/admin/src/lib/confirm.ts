/**
 * Asks before a destructive action. Wrapped so tests can answer for the user.
 */
export function confirmAction(message: string): boolean {
  return window.confirm(message)
}
