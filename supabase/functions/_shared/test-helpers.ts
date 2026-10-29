import type { CallerDeps, StaffRole } from './staff-auth.ts'

export const SUPER = { id: 'user-super', email: 'super@example.com' }
export const STAFF = { id: 'user-staff', email: 'staff@example.com' }
export const STRANGER = { id: 'user-stranger', email: 'stranger@example.com' }

const tokens: Record<string, { id: string; email: string }> = {
  'token-super': SUPER,
  'token-staff': STAFF,
  'token-stranger': STRANGER,
}
const roles: Record<string, StaffRole> = { [SUPER.id]: 'super_admin', [STAFF.id]: 'staff' }

export const callerDeps: CallerDeps = {
  async getCaller(token) {
    return tokens[token] ?? null
  },
  async getRole(userId) {
    return roles[userId] ?? null
  },
}

export function post(body: unknown, token?: string): Request {
  return new Request('http://localhost/fn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}
