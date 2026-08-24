import { successResponse } from "../../helpers/res.helper.js";
import * as categoryRepository from "./category.repository.js";
export const getAllCategories = async () => {
  const categories = await categoryRepository.getAllCategories();
  return categories;
};
