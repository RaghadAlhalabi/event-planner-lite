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

👉 [User Guide](./docs/user_guide.md)

**Live services**
- Frontend (Render Static Site): https://event-planner-lite-1.onrender.com
- Backend API (Render Web Service): https://event-planner-lite.onrender.com

## Localization (i18n/l10n)
- Supported locales: `en` (English), `nb` (Norwegian Bokmal).
- Locale is detected from `Accept-Language` with fallback to `en`.
- Users can switch language in the UI, and the choice is saved in local storage.
- Localized content includes UI labels, status messages, API errors, and date/time formatting.

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
- Email delivery first used Gmail SMTP, but deployment-time failures and timeouts made it unreliable.
- The project now uses Resend with a verified sender domain for stable production delivery.
- Invitation delivery and deep-link flow are working in production.
- Test endpoint: `POST /api/health/email-test` with header `x-email-test-token`.

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
- Latest consolidated report: `client/lighthouse-full.json` (Performance/Accessibility/Best Practices/SEO: 100).


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
- Client + server implementation with user accounts, PostgreSQL, REST-ish API, and PWA/offline support.
- Tooling includes GitHub repo, documentation, and project planning board.

## Feature Map

Full feature breakdown: [docs/feature-map.md](docs/feature-map.md)

## Middleware (assignment)
- Request validation need + design: [docs/middleware-request-validation.md](docs/middleware-request-validation.md)

## API (assignment)
- API design doc: [docs/api-design.md](docs/api-design.md)
- Postman collection: [postman/event-planner-lite.postman_collection.json](postman/event-planner-lite.postman_collection.json)

## Project Plan
- Columns: Todo → In Progress → Testing → Done
- Priority field: High / Medium / Low
- Milestones: Core Platform, Collaboration Features, Launch & QA
- High-level tasks span backend foundation, event features, PWA shell, offline sync, and release polish

Kanban board view: https://github.com/users/RaghadAlhalabi/projects/1/views/1

## Repository Structure
- `/client` – Frontend PWA scaffold
- `/server` – Node.js API (ESM via `.mjs`)
- `/docs` – Supporting documentation
Note: In this repo, the backend is the `/server` directory (Node.js/Express API) and the frontend is the `/client` directory (Vite-based PWA client).

## 📘 Documentation

For detailed instructions on how to use the application, please refer to the User Guide:
