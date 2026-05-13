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
- Admin: `http://127.0.0.1:8000/admin/` — create **Employees** and **Skills** here (or any client). The SPA form only adds **Assessments** for existing employees and skills.

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

- **No seed data**: you add employees and skills via admin (or SQL); the README states this so it is not mistaken for a bug.
- **No Docker**, pagination, auth, loading skeletons, or automated tests — per assignment.
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
