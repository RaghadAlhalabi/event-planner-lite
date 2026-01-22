# Tasks: request validation middleware

This checklist is used for the middleware assignment. It also matches the cards on the GitHub Project board.

## 1) Decide + design
- [x] Pick validation library (Zod)
- [x] Decide a standard error response shape
- [x] Pick a route to prove it works (`POST /api/events`)

## 2) Implement middleware
- [x] Create `validateRequest({ body, query, params })`
- [x] Validate + parse request data (replace `req.body`/`req.query`/`req.params`)
- [x] Return `400` for validation errors (not `500`)

## 3) Integrate
- [x] Add a route that uses the middleware (`server/src/routes/events.mjs`)
- [x] Mount the router in `server/src/app.mjs` (`/api/events`)

## 4) Test
- [x] Use Node's test runner (`node --test`)
- [x] Add request tests with `supertest` (invalid body => 400, valid body => handler runs)

## 5) Document
- [x] Write the middleware doc with example usage + error response
- [x] Link docs from README
- [x] Keep Git workflow steps documented

## Done means
- Middleware is used by at least one route in the running server
- Invalid requests return `400` with field-level details
- Tests cover invalid + valid requests
