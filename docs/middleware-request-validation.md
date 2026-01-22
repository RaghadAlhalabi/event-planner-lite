# Request validation middleware (Express)

## Why this is needed
This API accepts a lot of user input (events, invitations, RSVP, and later also offline-sync actions). If validation is done inside every route, the same checks get repeated and error responses become inconsistent.

This middleware solves that by validating the request *before* the handler runs.

Goals:
- Same error response format every time
- No duplicated “is this missing / wrong type?” checks inside controllers
- Routes stay clean (business logic only)

## What it does (in this repo)
This repo includes a small middleware factory:

`validateRequest({ body, query, params })`

It uses Zod schemas to validate:
- `req.body`
- `req.query`
- `req.params`

If everything is valid, it replaces `req.body`/`req.query`/`req.params` with the parsed values and calls `next()`.

If validation fails, it returns `400` with a consistent JSON shape.

## Files / where it is used
- Middleware: `server/src/middleware/validateRequest.mjs`
- Used in: `server/src/routes/events.mjs`
- Mounted in: `server/src/app.mjs` at `/api/events`

## Error response format
Example for an invalid request:

```json
{
  "error": "ValidationError",
  "message": "Invalid request",
  "details": [
    { "path": "title", "message": "Required", "code": "invalid_type" }
  ]
}
```

Notes:
- `details[].path` uses dot notation (example: `user.email`).

## Example usage

```js
router.post(
  "/",
  validateRequest({ body: createEventBodySchema }),
  (req, res) => res.status(201).json({ event: req.body })
);
```

## Quick manual test
Start server and send a bad request:

```bash
cd server
npm run dev
curl -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d "{}"
```

You should get `400` + validation details.
