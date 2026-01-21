# Event Planner Lite – Feature Map

## Core Platform (High Priority)
- **User Accounts**
  - Sign up, log in, log out with JWT
  - Profile basics (name, optional avatar placeholder)
- **Event Workspace**
  - Dashboard with owned and shared events
  - Event detail view (agenda, location, notes)
  - Create, update, duplicate, delete events
  - Consistent time zone handling
- **Database & API**
  - PostgreSQL schema for users, events, invitations, RSVPs
  - REST-ish endpoints under `/api/*`
  - Validation with helpful error responses
  - API and DB health checks

## Collaboration Features (Medium Priority)
- **Invitations**
  - Invite users by email or username
  - Track pending, accepted, declined status
- **RSVP Management**
  - Guests respond Yes / No / Maybe
  - Host sees RSVP totals and notes
- **Shared Views**
  - Filter events shared with me vs owned
  - Calendar or list view of upcoming events

## Offline & PWA (Medium Priority)
- **PWA Shell**
  - Installable manifest, icons, and theme colors
  - Service worker caches static assets
- **Offline Access**
  - Read recent events while offline
  - Show friendly offline messages
- **Queued Actions**
  - Store updates while offline
  - Sync changes automatically when back online

## Quality & Operations (Low Priority)
- **Testing & Tooling**
  - API collection for manual testing
  - Unit/integration test harness
  - Linting and formatting setup
- **Deployment**
  - Database migration scripts for Neon
  - Environment config checklist
  - Basic logging and error handling

