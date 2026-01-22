# Git workflow notes (middleware assignment)

This is the git flow for the middleware assignment. The goal is a readable history: feature branch, small commits, PR, merge.

## Project board
Cards can be created in the GitHub Project board based on the checklist in `docs/middleware-request-validation-tasks.md`.

## Branch
From repo root:

```bash
git checkout -b feature/request-validation-middleware
```

## Commit style
Keep commits small and focused (one idea per commit).

### Commit 1: middleware
```bash
git add server/src/middleware/validateRequest.mjs
git commit -m "feat: add validateRequest middleware"
```

### Commit 2: route integration
```bash
git add server/src/routes/events.mjs server/src/app.mjs
git commit -m "feat: add events route using request validation"
```

### Commit 3: tests + dependencies
```bash
git add server/test/ server/package.json server/package-lock.json
git commit -m "test: add validateRequest request tests"
```

## Tests
Run from `server/`:

```bash
cd server
npm test
```

If PowerShell blocks `npm` (execution policy), Git Bash works fine, or you can use `npm.cmd` in PowerShell.

## Push + PR
```bash
git push -u origin feature/request-validation-middleware
```

Then open a PR to `main` and merge it.

## Quick manual check
```bash
cd server
npm run dev
curl -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d "{}"
```

Expected: `400` with a JSON validation error.


