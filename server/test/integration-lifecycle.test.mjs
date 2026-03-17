import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { applyMiddleware } from "../src/middleware/index.mjs";
import eventsRouter from "../src/routes/events.mjs";
import healthRouter from "../src/routes/health.mjs";
import invitationsRouter from "../src/routes/invitations.mjs";
import rsvpsRouter from "../src/routes/rsvps.mjs";
import usersRouter from "../src/routes/users.mjs";

const hasDatabase = Boolean(process.env.DATABASE_URL);

function buildApp() {
  const app = express();
  applyMiddleware(app);

  app.use("/api/events", eventsRouter);
  app.use("/api/events/:eventId/invitations", invitationsRouter);
  app.use("/api/events/:eventId/rsvps", rsvpsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/health", healthRouter);

  return app;
}

test("event/invitation/rsvp lifecycle with ownership and authorization", { skip: !hasDatabase }, async () => {
  const app = buildApp();
  const unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const ownerEmail = `owner_${unique}@example.com`;
  const guestEmail = `guest_${unique}@example.com`;
  const strangerEmail = `stranger_${unique}@example.com`;
  const password = "Password123!";
  const now = new Date().toISOString();

  const createOwner = await request(app)
    .post("/api/users")
    .send({
      email: ownerEmail,
      password,
      displayName: "Owner",
      tosConsentAt: now,
      privacyConsentAt: now,
    });

  assert.equal(createOwner.status, 201);
  const ownerId = createOwner.body.id;
  assert.ok(ownerId);

  const createGuest = await request(app)
    .post("/api/users")
    .send({
      email: guestEmail,
      password,
      displayName: "Guest",
      tosConsentAt: now,
      privacyConsentAt: now,
    });

  assert.equal(createGuest.status, 201);
  const guestId = createGuest.body.id;
  assert.ok(guestId);

  const createStranger = await request(app)
    .post("/api/users")
    .send({
      email: strangerEmail,
      password,
      displayName: "Stranger",
      tosConsentAt: now,
      privacyConsentAt: now,
    });

  assert.equal(createStranger.status, 201);
  const strangerId = createStranger.body.id;
  assert.ok(strangerId);

  const createEvent = await request(app)
    .post("/api/events")
    .set("x-user-id", ownerId)
    .send({
      title: "Integration Test Event",
      startsAt: new Date(Date.now() + 3600_000).toISOString(),
      endsAt: new Date(Date.now() + 7200_000).toISOString(),
      location: "Room A",
      notes: "Initial",
    });

  assert.equal(createEvent.status, 201);
  const eventId = createEvent.body.id;
  assert.ok(eventId);

  const updateEvent = await request(app)
    .put(`/api/events/${eventId}`)
    .set("x-user-id", ownerId)
    .send({
      title: "Integration Test Event Updated",
      startsAt: new Date(Date.now() + 3600_000).toISOString(),
      endsAt: new Date(Date.now() + 10800_000).toISOString(),
      location: "Room B",
      notes: "Updated",
    });

  assert.equal(updateEvent.status, 200);

  const ownerEvents = await request(app).get(`/api/events?ownerId=${encodeURIComponent(ownerId)}`);
  assert.equal(ownerEvents.status, 200);
  assert.ok(Array.isArray(ownerEvents.body.items));
  assert.ok(ownerEvents.body.items.some((item) => item.id === eventId));

  const guestCreateInvitation = await request(app)
    .post(`/api/events/${eventId}/invitations`)
    .set("x-user-id", guestId)
    .send({ email: guestEmail });

  assert.equal(guestCreateInvitation.status, 403);

  const createInvitation = await request(app)
    .post(`/api/events/${eventId}/invitations`)
    .set("x-user-id", ownerId)
    .send({ email: guestEmail });

  assert.equal(createInvitation.status, 201);

  const ownerInvitationList = await request(app)
    .get(`/api/events/${eventId}/invitations`)
    .set("x-user-id", ownerId);

  assert.equal(ownerInvitationList.status, 200);
  assert.ok(Array.isArray(ownerInvitationList.body.items));
  assert.ok(ownerInvitationList.body.items.some((item) => item.email === guestEmail));

  const guestInvitationList = await request(app)
    .get(`/api/events/${eventId}/invitations`)
    .set("x-user-id", guestId);

  assert.equal(guestInvitationList.status, 403);

  const guestRsvpOverview = await request(app)
    .get(`/api/events/${eventId}/rsvps`)
    .set("x-user-id", guestId);

  assert.equal(guestRsvpOverview.status, 403);

  const guestRsvp = await request(app)
    .post(`/api/events/${eventId}/rsvps`)
    .set("x-user-id", guestId)
    .send({ status: "yes", note: "I will attend" });

  assert.equal(guestRsvp.status, 200);

  const impersonatedRsvp = await request(app)
    .post(`/api/events/${eventId}/rsvps/${guestId}`)
    .set("x-user-id", ownerId)
    .send({ status: "maybe" });

  assert.equal(impersonatedRsvp.status, 403);

  const strangerRsvp = await request(app)
    .post(`/api/events/${eventId}/rsvps`)
    .set("x-user-id", strangerId)
    .send({ status: "yes" });

  assert.equal(strangerRsvp.status, 403);

  const ownerRsvpOverview = await request(app)
    .get(`/api/events/${eventId}/rsvps`)
    .set("x-user-id", ownerId);

  assert.equal(ownerRsvpOverview.status, 200);
  assert.ok(Array.isArray(ownerRsvpOverview.body.items));
  assert.ok(ownerRsvpOverview.body.items.some((item) => item.userId === guestId && item.status === "yes"));

  const deleteEvent = await request(app)
    .delete(`/api/events/${eventId}`)
    .set("x-user-id", ownerId);

  assert.equal(deleteEvent.status, 200);

  const deletedEvent = await request(app).get(`/api/events/${eventId}`);
  assert.equal(deletedEvent.status, 404);
});
