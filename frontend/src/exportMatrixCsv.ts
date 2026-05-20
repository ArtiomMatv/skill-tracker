/**
 * Build a CSV string for the score matrix (same averages as the UI, sorted by name).
 * UTF-8 BOM prefix helps Excel open UTF-8 correctly on Windows.
 */
import {
  averageFromCells,
  type Employee,
  type MatrixCell,
  type Skill,
} from './matrixUtils'

const BOM = '\ufeff'

/** Excel (many locales) uses `;` as list separator; this first line forces `,` for this file. */
const EXCEL_SEP_HINT = 'sep=,'

function csvEscapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Sort by name like ``App.tsx`` matrix columns/rows. */
function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

export function buildMatrixCsv(
  employees: Employee[],
  skills: Skill[],
  cells: MatrixCell[],
): string {
  const rows: string[][] = []
  const header = [
    'Employee',
    ...sortByName(skills).map((s) => csvEscapeField(s.name)),
  ]
  rows.push(header)

  for (const emp of sortByName(employees)) {
    const line: string[] = [csvEscapeField(emp.name)]
    for (const sk of sortByName(skills)) {
      const cell = averageFromCells(cells, emp.id, sk.id)
      line.push(
        cell != null ? csvEscapeField(cell.average.toFixed(2)) : '',
      )
    }
    rows.push(line)
  }

  const body = rows.map((r) => r.join(',')).join('\r\n')
  return `${BOM}${EXCEL_SEP_HINT}\r\n${body}\r\n`
}

export function matrixCsvFilename(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `skill-tracker-matrix-${y}-${m}-${d}.csv`
}

export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
