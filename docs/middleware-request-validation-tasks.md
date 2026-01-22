# Tasks: Request validation middleware

Use this as the checklist to add cards/issues to the GitHub Project board.

## Analysis & design
- [ ] Decide validation library (recommended: `zod`)
- [ ] Define standard error response shape for invalid requests
- [ ] Pick at least one endpoint to demonstrate usage (e.g. `POST /api/events`)

## Implementation
- [ ] Create `validateRequest({ body, query, params })` middleware factory
- [ ] Support validating/sanitizing (replace `req.body`, etc. with parsed values)
- [ ] Ensure the middleware returns `400` for validation errors (not `500`)

## Integration
- [ ] Add an example router under `server/src/routes/` that uses the middleware
- [ ] Wire router into `server/src/app.mjs`

## Testing
- [ ] Set up `node --test` runner for the server
- [ ] Add request tests for invalid/valid payloads (recommended: `supertest`)

## Documentation
- [ ] Document middleware usage with a copy/paste snippet
- [ ] Document configuration and response format
- [ ] Link docs from the main README

## Definition of done
- Middleware is used by at least one route in the running server
- Invalid requests return `400` with field-level details
- Tests cover at least: missing required field, wrong type, and valid request
