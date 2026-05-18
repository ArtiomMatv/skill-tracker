# Skill Tracker (mini)

Small full-stack demo: Django + Graphene GraphQL API (SQLite) and a React + TypeScript SPA that shows average skill scores in a matrix and lets you add assessments.

## Prerequisites

- **Python** 3.12+ (tested with 3.12)
- **Node.js** 20+ (or current LTS; Vite 8 may warn on other versions)

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional, for Django admin
python manage.py runserver 0.0.0.0:8000
```

- API: `http://127.0.0.1:8000/graphql/` (GraphiQL enabled in DEBUG)
- Admin: `http://127.0.0.1:8000/admin/` — optional; the SPA can create **employees**, **skills**, and **assessments** via GraphQL.

### Adding people (“users”) for assessments

In this app, **employees** are the people you assess (matrix rows). You can:

1. **In the browser (fastest):** use **People & skills** — “Add a person” sends the `addEmployee` mutation; they immediately appear in the matrix and in the assessment dropdown.
2. **Django admin:** `Employees` → *Add* — same underlying `Employee` model.

Skills (columns) work the same way: **Add a skill** in the UI (`addSkill`) or via admin.

## Tests

### Backend (pytest)

Function-based tests live under [`backend/tests/`](backend/tests/) (not inside the `tracker` app). File names mirror the module they cover:

| File | Exercises |
|------|-----------|
| [`backend/tests/test_models.py`](backend/tests/test_models.py) | [`tracker/models.py`](backend/tracker/models.py) — score validation |
| [`backend/tests/test_schema.py`](backend/tests/test_schema.py) | [`tracker/schema.py`](backend/tracker/schema.py) — `allData`, `addAssessment`, `addEmployee`, `addSkill` over HTTP |

```bash
cd backend
source .venv/bin/activate
pytest
```

### Frontend (Vitest)

| File | Exercises |
|------|-----------|
| [`frontend/tests/test_matrixUtils.test.ts`](frontend/tests/test_matrixUtils.test.ts) | [`frontend/src/matrixUtils.ts`](frontend/src/matrixUtils.ts) |
| [`frontend/tests/test_App.test.tsx`](frontend/tests/test_App.test.tsx) | [`frontend/src/App.tsx`](frontend/src/App.tsx) (smoke render with mocked GraphQL) |

```bash
cd frontend
npm test
```

## Frontend setup

In a second terminal:

```bash
cd frontend
cp .env.example .env.local   # optional; defaults to http://127.0.0.1:8000/graphql/
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). CORS allows that origin against the Django dev server.

## What we skipped (time / scope)

- **No seed script in repo**: use the in-app **People & skills** section or Django admin if you want starter rows.
- **No Docker**, pagination, auth, or loading skeletons — kept small on purpose.
- **Client-side averages**: the API returns flat lists; the UI aggregates. For large histories, a dedicated aggregated field or pagination would be the next step.

## Submitting

From this folder:

```bash
git init
git add .
git commit -m "Initial skill tracker mini app"
# create a remote repository, then:
git remote add origin <your-repo-url>
git push -u origin main
```

Send the remote URL with your application.

## AI usage

See [AI_LOG.md](AI_LOG.md) for a short log of where AI was used and where suggestions were overridden.
