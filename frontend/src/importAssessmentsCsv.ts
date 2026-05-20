/**
 * Parse assessment import CSV (header row required).
 * Expected columns: employee_id, skill_id, score, date[, notes]
 */

export type ParsedImportRow = {
  employeeId: number
  skillId: number
  score: number
  date: string
  notes: string
}

export type ParseImportResult =
  | { ok: true; rows: ParsedImportRow[] }
  | { ok: false; error: string }

const REQUIRED = ['employee_id', 'skill_id', 'score', 'date'] as const

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

export function parseAssessmentImportCsv(text: string): ParseImportResult {
  const lines = text
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length < 2) {
    return { ok: false, error: 'CSV needs a header row and at least one data row.' }
  }
  const rawHeader = lines[0].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
  const headers = rawHeader.map(normalizeHeader)
  for (const col of REQUIRED) {
    if (!headers.includes(col)) {
      return {
        ok: false,
        error: `Missing required column "${col}". Found: ${headers.join(', ')}`,
      }
    }
  }
  const idx = {
    employeeId: headers.indexOf('employee_id'),
    skillId: headers.indexOf('skill_id'),
    score: headers.indexOf('score'),
    date: headers.indexOf('date'),
    notes: headers.indexOf('notes'),
  }
  const rows: ParsedImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const eid = Number(cols[idx.employeeId])
    const sid = Number(cols[idx.skillId])
    const score = Number(cols[idx.score])
    const date = cols[idx.date]
    const notes = idx.notes >= 0 ? (cols[idx.notes] ?? '').trim() : ''
    if (!Number.isInteger(eid) || eid < 1) {
      return { ok: false, error: `Row ${i + 1}: invalid employee_id.` }
    }
    if (!Number.isInteger(sid) || sid < 1) {
      return { ok: false, error: `Row ${i + 1}: invalid skill_id.` }
    }
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return { ok: false, error: `Row ${i + 1}: score must be 1–5.` }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        ok: false,
        error: `Row ${i + 1}: date must be YYYY-MM-DD (got "${date}").`,
      }
    }
    rows.push({ employeeId: eid, skillId: sid, score, date, notes })
  }
  return { ok: true, rows }
}
