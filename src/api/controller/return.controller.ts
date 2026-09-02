import type { NextFunction, Request, Response } from "express";
import { successResponse, errorResponse } from "../../helpers/res.helper.js";
import * as returnService from "../../service/return.service.js";
import { paginationSchema } from "../validators/return.schema.js";
import { AppError } from "../../util/appError.js";

/**
 * User requests return of a rental booking.
 * POST /rentals/:bookingId/return-request
 */
export const requestReturn = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, "User not authorized!");
    }

    if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
      throw new AppError(400, "Invalid booking ID!");
    }

    const { quantity } = req.body as { quantity?: number };

    const booking = await returnService.requestReturn(bookingId, userId, quantity);

    return successResponse(res, {
      status: 200,
      message: "Return request submitted successfully!",
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin views pending return requests (paginated).
 * GET /admin/rentals/return-requests
 */
export const getPendingReturnRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        "Invalid pagination parameters",
        parsed.error.issues.map((issue) => issue.message),
      );
    }

    const { page, limit, search } = parsed.data;
    const result = await returnService.getPendingReturnRequests(
      page,
      limit,
      search,
    );

    return successResponse(res, {
      status: 200,
      message: "Pending return requests fetched!",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin confirms a return with condition assessment.
 * POST /admin/rentals/:bookingId/confirm-return
 */
export const confirmReturn = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bookingId = Number(req.params.bookingId);

    if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
      throw new AppError(400, "Invalid booking ID!");
    }

    const { condition, conditionNotes, damageFee, items } = req.body;

    const result = await returnService.confirmReturn(bookingId, {
      condition,
      conditionNotes,
      damageFee,
      items,
    });

    return successResponse(res, {
      status: 200,
      message: "Return confirmed successfully!",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin rejects a return request.
 * POST /admin/rentals/:bookingId/reject-return
 */
export const rejectReturn = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bookingId = Number(req.params.bookingId);

    if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
      throw new AppError(400, "Invalid booking ID!");
    }

    const { rejectionReason } = req.body;

    const booking = await returnService.rejectReturn(
      bookingId,
      rejectionReason,
    );

    return successResponse(res, {
      status: 200,
      message: "Return request rejected!",
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};
