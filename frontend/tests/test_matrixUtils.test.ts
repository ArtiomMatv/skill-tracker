/**
 * Tests for ``src/matrixUtils.ts`` (`todayISODate`, `averageForCell`).
 */
import { describe, expect, it } from 'vitest'

import {
  averageForCell,
  todayISODate,
  type Assessment,
} from '../src/matrixUtils'

describe('matrixUtils', () => {
  describe('todayISODate', () => {
    it('formats local calendar date as YYYY-MM-DD', () => {
      const fixed = new Date(2026, 4, 13, 15, 30, 0)
      expect(todayISODate(fixed)).toBe('2026-05-13')
    })
  })

  describe('averageForCell', () => {
    const assessments: Assessment[] = [
      {
        id: '1',
        score: 2,
        date: '2026-01-01',
        employee: { id: '10' },
        skill: { id: '20' },
      },
      {
        id: '2',
        score: 4,
        date: '2026-02-01',
        employee: { id: '10' },
        skill: { id: '20' },
      },
      {
        id: '3',
        score: 5,
        date: '2026-01-15',
        employee: { id: '11' },
        skill: { id: '20' },
      },
    ]

    it('returns null when there are no matching assessments', () => {
      expect(averageForCell(assessments, '99', '20')).toBeNull()
    })

    it('computes average and count for employee/skill pair', () => {
      expect(averageForCell(assessments, '10', '20')).toEqual({
        average: 3,
        count: 2,
      })
    })
  })
})
