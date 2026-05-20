import type { FormEvent } from 'react'

export type AuthPane = 'signin' | 'register'

const DEFAULT_PASSWORD_HINT =
  'At least 8 characters. Example for local dev: Local-only-Auth-2026!'

type AuthPanelProps = {
  authPane: AuthPane
  setAuthPane: (pane: AuthPane) => void
  registerAvailable: boolean
  passwordHint?: string | null
  loginUser: string
  setLoginUser: (v: string) => void
  loginPass: string
  setLoginPass: (v: string) => void
  loginErr: string | null
  loginBusy: boolean
  onLogin: (ev: FormEvent) => void
  regUser: string
  setRegUser: (v: string) => void
  regPass: string
  setRegPass: (v: string) => void
  regConfirm: string
  setRegConfirm: (v: string) => void
  regErr: string | null
  regBusy: boolean
  onRegister: (ev: FormEvent) => void
  title?: string
  intro?: string
}

export function AuthPanel({
  authPane,
  setAuthPane,
  registerAvailable,
  passwordHint,
  loginUser,
  setLoginUser,
  loginPass,
  setLoginPass,
  loginErr,
  loginBusy,
  onLogin,
  regUser,
  setRegUser,
  regPass,
  setRegPass,
  regConfirm,
  setRegConfirm,
  regErr,
  regBusy,
  onRegister,
  title = 'Sign in to continue',
  intro,
}: AuthPanelProps) {
  const hint = passwordHint || DEFAULT_PASSWORD_HINT

  return (
    <div className="auth-panel">
      <h2 className="auth-panel-title">{title}</h2>
      {intro ? <p className="muted auth-panel-intro">{intro}</p> : null}
      {registerAvailable ? (
        <div className="auth-pane-tabs" role="tablist" aria-label="Authentication">
          <button
            type="button"
            role="tab"
            aria-selected={authPane === 'signin'}
            className={`auth-pane-tab${authPane === 'signin' ? ' auth-pane-tab--active' : ''}`}
            onClick={() => setAuthPane('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authPane === 'register'}
            className={`auth-pane-tab${authPane === 'register' ? ' auth-pane-tab--active' : ''}`}
            onClick={() => setAuthPane('register')}
          >
            Create account
          </button>
        </div>
      ) : null}

      {authPane === 'signin' || !registerAvailable ? (
        <form className="session-login-fields" onSubmit={onLogin}>
          <label className="field">
            <span className="field-label">Username</span>
            <input
              className="field-input"
              name="username"
              autoComplete="username"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              disabled={loginBusy}
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              name="password"
              type="password"
              autoComplete="current-password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              disabled={loginBusy}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={loginBusy}>
            {loginBusy ? 'Signing in…' : 'Sign in'}
          </button>
          {loginErr ? <p className="error">{loginErr}</p> : null}
        </form>
      ) : (
        <form className="session-login-fields" onSubmit={onRegister}>
          <p className="muted auth-panel-password-hint">{hint}</p>
          <label className="field">
            <span className="field-label">Username</span>
            <input
              className="field-input"
              name="reg-username"
              autoComplete="username"
              value={regUser}
              onChange={(e) => setRegUser(e.target.value)}
              disabled={regBusy}
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              name="reg-password"
              type="password"
              autoComplete="new-password"
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
              disabled={regBusy}
            />
          </label>
          <label className="field">
            <span className="field-label">Confirm password</span>
            <input
              className="field-input"
              name="reg-password2"
              type="password"
              autoComplete="new-password"
              value={regConfirm}
              onChange={(e) => setRegConfirm(e.target.value)}
              disabled={regBusy}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={regBusy}>
            {regBusy ? 'Creating…' : 'Create account & sign in'}
          </button>
          {regErr ? <p className="error">{regErr}</p> : null}
        </form>
      )}
    </div>
  )
}
