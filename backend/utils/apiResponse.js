// PATH: backend/utils/apiResponse.js

export const sendSuccess = (res, data = {}, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    data,
  });

export const sendError = (
  res,
  code = "INTERNAL_ERROR",
  message = "Something went wrong",
  statusCode = 500,
) =>
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
