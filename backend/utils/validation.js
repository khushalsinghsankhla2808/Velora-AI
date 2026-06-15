// PATH: backend/utils/validation.js

import mongoose from "mongoose";

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export const validateText = ({ value, field, min = 1, max = 4000 }) => {
  const text = normalizeText(value);

  if (text.length < min) {
    return {
      valid: false,
      message: `${field} is required`,
    };
  }

  if (text.length > max) {
    return {
      valid: false,
      message: `${field} must be ${max} characters or fewer`,
    };
  }

  return {
    valid: true,
    value: text,
  };
};

export const parsePagination = (query, defaults = {}) => {
  const defaultPage = defaults.page || 1;
  const defaultLimit = defaults.limit || 20;
  const maxLimit = defaults.maxLimit || 50;

  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);

  const safePage = Number.isFinite(page) && page > 0 ? page : defaultPage;
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(limit, maxLimit)
      : defaultLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};
