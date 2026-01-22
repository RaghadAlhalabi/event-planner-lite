# Middleware: Request Validation (Express)

## The need / problem it solves
Event Planner Lite will accept many kinds of user input:

- Sign up / log in data
- Creating and updating events (title, date/time, location, notes)
- Invitations (email/username)
- RSVPs (Yes/No/Maybe + optional note)
- Offline queued actions that are replayed later

Without a shared validation layer, each route/controller ends up doing its own checks (or worse: trusting input). That creates several problems:

- **Inconsistent errors**: one endpoint returns `400`, another returns `500`, another returns a different JSON shape. This is annoying for the PWA client (especially offline sync) because it needs predictable error handling.
- **Duplicated code**: every controller re-implements “is this field present?” and “is this a valid date?”
- **Harder security and robustness**: unexpected types (e.g., `date: {}` or `title: []`) can lead to bugs, crashes, or bad DB writes.
- **Messy controllers**: business logic gets mixed with validation details.

## Why middleware is the right solution
Validation is a **cross-cutting concern**: it applies to many endpoints in the same way and must happen *before* the controller logic runs.

An Express middleware can:

- Validate `req.body`, `req.query`, and/or `req.params` *once, consistently*
- Stop invalid requests early with a clear `400` response
- Keep controllers focused on business logic

## What the middleware will do
Create a reusable middleware factory:

- `validateRequest({ body, query, params })`
- Uses schemas to validate input
- On success: optionally replaces `req.body/req.query/req.params` with the validated/sanitized values
- On failure: responds with `400` and a predictable error format (no server crash)

## Where it lives in this repo
- Middleware: `server/src/middleware/validateRequest.mjs`
- Example route using it: `server/src/routes/events.mjs` (mounted at `/api/events`)

## Error response format
If validation fails, the middleware responds with HTTP `400`:

```json
{
	"error": "ValidationError",
	"message": "Invalid request",
	"details": [
		{ "path": "title", "message": "Required", "code": "invalid_type" }
	]
}
```

`details[].path` uses dot notation (example: `user.email`).

## Example usage
In a route:

```js
router.post(
	"/",
	validateRequest({ body: createEventBodySchema }),
	(req, res) => res.status(201).json({ event: req.body })
);
```

## Success criteria
- A new middleware exists under `server/src/middleware/`
- At least one API route actively uses the middleware
- Invalid requests return `400` with helpful validation details
- Valid requests reach the handler with validated data
