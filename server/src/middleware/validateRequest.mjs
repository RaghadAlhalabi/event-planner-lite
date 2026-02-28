/**
 * Express middleware factory for validating requests.
 *
 * @param {{ body?: (value: unknown) => { value: unknown, errors: Array<{ path: string, message: string, code: string }> }, query?: (value: unknown) => { value: unknown, errors: Array<{ path: string, message: string, code: string }> }, params?: (value: unknown) => { value: unknown, errors: Array<{ path: string, message: string, code: string }> } }} validators
 */
export function validateRequest(validators = {}) {
  return (req, res, next) => {
    try {
      for (const source of ["params", "query", "body"]) {
        const validator = validators[source];
        if (!validator) continue;

        const result = validator(req[source]);
        if (result?.errors?.length) {
          return res.status(400).json({
            error: "ValidationError",
            message: "Invalid request",
            details: result.errors,
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
