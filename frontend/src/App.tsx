import { gql } from '@apollo/client'
import { useMutation, useQuery } from '@apollo/client/react'
import { useMemo, useState } from 'react'
import './App.css'

const ALL_DATA = gql`
  query AllData {
    allData {
      employees {
        id
        name
      }
      skills {
        id
        name
      }
      assessments {
        id
        score
        date
        employee {
          id
        }
        skill {
          id
        }
      }
    }
  }
`

const ADD_ASSESSMENT = gql`
  mutation AddAssessment(
    $employeeId: Int!
    $skillId: Int!
    $score: Int!
    $date: Date!
  ) {
    addAssessment(
      employeeId: $employeeId
      skillId: $skillId
      score: $score
      date: $date
    ) {
      ok
      error
      assessment {
        id
        score
        date
        employee {
          id
        }
        skill {
          id
        }
      }
    }
  }
`

type Employee = { id: string; name: string }
type Skill = { id: string; name: string }
type Assessment = {
  id: string
  score: number
  date: string
  employee: { id: string }
  skill: { id: string }
}

type AddAssessmentResult = {
  addAssessment: {
    ok: boolean
    error: string | null
    assessment: Assessment | null
  }
}

function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function averageForCell(
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

function App() {
  const { data, loading, error, refetch } = useQuery<{
    allData: {
      employees: Employee[]
      skills: Skill[]
      assessments: Assessment[]
    }
  }>(ALL_DATA)

  const [addAssessment, { loading: saving }] = useMutation<
    AddAssessmentResult,
    {
      employeeId: number
      skillId: number
      score: number
      date: string
    }
  >(ADD_ASSESSMENT, {
    onCompleted: (res) => {
      if (res.addAssessment?.ok) void refetch()
    },
  })

  const employees = data?.allData.employees ?? []
  const skills = data?.allData.skills ?? []
  const assessments = data?.allData.assessments ?? []

  const [employeeId, setEmployeeId] = useState('')
  const [skillId, setSkillId] = useState('')
  const [score, setScore] = useState('3')
  const [date, setDate] = useState(todayISODate)
  const [formError, setFormError] = useState<string | null>(null)

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  )
  const sortedSkills = useMemo(
    () => [...skills].sort((a, b) => a.name.localeCompare(b.name)),
    [skills],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const eid = Number(employeeId)
    const sid = Number(skillId)
    const sc = Number(score)
    if (!employeeId || !skillId) {
      setFormError('Choose an employee and a skill.')
      return
    }
    if (!Number.isInteger(sc) || sc < 1 || sc > 5) {
      setFormError('Score must be between 1 and 5.')
      return
    }
    const { data: mutData } = await addAssessment({
      variables: {
        employeeId: eid,
        skillId: sid,
        score: sc,
        date,
      },
    })
    if (!mutData?.addAssessment?.ok) {
      setFormError(mutData?.addAssessment?.error ?? 'Could not save assessment.')
      return
    }
  }

  if (loading) return <p className="muted">Loading…</p>
  if (error)
    return (
      <p className="error">
        Could not load data ({error.message}). Is the API running at{' '}
        <code>{import.meta.env.VITE_GRAPHQL_URL ?? 'http://127.0.0.1:8000/graphql/'}</code>
        ?
      </p>
    )

  return (
    <div className="page">
      <header className="header">
        <h1>Skill tracker</h1>
        <p className="muted">
          Average assessment score per employee and skill. Cells below 3 are
          highlighted.
        </p>
      </header>

      <section className="panel">
        <h2>Score matrix</h2>
        {employees.length === 0 || skills.length === 0 ? (
          <p className="muted">
            Add at least one employee and one skill (via Django admin or your
            own seed) to see the matrix.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th className="sticky-corner" scope="col">
                    Employee / skill
                  </th>
                  {sortedSkills.map((s) => (
                    <th key={s.id} scope="col" title={s.name}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <th scope="row">{emp.name}</th>
                    {sortedSkills.map((sk) => {
                      const cell = averageForCell(
                        assessments,
                        emp.id,
                        sk.id,
                      )
                      const avg = cell?.average
                      const low =
                        cell != null && avg !== undefined && avg < 3
                      return (
                        <td
                          key={sk.id}
                          className={low ? 'cell cell--low' : 'cell'}
                          title={
                            cell
                              ? `Based on ${cell.count} assessment(s), average ${avg?.toFixed(2)}`
                              : 'No assessments'
                          }
                        >
                          {cell ? (
                            <>
                              {avg !== undefined && avg < 3 && (
                                <span className="warn-icon" aria-hidden>
                                  ⚠
                                </span>
                              )}
                              <span className="avg">{avg?.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="empty">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Add assessment</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Employee
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Skill
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {sortedSkills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Score (1–5)
            <select value={score} onChange={(e) => setScore(e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save assessment'}
          </button>
        </form>
        {formError && <p className="error">{formError}</p>}
      </section>
    </div>
  )
}

export default App
