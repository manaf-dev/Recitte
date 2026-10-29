/**
 * A tiny stand-in for the supabase-js client. Tests swap the real module with:
 *
 *   vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))
 *
 * and then script results with `sb.respond(table, op, result)` and inspect
 * `sb.calls` to see what the app asked for.
 */
import { vi } from 'vitest'

export type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

export interface QueryCall {
  table: string
  op: Op
  columns?: string
  options?: unknown
  payload?: unknown
  filters: Array<[string, ...unknown[]]>
}

export interface Result {
  data?: unknown
  error?: { code?: string; message: string } | null
  count?: number | null
}

type Responder = Result | ((call: QueryCall) => Result)

function createBuilder(call: QueryCall, resolve: (call: QueryCall) => Result) {
  const builder = {
    select(columns?: string, options?: unknown) {
      if (!call.op || call.op === 'select') {
        call.op = 'select'
        call.columns = columns
        call.options = options
      } else {
        call.filters.push(['select', columns])
      }
      return builder
    },
    insert(payload: unknown) {
      call.op = 'insert'
      call.payload = payload
      return builder
    },
    update(payload: unknown) {
      call.op = 'update'
      call.payload = payload
      return builder
    },
    upsert(payload: unknown) {
      call.op = 'upsert'
      call.payload = payload
      return builder
    },
    delete() {
      call.op = 'delete'
      return builder
    },
    then<T1 = Result, T2 = never>(
      onFulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
      onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
    ): Promise<T1 | T2> {
      return Promise.resolve()
        .then(() => {
          const r = resolve(call)
          return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null }
        })
        .then(onFulfilled, onRejected)
    },
  }
  const chain = ['eq', 'neq', 'in', 'is', 'order', 'limit', 'range', 'match', 'single', 'maybeSingle', 'gte', 'lte']
  for (const name of chain) {
    ;(builder as Record<string, unknown>)[name] = (...args: unknown[]) => {
      call.filters.push([name, ...args])
      return builder
    }
  }
  return builder as typeof builder & Record<string, (...args: unknown[]) => typeof builder>
}

function createMock() {
  const calls: QueryCall[] = []
  const responders = new Map<string, Responder>()

  const resolve = (call: QueryCall): Result => {
    const r = responders.get(`${call.table}:${call.op}`) ?? responders.get(`${call.table}:*`)
    if (!r) return { data: call.op === 'select' ? [] : null, error: null }
    return typeof r === 'function' ? r(call) : r
  }

  const storageBucket = {
    upload: vi.fn(async (path: string) => ({ data: { path }, error: null as Result['error'] })),
    remove: vi.fn(async () => ({ data: [], error: null as Result['error'] })),
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: `http://supabase.test/storage/v1/object/public/speaker-photos/${path}` },
    })),
  }

  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null as unknown }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithOtp: vi.fn(async () => ({ data: {}, error: null as unknown })),
    verifyOtp: vi.fn(async () => ({ data: { session: null as unknown }, error: null as unknown })),
    signOut: vi.fn(async () => ({ error: null })),
  }

  const client = {
    from: vi.fn((table: string) => {
      const call: QueryCall = { table, op: undefined as unknown as Op, filters: [] }
      calls.push(call)
      return createBuilder(call, resolve)
    }),
    auth,
    storage: { from: vi.fn(() => storageBucket) },
    functions: { invoke: vi.fn(async () => ({ data: null as unknown, error: null as unknown })) },
  }

  return {
    client,
    calls,
    auth,
    storageBucket,
    respond(table: string, op: Op | '*', result: Responder) {
      responders.set(`${table}:${op}`, result)
    },
    /** Calls for one table and operation, in order. */
    callsFor(table: string, op?: Op) {
      return calls.filter((c) => c.table === table && (!op || c.op === op))
    },
    signIn(userId = 'user-1', email = 'staff@example.com') {
      auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId, email } } }, error: null })
    },
    /** Forget calls, scripted results and per-test mock implementations. */
    reset() {
      calls.length = 0
      responders.clear()
      const fns = [
        ...Object.values(auth),
        ...Object.values(storageBucket),
        client.from,
        client.storage.from,
        client.functions.invoke,
      ]
      // mockReset restores the implementation each vi.fn was created with.
      for (const fn of fns) fn.mockReset()
    },
  }
}

export const sb = createMock()

export const supabaseModule = {
  supabase: sb.client,
  publicSiteUrl: 'https://recitte.test' as string | null,
  SPEAKER_PHOTO_BUCKET: 'speaker-photos',
}
