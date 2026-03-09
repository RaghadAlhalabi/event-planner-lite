/**
 * Express middleware factory for validating requests.
 *
 * @param {{ body?: (value: unknown) => { value: unknown, errors: Array<{ path: string, message: string, code: string }> }, query?: (value: unknown) => { value: unknown, errors: Array<{ path: string, message: string, code: string }> }, params?: (value: unknown) => { value: unknown, errors: Array<{ path: string, message: string, code: string }> } }} validators
 */
function translateValidationDetail(req, detail) {
  if (!req?.t || !detail || typeof detail !== "object") {
    return detail;
  }

  const { code, message, params } = detail;

  // Preferred path: validators emit i18n keys directly.
  if (typeof message === "string" && message.startsWith("validation.")) {
    return { ...detail, message: req.t(message, params || {}) };
  }

  if (code === "unknown_key") {
    return { ...detail, message: req.t("validation.unknownField") };
  }

  if (code === "missing") {
    return { ...detail, message: req.t("validation.requiredField") };
  }

  if (code === "invalid_type" && message === "Expected object") {
    return { ...detail, message: req.t("validation.expectedObject") };
  }

  if (code === "invalid_type" && message === "Expected string") {
    return { ...detail, message: req.t("validation.expectedString") };
  }

  if (code === "invalid_value" && message === "Invalid email") {
    return { ...detail, message: req.t("validation.invalidEmail") };
  }

  if (code === "invalid_value" && message === "Invalid datetime") {
    return { ...detail, message: req.t("validation.invalidDatetime") };
  }

  if (code === "invalid_value" && message === "Invalid value") {
    return { ...detail, message: req.t("validation.invalidValue") };
  }

  if (code === "invalid_value") {
    const minMatch = /^Must be at least (\d+) characters$/.exec(message || "");
    if (minMatch) {
      return {
        ...detail,
        message: req.t("validation.minCharacters", { min: minMatch[1] }),
      };
    }
  }

  return detail;
}

export function validateRequest(validators = {}) {
  return (req, res, next) => {
    try {
      for (const source of ["params", "query", "body"]) {
        const validator = validators[source];
        if (!validator) continue;

        const result = validator(req[source]);
        if (result?.errors?.length) {
          const localizedDetails = result.errors.map((detail) =>
            translateValidationDetail(req, detail)
          );

          return res.status(400).json({
            error: "ValidationError",
            message: req.t
              ? req.t("errors.ValidationError")
              : "Invalid request",
            details: localizedDetails,
          });
        }
        if (result && Object.prototype.hasOwnProperty.call(result, "value")) {
          req[source] = result.value;
        }
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
