import db from "../../services/drizzle.js";

export const getAllCategories = async () => {
  return db.query.equipmentCategory.findMany();
};
