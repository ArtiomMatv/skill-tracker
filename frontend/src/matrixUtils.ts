/** Types and pure helpers for the score matrix (see ``App.tsx``). */

export type Employee = { id: string; name: string }
export type Skill = { id: string; name: string }
export type Assessment = {
  id: string
  score: number
  date: string
  employee: { id: string }
  skill: { id: string }
}

export function todayISODate(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function averageForCell(
  assessments: Assessment[],
  employeeId: string,
  skillId: string,
): { average: number; count: number } | null {
  const scores = assessments.filter(
    (a) => a.employee.id === employeeId && a.skill.id === skillId,
  )
  if (scores.length === 0) return null
  const sum = scores.reduce((acc, a) => acc + a.score, 0)
  return { average: sum / scores.length, count: scores.length }
}
