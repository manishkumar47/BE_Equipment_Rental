import db from "../../database/db-connection.js";

export const getAllCategories = async () => {
  return db.query.equipmentCategory.findMany();
};
