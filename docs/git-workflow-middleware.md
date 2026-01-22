# Git + project management workflow (middleware assignment)

This document shows a clean workflow for delivering the middleware with good practice:
- feature branch
- small, meaningful commits
- PR back to `main`
- tasks/cards on your GitHub Project board

## 1) Create tasks in the GitHub Project board
Use the checklist in `docs/middleware-request-validation-tasks.md`.

Recommended cards (copy/paste titles):
- Middleware need + design doc
- Add validation middleware (validateRequest)
- Add /api/events route using middleware
- Add tests for middleware
- Update README/docs and link

## 2) Create a feature branch
From the repo root:

```powershell
git checkout -b feature/request-validation-middleware
```

## 3) Commit in small steps (atomic commits)
Your working tree currently includes docs + middleware + route + tests + dependencies.
Here’s a good commit sequence.

### Commit A: Documentation of need
```gitbash
git add README.md docs/middleware-request-validation.md docs/middleware-request-validation-tasks.md
git commit -m "docs: describe request validation middleware"
```

### Commit B: Middleware implementation
```gitbash
git add server/src/middleware/validateRequest.mjs
git commit -m "feat: add validateRequest middleware"
```

### Commit C: Route integration (uses the middleware)
```gitbash
git add server/src/routes/events.mjs server/src/app.mjs
git commit -m "feat: add events route using request validation"
```

### Commit D: Tests + test tooling
```gitbash
git add server/test/validateRequest.test.mjs server/package.json server/package-lock.json
git commit -m "test: add validateRequest request tests"
```

## 4) Push and open a PR
```gitbash
git push -u origin feature/request-validation-middleware
```

Then open a PR on GitHub:
- base: `main`
- compare: `feature/request-validation-middleware`

In the PR description:
- link the GitHub Project card(s)
- include quick manual test commands

## 5) Manual verification commands
If gitbash blocks `npm` scripts on your machine, use `npm.cmd`.

```gitbash
cd server
npm.cmd test
npm.cmd run dev
```

Example request:
```gitbash
curl -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d "{}"
```

## 6) Merge
After review, squash merge or merge commit are both fine.
If your course prefers clean history, use squash merge.
