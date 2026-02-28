import {
  ensurePlainObject,
  hasOnlyKeys,
  requireEmail,
  requireString,
} from "./validationUtils.mjs";

export function validateEventParams(params) {
  const errors = [];

  if (ensurePlainObject(params, errors)) {
    hasOnlyKeys(params, ["eventId"], errors);
    requireString(params, "eventId", errors, { min: 1 });
  }

  return { value: params, errors };
}

export function validateCreateInvitationBody(body) {
  const errors = [];

  if (ensurePlainObject(body, errors)) {
    hasOnlyKeys(body, ["email"], errors);
    requireEmail(body, "email", errors);
  }

  return { value: body, errors };
}
