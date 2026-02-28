import {
  ensurePlainObject,
  hasOnlyKeys,
  optionalDateTime,
  optionalString,
  requireDateTime,
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

export function validateCreateEventBody(body) {
  const errors = [];

  if (ensurePlainObject(body, errors)) {
    hasOnlyKeys(body, ["title", "startsAt", "endsAt", "location", "notes"], errors);
    requireString(body, "title", errors, { min: 1 });
    requireDateTime(body, "startsAt", errors);
    optionalDateTime(body, "endsAt", errors);
    optionalString(body, "location", errors, { min: 1 });
    optionalString(body, "notes", errors);
  }

  return { value: body, errors };
}
