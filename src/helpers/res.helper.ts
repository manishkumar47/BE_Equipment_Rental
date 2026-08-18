import type{ Response } from "express";

type ApiResponse<T = unknown> = {
  status: number;
  message: string;
  data?: T;
};

export const successResponse = <T>(
  res: Response,
  { status, message, data }: ApiResponse<T>,
) => {
  return res.status(status).json({
    success: true,
    message,
    data: data ?? null,
  });
};

export const errorResponse = (
  res: Response,
  status: number,
  message: string,
  errors?: unknown,
) => {
  return res.status(status).json({
    success: false,
    message,
    errors: errors ?? null,
  });
};
