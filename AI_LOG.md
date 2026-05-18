# AI usage log (Skill Tracker mini)

Notes for the interview: what I decided, what I challenged, and where AI only sped up typing.

## How I used AI (and how I did not)

I treated AI as a **pair programmer for boilerplate**, not as the architect. I wrote the product shape first (matrix + assessments + one GraphQL round-trip), then used AI mainly to **generate repetitive wiring** (Django project skeleton, Vite template, Apollo provider, sticky table CSS). Every structural choice below I made or validated myself before keeping it.

I did **not** let AI drive: the data model, the GraphQL contract, aggregation strategy, scope vs. the written brief, or how the demo should feel for a company like [Pluvo](https://www.pluvo.com/nl/learning-management-systeem).

---

## What I analysed and decided myself

### 1. Data model: assessments as history, not a single “level”

I modelled **`Assessment` as the source of truth** (employee + skill + score + date), not a denormalised “current skill level” on the employee. That matches how real LMS/skill tools work: you want **history** for conversations (“when did this drop?”) and you derive dashboards from events. The matrix shows **averages** because the brief asked for averages; with more time I would expose last score vs. average or trend, but the schema already supports that without migration.

Validation is **defence in depth**: field validator + DB `CheckConstraint` (I had to fix Django 6’s `condition=` vs legacy `check=` after reading the error—AI’s first pass was wrong for my Django version).

### 2. GraphQL: one `allData` query, thin mutations

I deliberately avoided a “cell” type or server-side matrix in v1:

- **Query:** `allData { employees, skills, assessments }` — one round-trip, easy to reason about in GraphiQL, matches “fetch everything.”
- **Mutations:** `addAssessment` returns `ok` / `error` / `assessment` so the UI can show validation failures without parsing GraphQL errors. I chose that over “throw only” because demo UX matters for a take-home.

I added **`addEmployee` / `addSkill` after thinking about the reviewer flow**: the brief only required assessment mutation, but an empty matrix with “use Django admin” is a bad first impression. Extra mutations sit **on top of the same models**—no scope creep in the schema, only in the API surface.

`select_related` on assessments was my call for N+1 avoidance on the read path.

### 3. Frontend: client-side aggregation on purpose

Averages live in **`matrixUtils`** (pure functions, unit-tested) rather than hidden in JSX. I kept aggregation **in the client** because:

- Dataset is tiny for a mini app; server matrix fields would be premature optimisation.
- The brief’s query is literally “everything”; computing averages in React keeps the GraphQL layer stable if we add pagination later (we’d move aggregation server-side then).

Highlighting **average &lt; 3** with red + icon mirrors “gap / risk” language on Pluvo’s site (compliance, who needs attention)—product metaphor, not just CSS.

### 4. Pluvo context (for this application)

I read their public LMS page: central place for **trainings, certificates, skills**, onboarding, compliance, skill management dashboards. This take-home is a **slice** of that story (skills matrix + assessments), not a clone of Pluvo.

For UI I aimed for **clean LMS / skill-dashboard** feel (teal/mint, airy layout, clear sections: people/skills → matrix → log assessment). I **rejected AI’s first purple theme** after looking at Pluvo’s marketing site—it reads green/teal, not violet. Colours are still an unofficial approximation (no brand kit), called out in the footer.

### 5. Scope discipline vs. the written brief

| Brief | My choice |
|--------|-----------|
| No auth | No auth on API/SPA; Django admin only for staff |
| No tests required | I added pytest + Vitest anyway—tests document behaviour I care about in interview |
| Minimal features | Core path is thin; extras (add person/skill in UI) are justified as **demo ergonomics** |

I can defend every file outside `models.py` / `schema.py` / `App.tsx` as either required wiring or intentional quality bar.

### 6. Dev / reviewer experience

- **CORS** only for local Vite origins.
- **`ALLOWED_HOSTS`** includes `0.0.0.0` after hitting `DisallowedHost` when opening the wrong URL—documented that reviewers should use `127.0.0.1`.
- Tests in **`backend/tests/`** and **`frontend/tests/`** named after the module under test (`test_models`, `test_schema`, `test_matrixUtils`)—my structure, not Django’s default class in `tracker/tests.py`.

---

## Where AI helped (low-risk parts)

- Initial `django-admin` / `create-vite` commands and `requirements.txt` pins.
- Draft GraphQL type boilerplate and Apollo `gql` documents (I edited field lists and mutation payloads).
- First pass at matrix table CSS and form layout (I reworked tokens after Pluvo colour check).

---

## If I had more time

- Seed command or fixture so reviewers see a populated matrix in 10 seconds.
- Server-side `matrixAverages` field or pagination when assessment count grows.
- Unique constraints on employee/skill names; delete/edit flows; optional “last assessment” per cell.
- E2E test: add person → add skill → log assessment → cell updates.
