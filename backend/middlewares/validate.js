/**
 * Reusable validation middleware that checks incoming request parameters, query, and body.
 * Returns HTTP 422 with formatted errors if validation fails.
 * @param {import('zod').ZodSchema} schema - The Zod validation schema to check against.
 * @returns {import('express').RequestHandler} The Express middleware handler.
 */
export const validate = (schema) => (req, res, next) => {
  // Construct data object merging body, query, and route parameters.
  // We explicitly map route parameter ':id' to 'websiteId' for schema compatibility.
  const dataToValidate = {
    ...req.body,
    ...req.params,
    ...req.query,
    ...(req.params.id ? { websiteId: req.params.id } : {}),
  };

  const parsed = schema.safeParse(dataToValidate);

  if (!parsed.success) {
    const details = parsed.error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details,
      },
    });
  }

  // Update req.body with the sanitized and validated values
  req.body = parsed.data;
  next();
};

export default validate;
