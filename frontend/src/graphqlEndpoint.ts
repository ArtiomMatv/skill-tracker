/**
 * GraphQL HTTP URL and auth API origin.
 *
 * **`npm run dev`:** use relative `/graphql/` and `/api/…` so every request stays
 * on the Vite origin (proxy → Django). `VITE_GRAPHQL_URL` is ignored in dev so
 * `localhost` vs `127.0.0.1` cannot break `SameSite=Lax` session cookies with
 * `REQUIRE_AUTH=1`.
 *
 * **Production / `vite preview`:** `VITE_GRAPHQL_URL` when set, else localhost API.
 */
export function getGraphqlHttpUri(): string {
  if (import.meta.env.DEV) {
    return '/graphql/'
  }
  const env = import.meta.env.VITE_GRAPHQL_URL
  if (env && String(env).length > 0) return String(env)
  return 'http://127.0.0.1:8000/graphql/'
}

/**
 * Base URL for `/api/auth/*`. Empty string in dev → same-origin paths
 * (`/api/auth/login/`, …) so the Vite proxy receives cookies.
 */
export function getAuthApiOrigin(): string {
  if (import.meta.env.DEV) {
    return ''
  }
  const env = import.meta.env.VITE_GRAPHQL_URL
  if (env && String(env).length > 0) {
    try {
      const u = new URL(String(env))
      return `${u.protocol}//${u.host}`
    } catch {
      /* fall through */
    }
  }
  return 'http://127.0.0.1:8000'
}
