/**
 * Tests for ``src/matrixUtils.ts`` (`todayISODate`, `averageFromCells`).
 */
import { describe, expect, it } from 'vitest'

import { averageFromCells, todayISODate, type MatrixCell } from '../src/matrixUtils'

describe('matrixUtils', () => {
  describe('todayISODate', () => {
    it('formats local calendar date as YYYY-MM-DD', () => {
      const fixed = new Date(2026, 4, 13, 15, 30, 0)
      expect(todayISODate(fixed)).toBe('2026-05-13')
    })
  })

  describe('averageFromCells', () => {
    const cells: MatrixCell[] = [
      { employeeId: '10', skillId: '20', average: 3, count: 2 },
    ]

    it('returns null when no cell matches', () => {
      expect(averageFromCells(cells, '99', '20')).toBeNull()
    })

    it('returns average from pre-aggregated cell', () => {
      expect(averageFromCells(cells, '10', '20')).toEqual({
        average: 3,
        count: 2,
      })
    })
  })
})
