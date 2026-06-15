import { CreditTransaction } from "../models/creditTransactionModel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { parsePagination } from "../utils/validation.js";

export const getCreditHistory = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, {
      limit: 20,
      maxLimit: 50,
    });
    const filter = { user: req.user._id };
    const [transactions, total] = await Promise.all([
      CreditTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreditTransaction.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    });
  } catch (error) {
    return sendError(res, "CREDIT_HISTORY_FAILED", error.message, 500);
  }
};
