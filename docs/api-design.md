# API Design (Event Planner Lite)

Goal: scaffold a REST-ish API specific to Event Planner Lite (no user/auth endpoints). This document defines the planned endpoints, request shapes, and response shapes so the server can be scaffolded and tested.

Base URL: `/api`

## Events

### List events
- **GET** `/events`
- **Query (optional)**: `ownerId`, `from`, `to`
- **200 Response**
```json
{
  "items": [
    {
      "id": "evt_123",
      "title": "Project kickoff",
      "startsAt": "2026-01-26T10:00:00Z",
      "endsAt": "2026-01-26T11:00:00Z",
      "location": "Room B",
      "notes": "Bring slides"
    }
  ]
}
```

### Create event
- **POST** `/events`
- **Body**
```json
{
  "title": "Project kickoff",
  "startsAt": "2026-01-26T10:00:00Z",
  "endsAt": "2026-01-26T11:00:00Z",
  "location": "Room B",
  "notes": "Bring slides"
}
```
- **201 Response**
```json
{ "id": "evt_123" }
```

### Get event
- **GET** `/events/:eventId`
- **200 Response**
```json
{
  "id": "evt_123",
  "title": "Project kickoff",
  "startsAt": "2026-01-26T10:00:00Z",
  "endsAt": "2026-01-26T11:00:00Z",
  "location": "Room B",
  "notes": "Bring slides"
}
```

### Update event
- **PUT** `/events/:eventId`
- **Body** (same shape as create)
- **200 Response**
```json
{ "status": "updated" }
```

### Delete event
- **DELETE** `/events/:eventId`
- **200 Response**
```json
{ "status": "deleted" }
```

## Invitations

### List invitations for an event
- **GET** `/events/:eventId/invitations`
- **200 Response**
```json
{
  "items": [
    {
      "id": "inv_123",
      "email": "guest@example.com",
      "status": "pending"
    }
  ]
}
```

### Create invitation
- **POST** `/events/:eventId/invitations`
- **Body**
```json
{ "email": "guest@example.com" }
```
- **201 Response**
```json
{ "id": "inv_123" }
```

## RSVPs

### List RSVPs for an event
- **GET** `/events/:eventId/rsvps`
- **200 Response**
```json
{
  "items": [
    {
      "id": "rsvp_123",
      "userId": "usr_123",
      "status": "yes",
      "note": "See there"
    }
  ]
}
```

### Create/update RSVP
- **POST** `/events/:eventId/rsvps/:userId`
- **Body**
```json
{ "status": "yes", "note": "See there" }
```
- **200 Response**
```json
{ "status": "saved" }
```

## Error format (planned)
- **400** for validation errors
- **404** for missing items

```json
{
  "error": "ValidationError",
  "message": "Invalid request",
  "details": [
    { "path": "title", "message": "Required", "code": "invalid_type" }
  ]
}
```
