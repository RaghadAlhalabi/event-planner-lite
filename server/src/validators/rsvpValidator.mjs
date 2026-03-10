import {
  ensurePlainObject,
  hasOnlyKeys,
  optionalString,
  requireEnum,
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

export function validateEventUserParams(params) {
  const errors = [];

  if (ensurePlainObject(params, errors)) {
    hasOnlyKeys(params, ["eventId", "userId"], errors);
    requireString(params, "eventId", errors, { min: 1 });
    requireString(params, "userId", errors, { min: 1 });
  }

  return { value: params, errors };
}

export function validateRsvpBody(body) {
  const errors = [];

  if (ensurePlainObject(body, errors)) {
    hasOnlyKeys(body, ["status", "note"], errors);
    requireEnum(body, "status", ["yes", "no", "maybe"], errors);
    optionalString(body, "note", errors);
  }

  return { value: body, errors };
}
