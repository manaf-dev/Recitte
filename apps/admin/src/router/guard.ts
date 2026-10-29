import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { initAuth, safeRedirect, signOut } from '@/composables/useAuth'
import { loadStaffProfile } from '@/composables/useStaffProfile'

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable while signed out (login and the magic-link landing). */
    public?: boolean
    /** Only for staff with role `super_admin`. */
    superAdmin?: boolean
    /** Shown in the browser tab. */
    title?: string
  }
}

/**
 * Every screen needs a signed-in user with a `staff` row. Signed-out visitors
 * go to the login form, keeping where they were headed.
 */
export async function authGuard(to: RouteLocationNormalized): Promise<true | RouteLocationRaw> {
  const session = await initAuth()

  if (to.meta.public) {
    // A signed-in staff member has no business on the login form.
    if (to.name === 'login' && session) {
      const { profile } = await loadStaffProfile(session.user.id)
      if (profile) return safeRedirect(to.query.redirect) ?? { name: 'overview' }
    }
    return true
  }

  if (!session) {
    return to.fullPath === '/' ? { name: 'login' } : { name: 'login', query: { redirect: to.fullPath } }
  }

  const { profile, error } = await loadStaffProfile(session.user.id)
  if (!profile) {
    // Signed in, but not staff (or we could not tell): never show admin screens.
    await signOut()
    return { name: 'login', query: { reason: error ? 'error' : 'no-access' } }
  }

  if (to.meta.superAdmin && profile.role !== 'super_admin') return { name: 'overview' }

  return true
}
