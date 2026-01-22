import { ZodError } from "zod";

function formatZodIssues(issues) {
  return issues.map((issue) => ({
    path: issue.path?.length ? issue.path.join(".") : "(root)",
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Express middleware factory for validating requests.
 *
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export function validateRequest(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Invalid request",
          details: formatZodIssues(err.issues),
        });
      }
      return next(err);
    }
  };
}
