import {
  APPLICATION_TYPES,
  NOT_SURE_PROGRAM,
  isProgramPast,
  programTypeArea,
  type Program,
  type ProgramTypeRow,
} from '@recitte/shared'

type Dated = Pick<Program, 'starts_on' | 'title'>

/** Soonest `starts_on` first; undated programs after dated ones. */
export function sortBySoonest<T extends Dated>(programs: readonly T[]): T[] {
  return [...programs].sort((a, b) => {
    if (a.starts_on && b.starts_on) return a.starts_on.localeCompare(b.starts_on)
    if (a.starts_on) return -1
    if (b.starts_on) return 1
    return a.title.localeCompare(b.title)
  })
}

const current = (programs: readonly Program[], today?: string) => programs.filter((p) => !isProgramPast(p, today))

/** "What's happening now": featured, not past, not closed, three soonest. */
export function featuredForHome(programs: readonly Program[], today?: string): Program[] {
  return sortBySoonest(current(programs, today).filter((p) => p.featured && p.status !== 'closed')).slice(0, 3)
}

export function forConnect(programs: readonly Program[], today?: string, types: readonly ProgramTypeRow[] = []): Program[] {
  return sortBySoonest(current(programs, today).filter((p) => programTypeArea(p.type, types) === 'connect'))
}

export function forAcademy(programs: readonly Program[], today?: string, types: readonly ProgramTypeRow[] = []): Program[] {
  return sortBySoonest(current(programs, today).filter((p) => programTypeArea(p.type, types) === 'academy'))
}

/** Up to three other programs that are not past and not closed, same type first. */
export function relatedPrograms(program: Program, programs: readonly Program[], today?: string): Program[] {
  const candidates = sortBySoonest(
    current(programs, today).filter((p) => p.id !== program.id && p.status !== 'closed'),
  )
  const same = candidates.filter((p) => p.type === program.type)
  const other = candidates.filter((p) => p.type !== program.type)
  return [...same, ...other].slice(0, 3)
}

export interface ProgramOption {
  value: string
  label: string
}

/** The Academy application's program choices. */
export function applicationProgramOptions(programs: readonly Program[], today?: string): ProgramOption[] {
  const choices = sortBySoonest(
    current(programs, today).filter((p) => APPLICATION_TYPES.includes(p.type) && p.status !== 'closed'),
  )
  return [
    ...choices.map((p) => ({ value: p.id, label: p.title })),
    { value: NOT_SURE_PROGRAM, label: NOT_SURE_PROGRAM },
  ]
}
