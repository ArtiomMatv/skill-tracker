# Skill Tracker (mini)

Small full-stack demo: Django + Graphene GraphQL API (SQLite) and a React + TypeScript SPA that shows average skill scores in a matrix and lets you add assessments.

## Prerequisites

- **Python** 3.12+ (tested with 3.12)
- **Node.js** 20+ (or current LTS; Vite 8 may warn on other versions)

## 60-second reviewer path

From zero to a filled matrix:

```bash
git clone https://github.com/ArtiomMatv/skill-tracker.git
cd skill-tracker

# Terminal 1 — API
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

```bash
# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

1. Open the URL Vite prints (usually **http://localhost:5173/**).
2. Scroll to **Score matrix** — you should see demo people × skills with averages; some cells are **below 3** (highlighted).
3. Click **Export matrix (CSV)** to download the same numbers as CSV.
4. Optionally use **Log assessment** or **People & skills** to mutate data.

**URLs:** Use **http://127.0.0.1:8000/** or **http://localhost:8000/** for the API and admin in the browser. Do **not** open **http://0.0.0.0:8000/** — `0.0.0.0` is only a bind address for `runserver`, not a valid `Host` header (Django returns `DisallowedHost`).

**Clean slate:** `rm backend/db.sqlite3` then run `migrate` and `seed_demo` again from `backend/`.

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo   # demo employees, skills, assessments (idempotent)
python manage.py createsuperuser   # optional, for Django admin
python manage.py runserver 127.0.0.1:8000
```

- API: `http://127.0.0.1:8000/graphql/` (GraphiQL enabled in DEBUG)
- Admin: `http://127.0.0.1:8000/admin/` — optional; the SPA can create **employees**, **skills**, and **assessments** via GraphQL.

### Adding people (“users”) for assessments

In this app, **employees** are the people you assess (matrix rows). You can:

1. **In the browser (fastest):** use **People & skills** — “Add a person” sends the `addEmployee` mutation; they immediately appear in the matrix and in the assessment dropdown.
2. **Django admin:** `Employees` → *Add* — same underlying `Employee` model.
3. **CLI:** `python manage.py seed_demo` after migrate.

Skills (columns) work the same way: **Add a skill** in the UI (`addSkill`), admin, or `seed_demo`.

## Tests

### Backend (pytest)

Function-based tests live under [`backend/tests/`](backend/tests/) (not inside the `tracker` app). File names mirror the module they cover:

| File | Exercises |
|------|-----------|
| [`backend/tests/test_models.py`](backend/tests/test_models.py) | [`tracker/models.py`](backend/tracker/models.py) — score validation |
| [`backend/tests/test_schema.py`](backend/tests/test_schema.py) | [`tracker/schema.py`](backend/tracker/schema.py) — `allData`, `addAssessment`, `addEmployee`, `addSkill` over HTTP |
| [`backend/tests/test_seed_demo.py`](backend/tests/test_seed_demo.py) | [`seed_demo`](backend/tracker/management/commands/seed_demo.py) management command |

```bash
cd backend
source .venv/bin/activate
pytest
```

### Frontend (Vitest)

| File | Exercises |
|------|-----------|
| [`frontend/tests/test_exportMatrixCsv.test.ts`](frontend/tests/test_exportMatrixCsv.test.ts) | [`frontend/src/exportMatrixCsv.ts`](frontend/src/exportMatrixCsv.ts) |
| [`frontend/tests/test_matrixUtils.test.ts`](frontend/tests/test_matrixUtils.test.ts) | [`frontend/src/matrixUtils.ts`](frontend/src/matrixUtils.ts) |
| [`frontend/tests/test_App.test.tsx`](frontend/tests/test_App.test.tsx) | [`frontend/src/App.tsx`](frontend/src/App.tsx) (smoke render with mocked GraphQL) |

```bash
cd frontend
npm test
```

### Continuous integration

On **push** and **pull_request** to **`main`**, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs **pytest** in `backend/` and **`npm ci` + `npm run build`** in `frontend/`.

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

- **No Docker** — local venv + `npm run dev` only (CI uses GitHub Actions for regression checks).
- No pagination, auth on the API, or loading skeletons — kept small on purpose.
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
