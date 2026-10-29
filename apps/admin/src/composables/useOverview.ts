import { ref, shallowRef } from 'vue'
import { isProgramPast, type Application, type Contact, type Program, type Registration } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText, type DbError } from '@/lib/errors'
import { excerpt, REGISTRATION_KIND_LABELS } from '@/lib/labels'

export interface OverviewCounts {
  applications: number
  registrations: number
  contacts: number
  openPrograms: number
}

export interface ActivityItem {
  key: string
  kind: 'Application' | 'Registration' | 'Message'
  /** Path of the inbox the item lives in. */
  to: string
  text: string
  created_at: string
}

export const RECENT_LIMIT = 8

type AppRow = Pick<Application, 'id' | 'created_at' | 'full_name' | 'program_title'>
type RegRow = Pick<Registration, 'id' | 'created_at' | 'full_name' | 'program_title' | 'kind'>
type ContactRow = Pick<Contact, 'id' | 'created_at' | 'full_name' | 'subject' | 'message'>

export function toActivity(apps: AppRow[], regs: RegRow[], contacts: ContactRow[]): ActivityItem[] {
  const items: ActivityItem[] = [
    ...apps.map((a) => ({
      key: `a-${a.id}`,
      kind: 'Application' as const,
      to: '/applications',
      text: `${a.full_name} applied for ${a.program_title}`,
      created_at: a.created_at,
    })),
    ...regs.map((r) => ({
      key: `r-${r.id}`,
      kind: 'Registration' as const,
      to: '/registrations',
      text: `${r.full_name} · ${REGISTRATION_KIND_LABELS[r.kind]} · ${r.program_title}`,
      created_at: r.created_at,
    })),
    ...contacts.map((c) => ({
      key: `c-${c.id}`,
      kind: 'Message' as const,
      to: '/messages',
      text: `${c.full_name}${c.subject ? ` · ${c.subject}` : ''} · “${excerpt(c.message, 60)}”`,
      created_at: c.created_at,
    })),
  ]
  return items.sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, RECENT_LIMIT)
}

function newCount(table: string) {
  return supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'new')
}

function latest(table: string, columns: string) {
  return supabase.from(table).select(columns).order('created_at', { ascending: false }).limit(RECENT_LIMIT)
}

export function useOverview() {
  const counts = shallowRef<OverviewCounts | null>(null)
  const recent = shallowRef<ActivityItem[]>([])
  const loading = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [apps, regs, contacts, programs, recentApps, recentRegs, recentContacts] = await Promise.all([
        newCount('applications'),
        newCount('registrations'),
        newCount('contacts'),
        supabase.from('programs').select('starts_on, ends_on').eq('status', 'open'),
        latest('applications', 'id, created_at, full_name, program_title'),
        latest('registrations', 'id, created_at, full_name, program_title, kind'),
        latest('contacts', 'id, created_at, full_name, subject, message'),
      ])
      const failed = [apps, regs, contacts, programs, recentApps, recentRegs, recentContacts].find((r) => r.error)
      if (failed) {
        error.value = dbErrorMessage(failed.error as DbError)
        return
      }
      const open = (programs.data ?? []) as Pick<Program, 'starts_on' | 'ends_on'>[]
      counts.value = {
        applications: apps.count ?? 0,
        registrations: regs.count ?? 0,
        contacts: contacts.count ?? 0,
        openPrograms: open.filter((p) => !isProgramPast(p)).length,
      }
      recent.value = toActivity(
        (recentApps.data ?? []) as unknown as AppRow[],
        (recentRegs.data ?? []) as unknown as RegRow[],
        (recentContacts.data ?? []) as unknown as ContactRow[],
      )
    } catch (e) {
      error.value = errorText(e)
    } finally {
      loading.value = false
    }
  }

  return { counts, recent, loading, error, load }
}
