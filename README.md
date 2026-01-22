# Event Planner Lite

## Overview
Event Planner Lite is a full-stack PWA for planning events, inviting attendees, and collecting RSVPs with offline support.

## Scope At A Glance
- Client PWA with cached shell and queued offline actions
- Node.js/Express server with REST-ish endpoints
- PostgreSQL storage for users, events, invitations, and RSVPs
- JWT-based authentication and protected routes

## Requirements Coverage
- Client, Server, User accounts, PostgreSQL, REST-ish API, PWA, Offline functionality
- Tooling: local repo linked to GitHub, documented plan, working scaffold

## Feature Map

Full feature breakdown: [docs/feature-map.md](docs/feature-map.md)

## Middleware (assignment)
- Request validation need + design: [docs/middleware-request-validation.md](docs/middleware-request-validation.md)
- Git + project workflow steps: [docs/git-workflow-middleware.md](docs/git-workflow-middleware.md)

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

## Module Format
- Server files use `.mjs` to opt into ES Modules without switching the entire package configuration.




