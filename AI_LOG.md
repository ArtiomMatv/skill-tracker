# AI usage log (Skill Tracker mini)

Notes for the interview: what I decided, what I challenged, and where AI mainly sped up execution.

## How I used AI (and how I did not)

I treated AI (Cursor / Claude) as a **strong pair for implementation velocity**, not as the sole owner of product or schema design. For the **original take-home**, I owned the core shape: assessments as **history**, matrix as **derived averages**, GraphQL mutations with **`ok` / `error`** for demo UX, and keeping the first version intentionally small.

Later, a **roadmap pass** deliberately went **beyond** the written brief (auth optional, tests, Docker, codegen, server-side aggregates, etc.). For that phase AI was useful for **wiring many files consistently**; I still **validated** trade-offs (e.g. Graphene 3 has no `Schema(middleware=…)` — we used Django middleware for `REQUIRE_AUTH` instead of blindly copying older Graphene patterns).

I did **not** outsource without review: **soft-delete vs hard-delete semantics**, **undo + finalize timing**, **CSV import strictness** (IDs vs names), and **“fetch everything” vs split queries`** — those are discussed below.

---

## Critical thinking: original brief vs what shipped

### 1. Data model: assessments as history (unchanged principle)

**Decision (mine):** `Assessment` remains the source of truth: employee + skill + score + date. Averages are derived, not stored as a single “current level” row.

**Evolution:** Added **`notes`** (optional context per rating) and **`deleted_at`** (soft delete) so the UI can offer undo / finalize without a background worker. That is extra surface area vs the brief; I accepted it for **demo realism** and **list hygiene**, not because the minimum required it.

**Critical check:** Soft delete complicates queries (“always filter `deleted_at IS NULL`”). I accepted that cost because it keeps **restore** simple; alternative was hard delete only and fake “undo” in UI — worse for an honest interview story.

### 2. GraphQL: from “one `allData` blob” to a deliberate split

**Original intent (brief):** one query to “fetch everything” for a tiny app.

**Reality after roadmap:** **`Dashboard`** combines:

- `allData { employees, skills }` — still the “who are the rows/columns”
- `matrixCells { employeeId, skillId, average, count }` — **server-side aggregation** for the matrix
- `assessments(…)` — **paginated / filtered** list for “recent” UI

**Why I changed my mind (critical):** The first version computed averages in React from **all** assessments. That is fine for a 10-row demo; it **does not scale** and couples “matrix” to “load every event.” Splitting **`matrixCells`** makes the contract honest: the matrix depends on **aggregates**, not on shipping the full event stream. The brief’s spirit (“show averages”) is preserved; the letter (“one query”) is intentionally relaxed — I’d call that out in interview: **trade-off between simplicity of one document and clarity at scale.**

**Mutations:** Still prefer **`ok` / `error` / payload`** where it helps the UI; added update / restore / finalize / bulk import as **separate mutations** rather than one mega-mutation — easier to test and to reason about permissions later.

**Where AI stumbled:** Early Graphene snippets assumed patterns that **don’t match Graphene 3** (e.g. `Schema(..., middleware=…)`). I caught that and moved auth gating to **Django middleware** returning 401 JSON for unauthenticated GraphQL POSTs when `REQUIRE_AUTH=1`.

### 3. Frontend: client aggregation → hybrid

**Original:** averages in **`matrixUtils`** from raw assessments.

**Now:** matrix reads **`averageFromCells`** fed by **`matrixCells`** from the API; CSV export follows the same source so export matches the grid.

**Critical thinking:** I **removed** the old **`averageForCell(assessments, …)`** path once the server owned aggregates — keeping both would be **deprecated dual logic** and a bug magnet (“why does CSV disagree with the grid?”).

### 4. Scope vs the written assignment

The assignment said **no auth, no tests, no extra features**. The repo **intentionally exceeds** that:

| Brief | What we did | Why (defensible in interview) |
|--------|----------------|-------------------------------|
| No auth | Optional **`REQUIRE_AUTH`** + JSON login + session cookies | Shows how I’d **layer** auth without breaking local dev defaults |
| No tests | **pytest**, **Vitest**, **Playwright** in CI | Proves behaviour and protects refactors when the schema grew |
| Minimal | Filters, edit, undo, import, Docker, codegen, Render blueprint | “Mini” is the **conversation starter**; extras are **labeled** as beyond minimum in README |

**Honest line for interview:** the **core brief is satisfied**; the rest is “if this were a real sprint” — not confusion about requirements.

### 5. Pluvo / LMS metaphor (product, not integration)

I used public Pluvo pages as **tone** for skill gaps and compliance-style dashboards (teal/mint, clear hierarchy). This app is **not** a Pluvo product or integration — footer and README say so. I **rejected** a generic purple “AI SaaS” look after actually looking at their site.

### 6. Reviewer ergonomics

- **CORS** limited to known dev origins; **`credentials: 'include'`** when sessions matter.
- **`ALLOWED_HOSTS` / README** warn against using `http://0.0.0.0:8000/` in the browser (`DisallowedHost`).
- **Seed command** (`seed_demo`) so the matrix isn’t empty on first open — that was “more time” in an earlier version of this log; it **exists now**.

---

## Where AI helped (concretely)

- **Boilerplate:** Dockerfiles, compose healthchecks, `render.yaml` skeleton, CI job wiring, Playwright smoke scaffold.
- **Breadth:** Large `App.tsx` refactors (filters, modals, undo timer), CSS for dark mode / modals / snackbars.
- **Tooling:** GraphQL Codegen config and generated types layout (I kept **schema** as source of truth in `backend/schema.graphql` and made Docker build copy it for frontend codegen).

## Where I deviated from or corrected AI output

- **Graphene auth:** No schema-level middleware; **Django middleware** for 401 on GraphQL when required.
- **Bulk import input types:** Graphene is picky about `NonNull(InputObjectType)` mounting — fixed to named **`BulkImportRowInput`** instead of inline broken patterns.
- **Theme / `matchMedia`:** Tests run in jsdom without `matchMedia`; added **guards** so Vitest doesn’t crash.
- **Dual average logic:** Removed client-only **`averageForCell`** once **`matrixCells`** existed.

---

## If I had more time (updated)

- **Stricter auth story:** CSRF on login in production, same-site cookies documented per environment, maybe API tokens for SPA-only deploys.
- **Schema governance:** CI check that `schema.graphql` matches `manage.py graphql_schema` output to stop drift.
- **Product:** trend per cell, role-based columns, or “last score vs average” without overloading the mini UI.

---

## Summary one-liner for interview

**I used AI to implement faster and to explore options; I owned schema evolution (history model, split read path, soft delete), pushed back on outdated Graphene patterns, and kept the original assignment working while treating “extras” as an explicit second layer, not scope confusion.**
