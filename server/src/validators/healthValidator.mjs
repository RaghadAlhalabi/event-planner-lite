import { ensurePlainObject, hasOnlyKeys, requireEmail } from "./validationUtils.mjs";

export function validateEmailTestBody(body) {
  const errors = [];

  if (ensurePlainObject(body, errors)) {
    hasOnlyKeys(body, ["to"], errors);
    requireEmail(body, "to", errors);
  }

  return { value: body, errors };
}
