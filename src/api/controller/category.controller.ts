import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as categoryService from "../../service/category.service.js";
export const getAllCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categories = await categoryService.getAllCategories();
    return successResponse(res, {
      status: 200,
      message: "Categories fetched!",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
