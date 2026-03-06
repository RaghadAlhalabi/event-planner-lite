const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function addError(errors, path, message, code, params = undefined) {
  const detail = { path, message, code };
  if (params && typeof params === "object") {
    detail.params = params;
  }
  errors.push(detail);
}

export function ensurePlainObject(value, errors) {
  if (!isPlainObject(value)) {
    addError(errors, "(root)", "validation.expectedObject", "invalid_type");
    return false;
  }
  return true;
}

export function hasOnlyKeys(obj, allowedKeys, errors) {
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.includes(key)) {
      addError(errors, key, "validation.unknownField", "unknown_key");
    }
  }
}

export function requireString(obj, key, errors, options = {}) {
  const value = obj?.[key];
  const min = typeof options.min === "number" ? options.min : 0;

  if (value === undefined) {
    addError(errors, key, "validation.requiredField", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "validation.expectedString", "invalid_type");
    return;
  }
  if (min && value.length < min) {
    addError(
      errors,
      key,
      "validation.minCharacters",
      "invalid_value",
      { min }
    );
  }
}

export function optionalString(obj, key, errors, options = {}) {
  const value = obj?.[key];
  if (value === undefined) return;

  const min = typeof options.min === "number" ? options.min : 0;
  if (typeof value !== "string") {
    addError(errors, key, "validation.expectedString", "invalid_type");
    return;
  }
  if (min && value.length < min) {
    addError(
      errors,
      key,
      "validation.minCharacters",
      "invalid_value",
      { min }
    );
  }
}

export function requireEmail(obj, key, errors) {
  const value = obj?.[key];
  if (value === undefined) {
    addError(errors, key, "validation.requiredField", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "validation.expectedString", "invalid_type");
    return;
  }
  if (!emailRegex.test(value)) {
    addError(errors, key, "validation.invalidEmail", "invalid_value");
  }
}

export function requireDateTime(obj, key, errors) {
  const value = obj?.[key];
  if (value === undefined) {
    addError(errors, key, "validation.requiredField", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "validation.expectedString", "invalid_type");
    return;
  }
  if (Number.isNaN(Date.parse(value))) {
    addError(errors, key, "validation.invalidDatetime", "invalid_value");
  }
}

export function optionalDateTime(obj, key, errors) {
  const value = obj?.[key];
  if (value === undefined) return;

  if (typeof value !== "string") {
    addError(errors, key, "validation.expectedString", "invalid_type");
    return;
  }
  if (Number.isNaN(Date.parse(value))) {
    addError(errors, key, "validation.invalidDatetime", "invalid_value");
  }
}

export function requireEnum(obj, key, allowedValues, errors) {
  const value = obj?.[key];
  if (value === undefined) {
    addError(errors, key, "validation.requiredField", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "validation.expectedString", "invalid_type");
    return;
  }
  if (!allowedValues.includes(value)) {
    addError(errors, key, "validation.invalidValue", "invalid_value");
  }
}
