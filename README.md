# Event Planner Lite

## Overview
Event Planner Lite is a full-stack Progressive Web Application (PWA) where users can create, edit, and share events. Users can invite other registered users and collect RSVPs (Yes/No/Maybe). The app supports offline usage through service workers and syncs changes when the connection returns.

## Requirements Coverage
- Client: Web frontend (PWA)
- Server: Node.js + Express REST-ish API
- User accounts: Register/Login (JWT)
- Persistent cloud storage: PostgreSQL
- Offline functionality: Cached shell + offline data + queued writes
- REST-ish API: CRUD for events + sharing + RSVP

## Feature Map

## Authentication
- Register
- Login
- Logout
- Protected routes

## Events (CRUD)
- Create event
- List my events
- View event
- Edit event
- Delete event

## Sharing + RSVP
- Invite user to event
- View events shared with me
- RSVP: Yes / No / Maybe
- Host can view RSVP list

## PWA + Offline
- Installable app (manifest)
- Service worker caches app shell
- Offline view of previously loaded events
- Offline queue + sync when online


## Plan / Work Items
See: `docs/plan.md`

## Repo Structure
- `/client` Frontend PWA
- `/server` Backend API (Node/Express)
- `/docs` Documentation (feature map, plan, API spec)
