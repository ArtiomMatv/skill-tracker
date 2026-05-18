/**
 * Smoke tests for ``src/App.tsx`` (render with mocked GraphQL).
 */
import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from '../src/App'
import { ALL_DATA } from '../src/graphql/documents'

describe('App', () => {
  it('renders heading when AllData resolves', async () => {
    const mocks = [
      {
        request: { query: ALL_DATA },
        result: {
          data: {
            allData: {
              employees: [{ id: '1', name: 'Ada' }],
              skills: [{ id: '2', name: 'Python' }],
              assessments: [],
            },
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
