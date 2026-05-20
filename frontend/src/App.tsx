import { useMutation, useQuery } from '@apollo/client/react'
import { useMemo, useState } from 'react'
import {
  ADD_ASSESSMENT,
  ADD_EMPLOYEE,
  ADD_SKILL,
  ALL_DATA,
} from './graphql/documents'
import './App.css'
import {
  buildMatrixCsv,
  downloadCsvFile,
  matrixCsvFilename,
} from './exportMatrixCsv'
import type { Assessment, Employee, Skill } from './matrixUtils'
import { averageForCell, todayISODate } from './matrixUtils'

type AddAssessmentResult = {
  addAssessment: {
    ok: boolean
    error: string | null
    assessment: Assessment | null
  }
}

type AddEmployeeResult = {
  addEmployee: {
    ok: boolean
    error: string | null
  }
}

type AddSkillResult = {
  addSkill: {
    ok: boolean
    error: string | null
  }
}

function App() {
  const { data, loading, error, refetch } = useQuery<{
    allData: {
      employees: Employee[]
      skills: Skill[]
      assessments: Assessment[]
    }
  }>(ALL_DATA)

  const [addAssessment, { loading: savingAssessment }] =
    useMutation<AddAssessmentResult>(ADD_ASSESSMENT)
  const [addEmployee, { loading: savingEmployee }] =
    useMutation<AddEmployeeResult>(ADD_EMPLOYEE)
  const [addSkill, { loading: savingSkill }] = useMutation<AddSkillResult>(ADD_SKILL)

  const employees = useMemo(
    () => data?.allData.employees ?? [],
    [data],
  )
  const skills = useMemo(() => data?.allData.skills ?? [], [data])
  const assessments = useMemo(
    () => data?.allData.assessments ?? [],
    [data],
  )

  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [teamEmployeeMsg, setTeamEmployeeMsg] = useState<string | null>(null)
  const [teamSkillMsg, setTeamSkillMsg] = useState<string | null>(null)

  const [employeeId, setEmployeeId] = useState('')
  const [skillId, setSkillId] = useState('')
  const [score, setScore] = useState('3')
  const [date, setDate] = useState(todayISODate)
  const [assessmentMsg, setAssessmentMsg] = useState<string | null>(null)

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  )
  const sortedSkills = useMemo(
    () => [...skills].sort((a, b) => a.name.localeCompare(b.name)),
    [skills],
  )

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    setTeamEmployeeMsg(null)
    const { data: mut } = await addEmployee({
      variables: { name: newEmployeeName },
    })
    if (mut?.addEmployee?.ok) {
      setNewEmployeeName('')
      await refetch()
    } else {
      setTeamEmployeeMsg(mut?.addEmployee?.error ?? 'Could not add person.')
    }
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault()
    setTeamSkillMsg(null)
    const { data: mut } = await addSkill({
      variables: { name: newSkillName },
    })
    if (mut?.addSkill?.ok) {
      setNewSkillName('')
      await refetch()
    } else {
      setTeamSkillMsg(mut?.addSkill?.error ?? 'Could not add skill.')
    }
  }

  async function handleAssessmentSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAssessmentMsg(null)
    const eid = Number(employeeId)
    const sid = Number(skillId)
    const sc = Number(score)
    if (!employeeId || !skillId) {
      setAssessmentMsg('Choose an employee and a skill.')
      return
    }
    if (!Number.isInteger(sc) || sc < 1 || sc > 5) {
      setAssessmentMsg('Score must be between 1 and 5.')
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
      setAssessmentMsg(
        mutData?.addAssessment?.error ?? 'Could not save assessment.',
      )
      return
    }
    await refetch()
  }

  if (loading)
    return (
      <div className="shell shell--center">
        <p className="muted">Loading…</p>
      </div>
    )
  if (error)
    return (
      <div className="shell shell--center">
        <p className="error">
          Could not load data ({error.message}). Is the API running at{' '}
          <code>
            {import.meta.env.VITE_GRAPHQL_URL ?? 'http://127.0.0.1:8000/graphql/'}
          </code>
          ?
        </p>
      </div>
    )

  return (
    <div className="shell">
      <header className="hero">
        <p className="eyebrow">Skill management · take-home demo</p>
        <h1>Skill tracker</h1>
        <p className="lead">
          Average score per person and skill. Cells below 3 are flagged so gaps
          stay visible—similar to how an LMS surfaces skill and compliance gaps
          (see{' '}
          <a
            href="https://www.pluvo.com/nl/learning-management-systeem"
            target="_blank"
            rel="noreferrer"
          >
            Pluvo
          </a>
          ).
        </p>
      </header>

      <section className="panel" aria-labelledby="people-skills-heading">
        <h2 id="people-skills-heading">People &amp; skills</h2>
        <p className="muted panel-intro">
          <strong>Employees</strong> are the people you assess (matrix rows).{' '}
          <strong>Skills</strong> are the columns. Add both here, then log
          assessments—no Django admin required for a quick demo.
        </p>
        <div className="two-col">
          <form className="stacked-form" onSubmit={handleAddEmployee}>
            <h3 className="h3">Add a person</h3>
            <label className="field">
              <span className="field-label">Name</span>
              <input
                className="field-input"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="e.g. Jamie de Vries"
                maxLength={200}
                autoComplete="name"
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={savingEmployee}
            >
              {savingEmployee ? 'Adding…' : 'Add to matrix'}
            </button>
            {teamEmployeeMsg && (
              <p className="error" role="alert">
                {teamEmployeeMsg}
              </p>
            )}
          </form>
          <form className="stacked-form" onSubmit={handleAddSkill}>
            <h3 className="h3">Add a skill</h3>
            <label className="field">
              <span className="field-label">Skill name</span>
              <input
                className="field-input"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g. Onboarding, GraphQL, Safety"
                maxLength={200}
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={savingSkill}
            >
              {savingSkill ? 'Adding…' : 'Add skill column'}
            </button>
            {teamSkillMsg && (
              <p className="error" role="alert">
                {teamSkillMsg}
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="panel" aria-labelledby="matrix-heading">
        <div className="panel-head">
          <h2 id="matrix-heading">Score matrix</h2>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={employees.length === 0 || skills.length === 0}
            onClick={() => {
              const csv = buildMatrixCsv(employees, skills, assessments)
              downloadCsvFile(csv, matrixCsvFilename())
            }}
          >
            Export matrix (CSV)
          </button>
        </div>
        {employees.length === 0 || skills.length === 0 ? (
          <p className="muted">
            Add at least one person and one skill above to see the matrix.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th className="sticky-corner" scope="col">
                    Person / skill
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

      <section className="panel" aria-labelledby="assessment-heading">
        <h2 id="assessment-heading">Log assessment</h2>
        <p className="muted panel-intro">
          Each entry is one dated score (1–5) for a person on a skill. Multiple
          entries average into the cell.
        </p>
        <form className="form" onSubmit={handleAssessmentSubmit}>
          <label className="field">
            <span className="field-label">Person</span>
            <select
              className="field-input"
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
          <label className="field">
            <span className="field-label">Skill</span>
            <select
              className="field-input"
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
          <label className="field">
            <span className="field-label">Score (1–5)</span>
            <select
              className="field-input"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Date</span>
            <input
              className="field-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={savingAssessment}
          >
            {savingAssessment ? 'Saving…' : 'Save assessment'}
          </button>
        </form>
        {assessmentMsg && (
          <p className="error" role="alert">
            {assessmentMsg}
          </p>
        )}
      </section>

      <footer className="footer">
        <p>
          UI styling is an <strong>unofficial</strong> nod to modern LMS / skill
          dashboards (teal / mint accents, airy layout)—inspired by public pages such
          as{' '}
          <a
            href="https://www.pluvo.com/nl/learning-management-systeem"
            target="_blank"
            rel="noreferrer"
          >
            Pluvo’s learning platform
          </a>
          . It is not Pluvo branding or a product integration.
        </p>
      </footer>
    </div>
  )
}

export default App
