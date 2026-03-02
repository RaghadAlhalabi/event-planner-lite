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

**Live service**
- https://event-planner-lite.onrender.com/

**Run locally**
- Client: `cd client` then `npm run dev`
- Server: `cd server` then `npm run dev`

## Architecture Summary
- Backend uses a layered API: routes → controllers → middleware → data/config.
- Frontend follows MVC-style separation: views (templates + web components), controllers (UI logic), and a single API fetch manager.
- Templates are embedded as HTML `<template>` elements in `index.html` and cloned at runtime to keep markup separate from logic.

## Scope At A Glance
- Client PWA with cached shell and queued offline actions.
- Node.js/Express server with REST-ish endpoints.
- PostgreSQL storage for users, events, invitations, and RSVPs.
- JWT-based authentication and protected routes.

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






