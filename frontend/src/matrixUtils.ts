/** Types and pure helpers for the score matrix (see ``App.tsx``). */

export type Employee = { id: string; name: string }
export type Skill = { id: string; name: string }
export type Assessment = {
  id: string
  score: number
  date: string
  notes?: string
  employee: { id: string; name: string }
  skill: { id: string; name: string }
}

/** Pre-aggregated cell from the API (`matrixCells`). */
export type MatrixCell = {
  employeeId: string
  skillId: string
  average: number
  count: number
}

export function todayISODate(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Look up average/count from server-provided matrix cells. */
export function averageFromCells(
  cells: MatrixCell[],
  employeeId: string,
  skillId: string,
): { average: number; count: number } | null {
  const hit = cells.find(
    (c) => c.employeeId === employeeId && c.skillId === skillId,
  )
  if (!hit) return null
  return { average: hit.average, count: hit.count }
}
