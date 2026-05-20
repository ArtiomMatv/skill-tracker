# Skill Tracker (mini)

Small full-stack demo: Django + Graphene GraphQL API (SQLite) and a React + TypeScript SPA that shows average skill scores in a matrix and lets you add assessments.

## Prerequisites

- **Python** 3.12+ (tested with 3.12)
- **Node.js** 20+ (or current LTS; Vite 8 may warn on other versions)

## Docker (optional)

From the repo root (requires [Docker Compose](https://docs.docker.com/compose/)):

```bash
docker compose up --build --wait
```

- **UI (nginx, static build):** http://localhost:8080/
- **API:** http://127.0.0.1:8000/graphql/ (GraphiQL in DEBUG) and http://127.0.0.1:8000/healthz/ (JSON health)

The frontend image bakes in `VITE_GRAPHQL_URL=http://127.0.0.1:8000/graphql/` at **build time** so the browser (on your machine) talks to the API on port 8000. SQLite lives in a named volume (`SQLITE_PATH=/data/db.sqlite3`). The `web` service waits until `api` is healthy before starting.

**Postgres (optional):** `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build`

**Gunicorn (optional):** `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build`

**Auth (optional):** set `REQUIRE_AUTH=1` on the API. **Sign in is only in the browser** (the SPA shows a form on `http://localhost:5173/` when GraphQL returns 401). To avoid `createsuperuser` in the terminal, run **`python manage.py seed_demo --dev-login`** once (after `migrate`): if no superuser exists yet, it creates **`localadmin`** with password **`Local-only-Auth-2026!`** — use those in the SPA. If you already have a superuser, use **`createsuperuser`** or Django admin at **`http://127.0.0.1:8000/admin/`** to add more accounts. **Create account in the UI:** when `DEBUG=True` (default `runserver`) or **`ALLOW_REGISTER=1`**, the SPA can open **Create account** (auth gate) or **New local user…** (while signed in) to POST **`/api/auth/register/`** and switch session—use **Sign out** to log in as someone else. With **`npm run dev`**, Vite proxies `/graphql/` and `/api/` so session cookies stay on **localhost:5173**. `VITE_GRAPHQL_URL` in `.env.local` is **ignored during dev** so `localhost` vs `127.0.0.1` does not break cookies. For Docker, the static build bakes `VITE_GRAPHQL_URL=http://127.0.0.1:8000/graphql/`. The SPA uses `credentials: 'include'` (demo CSRF handling on login).

Load demo data once:

```bash
docker compose run --rm api python manage.py seed_demo
```

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
python manage.py seed_demo --dev-login
export REQUIRE_AUTH=1
python manage.py runserver 127.0.0.1:8000
```

`seed_demo --dev-login` creates `localadmin` / `Local-only-Auth-2026!` only when no superuser exists yet. Do not put shell comments on the same line as `manage.py` arguments (zsh treats `#` as a comment and breaks the command).

```bash
# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

**Do not run `python manage.py …` from `frontend/`** — `manage.py` lives only under **`backend/`**. Use one terminal for Django (`cd backend` + venv) and another for Vite (`cd frontend`). `REQUIRE_AUTH=1` belongs in the **backend** shell before `runserver`, not in the frontend shell.

1. Open the URL Vite prints (usually **http://localhost:5173/**).
2. Scroll to **Score matrix** — you should see demo people × skills with averages; some cells are **below 3** (highlighted).
3. Click **Export matrix (CSV)** to download the same numbers as CSV. The file starts with an Excel **`sep=,`** line so **comma** is used as the column delimiter even when Windows is set to **semicolon** (otherwise everything can land in one column). If it still opens wrong, use **Data → From Text/CSV** and pick comma as delimiter.
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
python manage.py seed_demo --dev-login   # optional: create localadmin / Local-only-Auth-2026! if no superuser yet (for SPA + REQUIRE_AUTH)
python manage.py createsuperuser   # optional, if you prefer a custom admin user
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
| [`backend/tests/test_schema.py`](backend/tests/test_schema.py) | [`tracker/schema.py`](backend/tracker/schema.py) — GraphQL queries and mutations |
| [`backend/tests/test_health_auth.py`](backend/tests/test_health_auth.py) | `/healthz/`, optional `REQUIRE_AUTH` gate |
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
| [`frontend/tests/test_importAssessmentsCsv.test.ts`](frontend/tests/test_importAssessmentsCsv.test.ts) | [`frontend/src/importAssessmentsCsv.ts`](frontend/src/importAssessmentsCsv.ts) |
| [`frontend/e2e/smoke.spec.ts`](frontend/e2e/smoke.spec.ts) | Playwright smoke against a running UI (see CI) |

```bash
cd frontend
npm install
npm run codegen   # refresh types from ../backend/schema.graphql
npm test
npm run test:e2e  # requires docker compose up (see CI)
```

### Continuous integration

On **push** and **pull_request** to **`main`**, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs **pytest** in `backend/`, **`npm ci` + `npm run codegen` + `npm run build`** in `frontend/`, and a **Playwright** smoke test against **`docker compose`** (migrate + `seed_demo` inside the API container).

## GraphQL schema and typed operations

- Regenerate the schema file after API changes:

```bash
cd backend
python manage.py graphql_schema --schema tracker.schema.schema --out schema.graphql
```

- Regenerate TypeScript operation types for the SPA:

```bash
cd frontend
npm run codegen
```

## Deploy (Render blueprint)

See [`render.yaml`](render.yaml) for a minimal Render blueprint (API + static site + Postgres). Set the `sync: false` env vars in the Render dashboard (`ALLOWED_HOSTS`, `SECRET_KEY` is generated, `CORS_*`, `VITE_GRAPHQL_URL`, etc.).

## Frontend setup

In a second terminal:

```bash
cd frontend
cp .env.example .env.local   # optional; defaults to http://127.0.0.1:8000/graphql/
npm install
npm run codegen
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). CORS allows that origin against the Django dev server.

## What we skipped (time / scope)

- **No production hardening** (HTTPS everywhere, strict CSRF on login, rate limits, audit logging) — demo only.
- **Render blueprint** is a starting point: you must set hostnames and secrets in the dashboard.
- Managed backups, observability, and horizontal scaling are out of scope.

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
