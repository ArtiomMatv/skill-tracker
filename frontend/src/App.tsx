import { ServerError } from '@apollo/client/errors'
import { NetworkStatus } from '@apollo/client'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ADD_ASSESSMENT,
  ADD_EMPLOYEE,
  ADD_SKILL,
  BULK_IMPORT_ASSESSMENTS,
  DASHBOARD,
  DELETE_ASSESSMENT,
  FINALIZE_DELETE_ASSESSMENT,
  RESTORE_ASSESSMENT,
  UPDATE_ASSESSMENT,
} from './graphql/documents'
import './App.css'
import {
  buildMatrixCsv,
  downloadCsvFile,
  matrixCsvFilename,
} from './exportMatrixCsv'
import { parseAssessmentImportCsv } from './importAssessmentsCsv'
import type { DashboardQuery } from './generated/operations'
import type { Assessment, MatrixCell } from './matrixUtils'
import { averageFromCells, todayISODate } from './matrixUtils'
import { AuthPanel, type AuthPane } from './AuthPanel'
import { getAuthApiOrigin, getGraphqlHttpUri } from './graphqlEndpoint'

type AuthMeResponse = {
  authenticated?: boolean
  username?: string
  registerAvailable?: boolean
  requireAuth?: boolean
  passwordHint?: string | null
}

const UNDO_MS = 10_000
const THEME_KEY = 'skillTrackerTheme'

type ThemeChoice = 'system' | 'dark' | 'light'

function mapCells(raw: DashboardQuery['matrixCells']): MatrixCell[] {
  return raw.map((c) => ({
    employeeId: String(c.employeeId),
    skillId: String(c.skillId),
    average: c.average,
    count: c.count,
  }))
}

type AddAssessmentResult = {
  addAssessment: {
    ok: boolean
    error: string | null
    assessment: Assessment | null
  }
}

type UpdateAssessmentResult = {
  updateAssessment: {
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

type DeleteAssessmentResult = {
  deleteAssessment: {
    ok: boolean
    error: string | null
  }
}

type RestoreAssessmentResult = {
  restoreAssessment: {
    ok: boolean
    error: string | null
  }
}

type FinalizeDeleteResult = {
  finalizeDeleteAssessment: {
    ok: boolean
    error: string | null
  }
}

type BulkImportResult = {
  bulkImportAssessments: {
    ok: boolean
    createdCount: number
    error: string | null
  }
}

function isLikelyAuthFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    message?: string
    cause?: unknown
    networkError?: unknown
    graphQLErrors?: readonly { message: string }[]
  }
  const chain: unknown[] = [e, e.cause, e.networkError]
  for (const x of chain) {
    if (ServerError.is(x) && x.statusCode === 401) return true
  }
  const msg = typeof e.message === 'string' ? e.message : ''
  if (/\b401\b/.test(msg) || /Unauthorized/i.test(msg)) return true
  if (e.graphQLErrors?.some((g) => g.message === 'Authentication required'))
    return true
  if (/Authentication required/i.test(msg)) return true
  return false
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'dark') {
    root.dataset.theme = 'dark'
    return
  }
  if (choice === 'light') {
    root.dataset.theme = 'light'
    return
  }
  if (typeof window.matchMedia !== 'function') {
    root.dataset.theme = 'light'
    return
  }
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  root.dataset.theme = dark ? 'dark' : 'light'
}

function App() {
  const client = useApolloClient()
  const [listEmployeeId, setListEmployeeId] = useState('')
  const [listSkillId, setListSkillId] = useState('')
  const [listScoreBelow3, setListScoreBelow3] = useState(false)
  const [listOrderDesc, setListOrderDesc] = useState(true)

  const [matrixEmployeeId, setMatrixEmployeeId] = useState('')
  const [matrixSkillId, setMatrixSkillId] = useState('')
  const [matrixOnlyBelow3, setMatrixOnlyBelow3] = useState(false)

  const queryVariables = useMemo(
    () => ({
      assessmentsLimit: 25,
      assessmentsOffset: 0,
      assessmentsOrder: listOrderDesc ? ('DATE_DESC' as const) : ('DATE_ASC' as const),
      filterEmployeeId: listEmployeeId ? Number(listEmployeeId) : null,
      filterSkillId: listSkillId ? Number(listSkillId) : null,
      filterScoreLt: listScoreBelow3 ? 3 : null,
    }),
    [listEmployeeId, listSkillId, listScoreBelow3, listOrderDesc],
  )

  const [addAssessment, { loading: savingAssessment }] =
    useMutation<AddAssessmentResult>(ADD_ASSESSMENT)
  const [updateAssessment, { loading: updatingAssessment }] =
    useMutation<UpdateAssessmentResult>(UPDATE_ASSESSMENT)
  const [addEmployee, { loading: savingEmployee }] =
    useMutation<AddEmployeeResult>(ADD_EMPLOYEE)
  const [addSkill, { loading: savingSkill }] = useMutation<AddSkillResult>(ADD_SKILL)
  const [deleteAssessment] = useMutation<DeleteAssessmentResult>(DELETE_ASSESSMENT)
  const [restoreAssessment] = useMutation<RestoreAssessmentResult>(RESTORE_ASSESSMENT)
  const [finalizeDeleteAssessment] =
    useMutation<FinalizeDeleteResult>(FINALIZE_DELETE_ASSESSMENT)
  const [bulkImportAssessments, { loading: importingCsv }] =
    useMutation<BulkImportResult>(BULK_IMPORT_ASSESSMENTS)

  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(
    null,
  )

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pendingUndoId, setPendingUndoId] = useState<string | null>(null)
  const finalizeTimerRef = useRef<number | null>(null)

  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [editScore, setEditScore] = useState('3')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editMsg, setEditMsg] = useState<string | null>(null)

  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() => {
    const s = localStorage.getItem(THEME_KEY) as ThemeChoice | null
    return s === 'dark' || s === 'light' || s === 'system' ? s : 'system'
  })

  const [importMsg, setImportMsg] = useState<string | null>(null)

  const [sessionUser, setSessionUser] = useState<string | null>(null)
  const [registerAvailable, setRegisterAvailable] = useState(false)
  const [authPane, setAuthPane] = useState<AuthPane>('signin')
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginErr, setLoginErr] = useState<string | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [regUser, setRegUser] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regErr, setRegErr] = useState<string | null>(null)
  const [regBusy, setRegBusy] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [requireAuth, setRequireAuth] = useState(false)
  const [passwordHint, setPasswordHint] = useState<string | null>(null)

  const needAuthGate = authReady && requireAuth && !sessionUser

  const { data, loading, error, refetch, networkStatus } = useQuery<DashboardQuery>(
    DASHBOARD,
    {
      variables: queryVariables,
      skip: !authReady || needAuthGate,
    },
  )

  const clearFinalizeTimer = useCallback(() => {
    if (finalizeTimerRef.current != null) {
      window.clearTimeout(finalizeTimerRef.current)
      finalizeTimerRef.current = null
    }
  }, [])

  const applyAuthMe = useCallback((j: AuthMeResponse) => {
    setRequireAuth(Boolean(j.requireAuth))
    setRegisterAvailable(Boolean(j.registerAvailable))
    setPasswordHint(j.passwordHint ?? null)
    if (j.authenticated && j.username) setSessionUser(j.username)
    else setSessionUser(null)
  }, [])

  const logoutServer = useCallback(async () => {
    try {
      await fetch(`${getAuthApiOrigin()}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      /* ignore */
    }
  }, [])

  /** Clear Apollo cache without refetching (avoids 401 GraphQL right after logout). */
  const clearApolloCache = useCallback(async () => {
    try {
      await client.clearStore()
    } catch {
      /* ignore */
    }
  }, [client])

  const refreshAuthMe = useCallback(async (): Promise<AuthMeResponse | null> => {
    try {
      const r = await fetch(`${getAuthApiOrigin()}/api/auth/me/`, {
        credentials: 'include',
      })
      const j = (await r.json()) as AuthMeResponse
      applyAuthMe(j)
      return j
    } catch {
      applyAuthMe({})
      return null
    }
  }, [applyAuthMe])

  const bootstrapAuth = useCallback(async () => {
    await refreshAuthMe()
    setAuthReady(true)
  }, [refreshAuthMe])

  const authBootstrappedRef = useRef(false)
  useEffect(() => {
    if (authBootstrappedRef.current) return
    authBootstrappedRef.current = true
    queueMicrotask(() => {
      void bootstrapAuth()
    })
  }, [bootstrapAuth])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeChoice)
    applyTheme(themeChoice)
    if (themeChoice !== 'system') return
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeChoice])

  useEffect(() => {
    if (!successNotice) return
    const t = window.setTimeout(() => setSuccessNotice(null), 3000)
    return () => window.clearTimeout(t)
  }, [successNotice])

  useEffect(() => {
    if (!pendingUndoId) {
      clearFinalizeTimer()
      return
    }
    clearFinalizeTimer()
    finalizeTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const id = Number(pendingUndoId)
        await finalizeDeleteAssessment({ variables: { assessmentId: id } })
        setPendingUndoId(null)
        await refetch()
      })()
    }, UNDO_MS)
    return () => clearFinalizeTimer()
  }, [pendingUndoId, finalizeDeleteAssessment, refetch, clearFinalizeTimer])

  const employees = useMemo(() => data?.allData?.employees ?? [], [data])
  const skills = useMemo(() => data?.allData?.skills ?? [], [data])
  const cells = useMemo(() => mapCells(data?.matrixCells ?? []), [data])
  const assessmentsPage = data?.assessments

  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [teamEmployeeMsg, setTeamEmployeeMsg] = useState<string | null>(null)
  const [teamSkillMsg, setTeamSkillMsg] = useState<string | null>(null)

  const [employeeId, setEmployeeId] = useState('')
  const [skillId, setSkillId] = useState('')
  const [score, setScore] = useState('3')
  const [date, setDate] = useState(todayISODate)
  const [assessmentNotes, setAssessmentNotes] = useState('')
  const [assessmentMsg, setAssessmentMsg] = useState<string | null>(null)

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  )
  const sortedSkills = useMemo(
    () => [...skills].sort((a, b) => a.name.localeCompare(b.name)),
    [skills],
  )

  const matrixEmployees = useMemo(() => {
    let list = sortedEmployees
    if (matrixEmployeeId) list = list.filter((e) => e.id === matrixEmployeeId)
    if (matrixOnlyBelow3) {
      list = list.filter((emp) =>
        sortedSkills.some((sk) => {
          const c = averageFromCells(cells, emp.id, sk.id)
          return c != null && c.average < 3
        }),
      )
    }
    return list
  }, [sortedEmployees, sortedSkills, cells, matrixEmployeeId, matrixOnlyBelow3])

  const matrixSkills = useMemo(() => {
    let list = sortedSkills
    if (matrixSkillId) list = list.filter((s) => s.id === matrixSkillId)
    if (matrixOnlyBelow3) {
      list = list.filter((sk) =>
        sortedEmployees.some((emp) => {
          const c = averageFromCells(cells, emp.id, sk.id)
          return c != null && c.average < 3
        }),
      )
    }
    return list
  }, [sortedEmployees, sortedSkills, cells, matrixSkillId, matrixOnlyBelow3])

  const recentAssessments = assessmentsPage?.items ?? []
  const hasAnyAssessments = (assessmentsPage?.totalCount ?? 0) > 0
  const isCompletelyEmpty =
    employees.length === 0 && skills.length === 0 && !hasAnyAssessments

  function openEdit(a: Assessment) {
    setEditingAssessment(a)
    setEditScore(String(a.score))
    setEditDate(a.date)
    setEditNotes(a.notes ?? '')
    setEditMsg(null)
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    setTeamEmployeeMsg(null)
    setSuccessNotice(null)
    const { data: mut } = await addEmployee({
      variables: { name: newEmployeeName },
    })
    if (mut?.addEmployee?.ok) {
      setNewEmployeeName('')
      await refetch()
      setSuccessNotice('Person added.')
    } else {
      setTeamEmployeeMsg(mut?.addEmployee?.error ?? 'Could not add person.')
    }
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault()
    setTeamSkillMsg(null)
    setSuccessNotice(null)
    const { data: mut } = await addSkill({
      variables: { name: newSkillName },
    })
    if (mut?.addSkill?.ok) {
      setNewSkillName('')
      await refetch()
      setSuccessNotice('Skill added.')
    } else {
      setTeamSkillMsg(mut?.addSkill?.error ?? 'Could not add skill.')
    }
  }

  async function handleAssessmentSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAssessmentMsg(null)
    setSuccessNotice(null)
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
        notes: assessmentNotes.trim() || null,
      },
    })
    if (!mutData?.addAssessment?.ok) {
      setAssessmentMsg(
        mutData?.addAssessment?.error ?? 'Could not save assessment.',
      )
      return
    }
    await refetch()
    setSuccessNotice('Assessment saved.')
  }

  async function handleExportCsv() {
    if (employees.length === 0 || skills.length === 0) return
    setExportingCsv(true)
    await Promise.resolve()
    try {
      const csv = buildMatrixCsv(employees, skills, cells)
      downloadCsvFile(csv, matrixCsvFilename())
    } finally {
      setExportingCsv(false)
    }
  }

  async function flushPendingUndo() {
    if (!pendingUndoId) return
    clearFinalizeTimer()
    const id = Number(pendingUndoId)
    await finalizeDeleteAssessment({ variables: { assessmentId: id } })
    setPendingUndoId(null)
    await refetch()
  }

  async function handleConfirmDelete() {
    await flushPendingUndo()
    const id = confirmDeleteId
    if (!id) return
    setSuccessNotice(null)
    setDeletingAssessmentId(id)
    try {
      const { data: mut } = await deleteAssessment({
        variables: { assessmentId: Number(id) },
      })
      setConfirmDeleteId(null)
      if (mut?.deleteAssessment?.ok) {
        await refetch()
        setPendingUndoId(id)
        setSuccessNotice('Assessment removed. You can undo for a few seconds.')
      }
    } finally {
      setDeletingAssessmentId(null)
    }
  }

  async function handleUndoDelete() {
    if (!pendingUndoId) return
    clearFinalizeTimer()
    const id = Number(pendingUndoId)
    const { data: mut } = await restoreAssessment({ variables: { assessmentId: id } })
    setPendingUndoId(null)
    if (mut?.restoreAssessment?.ok) {
      await refetch()
      setSuccessNotice('Removal undone.')
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAssessment) return
    setEditMsg(null)
    const sc = Number(editScore)
    if (!Number.isInteger(sc) || sc < 1 || sc > 5) {
      setEditMsg('Score must be between 1 and 5.')
      return
    }
    const { data: mut } = await updateAssessment({
      variables: {
        assessmentId: Number(editingAssessment.id),
        score: sc,
        date: editDate,
        notes: editNotes.trim() || null,
      },
    })
    if (!mut?.updateAssessment?.ok) {
      setEditMsg(mut?.updateAssessment?.error ?? 'Update failed.')
      return
    }
    setEditingAssessment(null)
    await refetch()
    setSuccessNotice('Assessment updated.')
  }

  async function handleImportFile(file: File | null) {
    setImportMsg(null)
    setSuccessNotice(null)
    if (!file) return
    const text = await file.text()
    const parsed = parseAssessmentImportCsv(text)
    if (parsed.ok === false) {
      setImportMsg(parsed.error)
      return
    }
    if (parsed.rows.length === 0) {
      setImportMsg('No rows to import.')
      return
    }
    const rows = parsed.rows.map((r) => ({
      employeeId: r.employeeId,
      skillId: r.skillId,
      score: r.score,
      date: r.date,
      notes: r.notes || null,
    }))
    const { data: mut } = await bulkImportAssessments({ variables: { rows } })
    if (!mut?.bulkImportAssessments?.ok) {
      setImportMsg(mut?.bulkImportAssessments?.error ?? 'Import failed.')
      return
    }
    await refetch()
    setSuccessNotice(`Imported ${mut.bulkImportAssessments.createdCount} assessment(s).`)
  }

  async function handleSessionLogin(ev: React.FormEvent) {
    ev.preventDefault()
    setLoginErr(null)
    setLoginBusy(true)
    try {
      const r = await fetch(`${getAuthApiOrigin()}/api/auth/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        setLoginErr(j.error ?? 'Login failed.')
        return
      }
      setLoginPass('')
      setLoginUser('')
      await client.resetStore()
      await refreshAuthMe()
    } catch {
      setLoginErr('Sign-in or data load failed. Try again or refresh the page.')
    } finally {
      setLoginBusy(false)
    }
  }

  async function handleSessionLogout() {
    setSessionUser(null)
    setLoginErr(null)
    setRegErr(null)
    setAuthPane('signin')
    await logoutServer()
    await clearApolloCache()
    await refreshAuthMe()
  }

  async function handleSessionRegister(ev: React.FormEvent) {
    ev.preventDefault()
    setRegErr(null)
    setRegBusy(true)
    try {
      const r = await fetch(`${getAuthApiOrigin()}/api/auth/register/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUser.trim(),
          password: regPass,
          passwordConfirm: regConfirm,
        }),
      })
      const j = (await r.json()) as {
        ok?: boolean
        error?: string
        username?: string
        passwordHint?: string
      }
      if (!r.ok || !j.ok) {
        if (j.passwordHint) setPasswordHint(j.passwordHint)
        setRegErr(j.error ?? 'Could not create account.')
        return
      }
      setRegPass('')
      setRegConfirm('')
      setRegUser('')
      setAuthPane('signin')
      await client.resetStore()
      await refreshAuthMe()
    } catch {
      setRegErr('Network error.')
    } finally {
      setRegBusy(false)
    }
  }

  const authPanelProps = {
    authPane,
    setAuthPane: (pane: AuthPane) => {
      setAuthPane(pane)
      setLoginErr(null)
      setRegErr(null)
    },
    registerAvailable,
    passwordHint,
    loginUser,
    setLoginUser,
    loginPass,
    setLoginPass,
    loginErr,
    loginBusy,
    onLogin: (e: React.FormEvent) => void handleSessionLogin(e),
    regUser,
    setRegUser,
    regPass,
    setRegPass,
    regConfirm,
    setRegConfirm,
    regErr,
    regBusy,
    onRegister: (e: React.FormEvent) => void handleSessionRegister(e),
  }

  if (!authReady) {
    return (
      <div className="shell shell--center">
        <p className="muted" role="status">
          Checking session…
        </p>
      </div>
    )
  }

  if (needAuthGate) {
    return (
      <div className="shell shell--center auth-shell">
        <AuthPanel
          {...authPanelProps}
          title="Sign in to skill tracker"
          intro="This API requires a signed-in user (REQUIRE_AUTH=1). Use Sign out anytime to switch accounts. Create account works in local dev (DEBUG=True)."
        />
      </div>
    )
  }

  if (loading && !error)
    return (
      <div className="shell shell--center">
        <p className="muted">Loading…</p>
      </div>
    )
  if (error) {
    const authIssue = isLikelyAuthFailure(error)
    const endpoint = getGraphqlHttpUri()
    const refetching = networkStatus === NetworkStatus.refetch
    const rebounding = loginBusy || regBusy || refetching

    return (
      <div className="shell shell--center">
        {!rebounding ? (
          <p className="error">
            Could not load data ({error.message}). GraphQL endpoint: <code>{endpoint}</code>
            {authIssue
              ? ' (authentication required).'
              : '. Is the API running and reachable?'}
          </p>
        ) : (
          <p className="muted" role="status">
            {loginBusy
              ? 'Signing in…'
              : regBusy
                ? 'Creating account…'
                : 'Loading your data…'}
          </p>
        )}
        {authIssue && !loginBusy && !regBusy && !refetching ? (
          <AuthPanel
            {...authPanelProps}
            title="Session expired"
            intro="Sign in again to continue. Use Sign out on the main screen to switch users."
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero-top">
          <div>
            <p className="eyebrow">Skill management · take-home demo</p>
            <h1>Skill tracker</h1>
          </div>
          <div className="hero-actions">
            {sessionUser ? (
              <div className="hero-session" aria-live="polite">
                <span className="hero-session-user">Signed in as {sessionUser}</span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  title="End session and return to sign-in"
                  onClick={() => void handleSessionLogout()}
                >
                  Sign out
                </button>
              </div>
            ) : null}
            <label className="theme-toggle">
            <span className="sr-only">Theme</span>
            <select
              className="field-input field-input--compact"
              value={themeChoice}
              onChange={(e) => setThemeChoice(e.target.value as ThemeChoice)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          </div>
        </div>
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

      {successNotice ? (
        <p className="notice notice--success" role="status">
          {successNotice}
        </p>
      ) : null}

      {pendingUndoId ? (
        <div className="snackbar" role="status">
          <span>Assessment pending permanent removal.</span>
          <button type="button" className="btn btn--ghost" onClick={() => void handleUndoDelete()}>
            Undo
          </button>
        </div>
      ) : null}

      {isCompletelyEmpty ? (
        <section className="panel panel--empty" aria-labelledby="empty-heading">
          <h2 id="empty-heading">Get started</h2>
          <p className="muted">
            Add people and skills below, then log assessments—or import a CSV of
            assessments.
          </p>
          <p className="empty-actions">
            <a className="btn btn--primary" href="#people-skills-panel">
              Add people &amp; skills
            </a>
            <a className="btn btn--secondary" href="#import-heading">
              Import CSV
            </a>
          </p>
        </section>
      ) : null}

      <section
        className="panel"
        id="people-skills-panel"
        aria-labelledby="people-skills-title"
      >
        <h2 id="people-skills-title">People &amp; skills</h2>
        {employees.length === 0 && skills.length === 0 ? (
          <p className="muted empty-hint">
            No people or skills yet—use the forms below to create your matrix.
          </p>
        ) : null}
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
        <div className="panel-head panel-head--matrix">
          <div className="panel-head-text">
            <h2 id="matrix-heading">Score matrix</h2>
            <p className="matrix-legend muted">
              Cells highlighted in red: average score <strong>below 3</strong>{' '}
              (needs attention).
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={
              employees.length === 0 ||
              skills.length === 0 ||
              exportingCsv
            }
            onClick={() => void handleExportCsv()}
          >
            {exportingCsv ? 'Exporting…' : 'Export matrix (CSV)'}
          </button>
        </div>
        <div className="filter-bar">
          <label className="field field--inline">
            <span className="field-label">Person</span>
            <select
              className="field-input"
              value={matrixEmployeeId}
              onChange={(e) => setMatrixEmployeeId(e.target.value)}
            >
              <option value="">All</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            <span className="field-label">Skill</span>
            <select
              className="field-input"
              value={matrixSkillId}
              onChange={(e) => setMatrixSkillId(e.target.value)}
            >
              <option value="">All</option>
              {sortedSkills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline checkbox-label">
            <input
              type="checkbox"
              checked={matrixOnlyBelow3}
              onChange={(e) => setMatrixOnlyBelow3(e.target.checked)}
            />
            <span>Only rows/columns with a cell below 3</span>
          </label>
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
                  {matrixSkills.map((s) => (
                    <th key={s.id} scope="col" title={s.name}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <th scope="row">{emp.name}</th>
                    {matrixSkills.map((sk) => {
                      const cell = averageFromCells(cells, emp.id, sk.id)
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

      <section className="panel" aria-labelledby="recent-assessments-heading">
        <h2 id="recent-assessments-heading">Recent assessments</h2>
        <p className="muted panel-intro">
          Latest entries (up to 25). Edit, remove (with undo), or use the admin for
          bulk fixes.
        </p>
        <div className="filter-bar">
          <label className="field field--inline">
            <span className="field-label">Person</span>
            <select
              className="field-input"
              value={listEmployeeId}
              onChange={(e) => setListEmployeeId(e.target.value)}
            >
              <option value="">All</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            <span className="field-label">Skill</span>
            <select
              className="field-input"
              value={listSkillId}
              onChange={(e) => setListSkillId(e.target.value)}
            >
              <option value="">All</option>
              {sortedSkills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline checkbox-label">
            <input
              type="checkbox"
              checked={listScoreBelow3}
              onChange={(e) => setListScoreBelow3(e.target.checked)}
            />
            <span>Only scores below 3</span>
          </label>
          <label className="field field--inline checkbox-label">
            <input
              type="checkbox"
              checked={listOrderDesc}
              onChange={(e) => setListOrderDesc(e.target.checked)}
            />
            <span>Newest first</span>
          </label>
        </div>
        {!hasAnyAssessments ? (
          <p className="muted">
            No assessments yet—log one below or import a CSV.
          </p>
        ) : (
          <div className="table-wrap table-wrap--compact">
            <table className="recent-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Person</th>
                  <th scope="col">Skill</th>
                  <th scope="col">Score</th>
                  <th scope="col">Notes</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.date}</td>
                    <td>{a.employee.name}</td>
                    <td>{a.skill.name}</td>
                    <td>{a.score}</td>
                    <td className="notes-cell">{a.notes || '—'}</td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit assessment"
                        aria-label={`Edit assessment ${a.id}`}
                        onClick={() => openEdit(a)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Delete assessment"
                        aria-label={`Delete assessment ${a.id}`}
                        disabled={deletingAssessmentId === a.id}
                        onClick={() =>
                          void (async () => {
                            await flushPendingUndo()
                            setConfirmDeleteId(a.id)
                          })()
                        }
                      >
                        {deletingAssessmentId === a.id ? '…' : '🗑'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assessmentsPage && assessmentsPage.totalCount > 25 ? (
              <p className="muted">
                Showing 25 of {assessmentsPage.totalCount} (filters apply server-side).
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="panel" id="import-heading" aria-labelledby="import-csv-title">
        <h2 id="import-csv-title">Import assessments (CSV)</h2>
        <p className="muted panel-intro">
          Header row required: <code>employee_id,skill_id,score,date</code> and optional{' '}
          <code>notes</code>. Use GraphQL / admin ids for people and skills.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="file-input"
          disabled={importingCsv}
          onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
        />
        {importingCsv ? <p className="muted">Importing…</p> : null}
        {importMsg ? (
          <p className="error" role="alert">
            {importMsg}
          </p>
        ) : null}
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
          <label className="field">
            <span className="field-label">Notes (optional)</span>
            <input
              className="field-input"
              value={assessmentNotes}
              onChange={(e) => setAssessmentNotes(e.target.value)}
              placeholder="Context for this rating"
              maxLength={2000}
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

      {confirmDeleteId ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
          >
            <h3 id="confirm-delete-title">Remove assessment?</h3>
            <p className="muted">
              You can undo for a short time before it is permanently deleted.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => void handleConfirmDelete()}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingAssessment ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-assessment-title"
          >
            <h3 id="edit-assessment-title">Edit assessment</h3>
            <p className="muted">
              {editingAssessment.employee.name} · {editingAssessment.skill.name}
            </p>
            <form
              className="stacked-form"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSaveEdit(e)
              }}
            >
              <label className="field">
                <span className="field-label">Score</span>
                <select
                  className="field-input"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
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
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Notes</span>
                <input
                  className="field-input"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  maxLength={2000}
                />
              </label>
              {editMsg ? (
                <p className="error" role="alert">
                  {editMsg}
                </p>
              ) : null}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setEditingAssessment(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={updatingAssessment}
                >
                  {updatingAssessment ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
