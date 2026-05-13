# AI usage log (Skill Tracker mini)

Short notes for the interview conversation.

## Where AI was used

- **Scaffolding**: Project layout (Django `startproject` / `startapp`, Vite `react-ts` template), dependency choices (Graphene + Apollo), and wiring (CORS, `GraphQLView`, `ApolloProvider`).
- **GraphQL schema**: `allData` bundle query and `addAssessment` mutation shape, including validation on save and a simple `ok` / `error` mutation payload for the UI.
- **Frontend**: Matrix table structure, sticky header/first column, average calculation in the client, low-score styling (red background + warning glyph), and the assessment form with refetch after a successful mutation.

## Where I deviated or was critical

- **Django 6 `CheckConstraint`**: Generated code initially used the older `check=` keyword; Django 6 expects `condition=`. Fixed after reading the runtime signature instead of blindly accepting the suggestion.
- **Matrix data shape**: AI suggested various nested GraphQL types for “cell” data; I kept a **minimal schema** (lists only) and compute averages in React to match “one query fetches everything” with less server surface area.
- **Employees/skills creation**: The brief only required a mutation for assessments. I did **not** add create-employee/skill mutations; creating rows via **Django admin** is faster for a demo and avoids scope creep.

## If I had more time

- Seed fixture or management command for demo data.
- Server-side aggregation field (or DataLoader) if assessment volume grew.
- Basic error/empty states polish and stricter uniqueness on names.
