import {
  ensurePlainObject,
  hasOnlyKeys,
  optionalString,
  requireDateTime,
  requireEmail,
  requireString,
} from "./validationUtils.mjs";

export function validateUserIdParams(params) {
  const errors = [];

  if (ensurePlainObject(params, errors)) {
    hasOnlyKeys(params, ["userId"], errors);
    requireString(params, "userId", errors, { min: 1 });
  }

  return { value: params, errors };
}

export function validateCreateUserBody(body) {
  const errors = [];

  if (ensurePlainObject(body, errors)) {
    hasOnlyKeys(
      body,
      [
        "email",
        "password",
        "displayName",
        "tosConsentAt",
        "privacyConsentAt",
        "timezone",
      ],
      errors
    );
    requireEmail(body, "email", errors);
    requireString(body, "password", errors, { min: 8 });
    requireString(body, "displayName", errors, { min: 1 });
    requireDateTime(body, "tosConsentAt", errors);
    requireDateTime(body, "privacyConsentAt", errors);
    optionalString(body, "timezone", errors, { min: 1 });
  }

  return { value: body, errors };
}

export function validateLoginUserBody(body) {
  const errors = [];

  if (ensurePlainObject(body, errors)) {
    hasOnlyKeys(body, ["email", "password"], errors);
    requireEmail(body, "email", errors);
    requireString(body, "password", errors, { min: 8 });
  }

  return { value: body, errors };
}
