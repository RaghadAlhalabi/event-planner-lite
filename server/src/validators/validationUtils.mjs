const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function addError(errors, path, message, code) {
  errors.push({ path, message, code });
}

export function ensurePlainObject(value, errors) {
  if (!isPlainObject(value)) {
    addError(errors, "(root)", "Expected object", "invalid_type");
    return false;
  }
  return true;
}

export function hasOnlyKeys(obj, allowedKeys, errors) {
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.includes(key)) {
      addError(errors, key, "Unknown field", "unknown_key");
    }
  }
}

export function requireString(obj, key, errors, options = {}) {
  const value = obj?.[key];
  const min = typeof options.min === "number" ? options.min : 0;

  if (value === undefined) {
    addError(errors, key, "Required field", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "Expected string", "invalid_type");
    return;
  }
  if (min && value.length < min) {
    addError(
      errors,
      key,
      `Must be at least ${min} characters`,
      "invalid_value"
    );
  }
}

export function optionalString(obj, key, errors, options = {}) {
  const value = obj?.[key];
  if (value === undefined) return;

  const min = typeof options.min === "number" ? options.min : 0;
  if (typeof value !== "string") {
    addError(errors, key, "Expected string", "invalid_type");
    return;
  }
  if (min && value.length < min) {
    addError(
      errors,
      key,
      `Must be at least ${min} characters`,
      "invalid_value"
    );
  }
}

export function requireEmail(obj, key, errors) {
  const value = obj?.[key];
  if (value === undefined) {
    addError(errors, key, "Required field", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "Expected string", "invalid_type");
    return;
  }
  if (!emailRegex.test(value)) {
    addError(errors, key, "Invalid email", "invalid_value");
  }
}

export function requireDateTime(obj, key, errors) {
  const value = obj?.[key];
  if (value === undefined) {
    addError(errors, key, "Required field", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "Expected string", "invalid_type");
    return;
  }
  if (Number.isNaN(Date.parse(value))) {
    addError(errors, key, "Invalid datetime", "invalid_value");
  }
}

export function optionalDateTime(obj, key, errors) {
  const value = obj?.[key];
  if (value === undefined) return;

  if (typeof value !== "string") {
    addError(errors, key, "Expected string", "invalid_type");
    return;
  }
  if (Number.isNaN(Date.parse(value))) {
    addError(errors, key, "Invalid datetime", "invalid_value");
  }
}

export function requireEnum(obj, key, allowedValues, errors) {
  const value = obj?.[key];
  if (value === undefined) {
    addError(errors, key, "Required field", "missing");
    return;
  }
  if (typeof value !== "string") {
    addError(errors, key, "Expected string", "invalid_type");
    return;
  }
  if (!allowedValues.includes(value)) {
    addError(errors, key, "Invalid value", "invalid_value");
  }
}
