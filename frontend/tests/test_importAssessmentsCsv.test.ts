import { describe, expect, it } from 'vitest'

import { parseAssessmentImportCsv } from '../src/importAssessmentsCsv'

describe('parseAssessmentImportCsv', () => {
  it('parses valid header and rows', () => {
    const csv = `employee_id,skill_id,score,date,notes
1,2,3,2026-01-15,hello
3,4,5,2026-02-01,`
    const r = parseAssessmentImportCsv(csv)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]).toEqual({
      employeeId: 1,
      skillId: 2,
      score: 3,
      date: '2026-01-15',
      notes: 'hello',
    })
  })

  it('rejects missing columns', () => {
    const r = parseAssessmentImportCsv('a,b,c\n1,2,3')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('employee_id')
  })
})
