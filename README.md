# Event Planner Lite

## Project Overview
Event Planner Lite is a full-stack web app for planning events, inviting attendees, and collecting RSVPs.

**Main features**
- Create events, invite users, and collect RSVPs.
- Simple user accounts API.
- PWA client with offline-ready shell.

**Tech stack**
- Client: Vite + vanilla JS.
- Server: Node.js + Express.
- Database: PostgreSQL.

**Live services**
- Frontend (Render Static Site): https://event-planner-lite-1.onrender.com
- Backend API (Render Web Service): https://event-planner-lite.onrender.com

## Localization (i18n/l10n)
- Supported locales: `en` (English), `nb` (Norwegian Bokmal).
- Server locale detection: `Accept-Language` with fallback to `en`.
- Client locale behavior:
	- default from browser language.
	- manual language override from UI selector.
	- selected locale persisted in local storage.
- Localized content includes:
	- UI labels and status messages.
	- API error messages returned from server.
	- formatted date/time and relative time using `Intl`.

## PWA and Offline Behavior
- Manifest includes id, scope, start URL, standalone display, and icons (192/512).
- Service worker strategies:
	- cache-first for app shell/static assets.
	- network-first for API GET responses with cache fallback.
	- stale-while-revalidate for images.
- Offline UX:
	- dedicated offline page fallback (`client/public/offline.html`).
	- online/offline status indicator in UI.
	- cached-profile freshness message with last-updated timestamp.

## Invitation Email Delivery
- Invitation records are stored in PostgreSQL and can also be delivered as real emails via SMTP when enabled.
- Required server environment variables:
	- `EMAIL_ENABLED=true`
	- `EMAIL_PROVIDER` (`smtp` by default, or `resend`)
	- `SMTP_HOST`
	- `SMTP_PORT`
	- `SMTP_SECURE` (`true` for SSL, often `false` for STARTTLS on port 587)
	- `SMTP_USER`
	- `SMTP_PASS`
	- `SMTP_FROM`
	- `APP_BASE_URL` (used for invitation links in email body)
- Optional (recommended fallback if Gmail SMTP fails):
	- `EMAIL_PROVIDER=resend`
	- `RESEND_API_KEY`
	- `RESEND_FROM`
- If SMTP is not configured or disabled, invitations are created with `pending` status but no email is sent.
- Invitation create response includes `emailDelivery.provider` and `emailDelivery.detail` for troubleshooting delivery errors.
- SMTP test endpoint (protected):
	- `POST /api/health/email-test`
	- Header: `x-email-test-token: <EMAIL_TEST_TOKEN>`
	- Body: `{ "to": "your-email@example.com" }`
	- Returns `status: ok` when SMTP send succeeds.

## Service Worker Update UX
- App detects waiting service worker and prompts user to refresh.
- On acceptance, app sends `SKIP_WAITING` and reloads once on controller change.
- This prevents users being stuck on old cached versions.

## Accessibility Checklist (Manual + Automated)
- Semantic headings and labels for form controls.
- Keyboard-visible focus styles (`:focus-visible`).
- Live regions for status updates and validation summary.
- Error summary with focus directed to first invalid field.
- Lighthouse accessibility score captured in project reports.

## Lighthouse Evidence
- Latest consolidated report file: `client/lighthouse-full.json`.
- Current categories in that report:
	- Performance: 100
	- Accessibility: 100
	- Best Practices: 100
	- SEO: 100

## Bonus and Advanced Notes
- Advanced features that can be added next:
	- queued offline writes with replay on reconnect.
	- background sync (when supported).
	- push notifications for invitations/RSVP reminders.
	- richer service worker debugging guide and release workflow.

**Run locally**
- Client: `cd client` then `npm run dev`
- Server: `cd server` then `npm run dev`

## Architecture Summary
- Backend uses Express routes with request validation middleware and PostgreSQL data access.
- Frontend is a Vite vanilla-JS app centered around `client/src/main.js` with localized UI text from `client/src/i18n/messages.js`.
- PWA behavior is implemented via `client/public/sw.js` plus manifest/offline fallback assets.

## Naming and Structure Conventions
- Global middleware composition is centralized in `server/src/middleware/index.mjs`.
- Route-level middleware lives in `server/src/middleware/` (for example `validateRequest.mjs`, `locale.mjs`).
- Validators use singular descriptive filenames in `server/src/validators/`:
	- `userValidator.mjs`
	- `eventValidator.mjs`
	- `invitationValidator.mjs`
	- `rsvpValidator.mjs`
- Shared validator helpers are in `server/src/validators/validationUtils.mjs`.

## Scope At A Glance
- Client PWA with cached shell and offline fallback page.
- Node.js/Express server with REST-ish endpoints.
- PostgreSQL storage for users, events, invitations, and RSVPs.
- No JWT auth layer in the current implementation.

## Implemented Flows
- User account flow in UI: create profile, refresh profile, and delete profile.
- Event management in UI: list, create, edit, delete, and refresh events.
- Collaboration in UI (per event):
	- send/list invitations.
	- save/list RSVPs (yes/no/maybe + optional note).
- Matching backend endpoints are implemented for `/users`, `/events`, `/events/:eventId/invitations`, and `/events/:eventId/rsvps`.

## Requirements Coverage
- Client, Server, User accounts, PostgreSQL, REST-ish API, PWA, Offline functionality.
- Tooling: local repo linked to GitHub, documented plan, working scaffold.

## Feature Map

Full feature breakdown: [docs/feature-map.md](docs/feature-map.md)

## Middleware (assignment)
- Request validation need + design: [docs/middleware-request-validation.md](docs/middleware-request-validation.md)
- Git + project workflow steps: [docs/git-workflow-middleware.md](docs/git-workflow-middleware.md)

## API (assignment)
- API design doc: [docs/api-design.md](docs/api-design.md)
- Postman collection: [postman/event-planner-lite.postman_collection.json](postman/event-planner-lite.postman_collection.json)

## Project Plan
- Columns: Todo → In Progress → Testing → Done
- Priority field: High / Medium / Low
- Milestones: Core Platform, Collaboration Features, Launch & QA
- High-level tasks span backend foundation, event features, PWA shell, offline sync, and release polish
Live board: https://github.com/users/RaghadAlhalabi/projects/1

## Repository Structure
- `/client` – Frontend PWA scaffold
- `/server` – Node.js API (ESM via `.mjs`)
- `/docs` – Supporting documentation
Note: In this repo, the backend is the `/server` directory (Node.js/Express API) and the frontend is the `/client` directory (Vite-based PWA client).

## Docs
- API design: [docs/api-design.md](docs/api-design.md)
- Feature map: [docs/feature-map.md](docs/feature-map.md)
- Middleware design: [docs/middleware-request-validation.md](docs/middleware-request-validation.md)
- Middleware tasks: [docs/middleware-request-validation-tasks.md](docs/middleware-request-validation-tasks.md)
- Git workflow: [docs/git-workflow-middleware.md](docs/git-workflow-middleware.md)
- Privacy policy: [docs/privacy-policy.md](docs/privacy-policy.md)
- Terms of service: [docs/terms-of-service.md](docs/terms-of-service.md)






