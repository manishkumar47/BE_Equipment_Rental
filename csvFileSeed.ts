
import * as fs from "fs";
import * as equipmentService from "./src/features/Equipments/equipment.service.js";

const data = fs.readFileSync("./equipment_seed_data.csv", "utf8");
const records = data
  .split(/\r?\n/)
  .filter((line) => line.trim() !== "") // Remove blank lines
  .map((line) => line.split(","));
const header = records.shift();
console.log(records);
// const seedData = async (records) => {
//   const data = await equipmentService.createBulkEquipments(records);
//   if (!data) {
//     console.log("NOnsdfnsnfsflsd");
//   } else {
//     console.log(data);
//   }
// };

// console.log("Calling seedata");
// await seedData(records);
// console.log("FINISHED");
