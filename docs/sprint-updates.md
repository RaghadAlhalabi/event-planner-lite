# Event Planner Lite - Sprint Updates

## Sprint Update A - Security and Ownership (Latest)
Date: 2026-03-15

### Completed
- Added password-based login flow and aligned client/server validation and messages.
- Enforced event ownership rules so only owners can modify protected event actions.
- Fixed account deletion behavior and related user validation edge cases.
- Added a root API route response to replace the default Cannot GET / message.

### QA Focus
- Login error cases (wrong password, missing fields, invalid payload).
- Authorization checks for event operations by non-owners.
- User deletion flow and data consistency after deletion.

### Outcome
- Stronger security posture and cleaner API behavior for production deployment.

---

## Sprint Update B - Middleware and API Testing
Date: 2026-03-15

### Completed
- Refactored middleware placement and renamed validator modules for consistency.
- Added and updated a complete Postman collection for endpoint testing.
- Updated deployment URLs and API usage notes in the README.

### QA Focus
- Validate all CRUD and validation paths via Postman collection.
- Verify middleware execution order and response format consistency.

### Outcome
- Faster onboarding and more reliable API verification workflow.

---

## Sprint Update C - Final Product Polish
Date: 2026-03-15

### Completed
- Finalized events and invitations features across server and client.
- Completed i18n messaging improvements and PWA essentials.
- Improved accessibility and input validation coverage.

### QA Focus
- End-to-end event lifecycle with invitation and RSVP scenarios.
- Accessibility checks for labels, focus flow, and semantic structure.
- Offline/PWA checks for manifest and service worker behavior.

### Outcome
- Release-ready feature set with improved usability and stability.

---

## Short Version for GitHub Project Status
Use these if you want compact status posts:

1) Security sprint completed: password login, event ownership enforcement, account deletion fix, and root API response improvement are done and ready for QA.

2) API quality sprint completed: middleware/validator refactor, Postman collection, and README deployment updates are finished. Team can now test endpoints faster and with better consistency.

3) Final polish sprint completed: events and invitations are finalized, plus i18n, PWA, accessibility, and validation improvements. Product is in strong release shape pending final regression checks.
