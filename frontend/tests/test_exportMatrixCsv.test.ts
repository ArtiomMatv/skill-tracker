import { describe, expect, it } from 'vitest'

import { buildMatrixCsv } from '../src/exportMatrixCsv'
import type { Employee, MatrixCell, Skill } from '../src/matrixUtils'

describe('exportMatrixCsv', () => {
  it('builds header and average cells matching matrix logic', () => {
    const employees: Employee[] = [{ id: '1', name: 'Zoe' }]
    const skills: Skill[] = [
      { id: '10', name: 'Alpha' },
      { id: '20', name: 'Beta' },
    ]
    const cells: MatrixCell[] = [
      { employeeId: '1', skillId: '10', average: 3, count: 2 },
    ]

    const csv = buildMatrixCsv(employees, skills, cells)
    expect(csv.startsWith('\ufeffsep=,\r\n')).toBe(true)
    expect(csv).toContain('Employee')
    expect(csv).toContain('Alpha')
    expect(csv).toContain('Beta')
    expect(csv).toContain('Zoe')
    expect(csv).toContain('3.00')
    const lines = csv.split(/\r\n/)
    expect(lines[1]).toMatch(/^Employee,/)
    expect(lines[2]).toMatch(/^Zoe,3\.00,$/)
  })
})
