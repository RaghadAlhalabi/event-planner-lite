# Event Planner Lite

## Overview
Event Planner Lite is a full-stack Progressive Web Application (PWA) that allows users to create, edit, and share events. Users can invite other registered users and collect RSVPs (Yes / No / Maybe). The application supports offline usage through PWA technologies and synchronizes changes when the network connection is restored.

---

## Requirements Coverage
- **Client:** Web frontend implemented as a PWA
- **Server:** Node.js with Express (REST-ish API)
- **User accounts:** Register / Login using JWT authentication
- **Persistent cloud storage:** PostgreSQL (hosted on Neon)
- **REST-ish API:** CRUD operations for events, sharing, and RSVPs
- **Offline functionality:** Cached application shell, offline data access, and queued writes
- **PWA:** Installable app with service workers

---

## Feature Map

### Client (PWA)
- Installable application (Web App Manifest)
- Cached application shell via service workers
- Offline access to previously viewed events
- Queue user actions while offline and sync when online

### User Accounts
- Register
- Login
- Logout
- Protected routes using JWT

### Events (CRUD)
- Create event
- List my events
- View event details
- Edit event
- Delete event

### Sharing & RSVP
- Invite users to events
- View events shared with me
- RSVP: Yes / No / Maybe
- Event host can view RSVP list

---

## Project Plan

### Project management tool
- GitHub Projects (Backlog → In Progress → Done)

### Planned work items
1. Server scaffold and health endpoints ✅
2. Cloud PostgreSQL connection (Neon) ✅
3. Database schema and migrations
4. Authentication (register / login / JWT)
5. Event CRUD API
6. Sharing and invitations API
7. RSVP API
8. Client scaffold (PWA)
9. Client UI and API integration
10. Offline caching and offline queue with sync
11. Testing, polish, and deployment

---

## Repository Structure
- `/client` – Frontend PWA
- `/server` – Backend API (Node.js + Express)
- `/docs` – Project documentation (optional; core documentation is in this README)

---

## Project Management

Project planning and task tracking are handled using a GitHub Project board:
https://github.com/users/RaghadAlhalabi/projects/1

