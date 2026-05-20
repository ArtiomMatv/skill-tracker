/**
 * Smoke tests for ``src/App.tsx`` (render with mocked GraphQL).
 */
import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../src/App'
import { DASHBOARD } from '../src/graphql/documents'

function mockAuthMe(
  body: {
    authenticated?: boolean
    username?: string
    requireAuth?: boolean
    registerAvailable?: boolean
  } = {},
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) {
        return new Response(
          JSON.stringify({
            authenticated: false,
            requireAuth: false,
            registerAvailable: false,
            ...body,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url.includes('/api/auth/logout')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      throw new Error(`Unmocked fetch: ${url}`)
    }),
  )
}

beforeEach(() => {
  mockAuthMe()
})

const dashboardVars = {
  assessmentsLimit: 25,
  assessmentsOffset: 0,
  assessmentsOrder: 'DATE_DESC',
  filterEmployeeId: null,
  filterSkillId: null,
  filterScoreLt: null,
}

describe('App', () => {
  it('renders heading when Dashboard resolves', async () => {
    const mocks = [
      {
        request: { query: DASHBOARD, variables: dashboardVars },
        result: {
          data: {
            allData: {
              employees: [{ id: '1', name: 'Ada' }],
              skills: [{ id: '2', name: 'Python' }],
            },
            matrixCells: [],
            assessments: { totalCount: 0, items: [] },
          },
        },
      },
    ]

    render(
      <MockedProvider mocks={mocks}>
        <App />
      </MockedProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /skill tracker/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: 'Python' })).toBeInTheDocument()
  })
})
