import { describe, it, expect, vi } from "vitest";

vi.mock("../../../database/repository/equipment.repository.js");

import * as equipmentRepository from "../../../database/repository/equipment.repository.js";
import * as equipmentService from "../../../service/equipment.service.js";

describe("equipment.service", () => {
  it("createEquipment delegates to the repository and returns its result", async () => {
    const created = { id: 1, name: "Drill" };
    vi.mocked(equipmentRepository.createEquipment).mockResolvedValue(created as any);

    const data = { name: "Drill", price: 100, quantity: 5, equipmentCategoryId: 1 } as any;
    await expect(equipmentService.createEquipment(data)).resolves.toEqual(created);
    expect(equipmentRepository.createEquipment).toHaveBeenCalledWith(data);
  });

  it("getEquipmentFromId delegates to the repository and returns its result", async () => {
    const found = { id: 1, name: "Drill" };
    vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue(found as any);

    await expect(equipmentService.getEquipmentFromId(1)).resolves.toEqual(found);
    expect(equipmentRepository.getEquipmentFromId).toHaveBeenCalledWith(1);
  });

  it("getEquipmentFromId returns undefined when nothing is found", async () => {
    vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue(undefined as any);
    await expect(equipmentService.getEquipmentFromId(999)).resolves.toBeUndefined();
  });

  it("updateEquipment delegates to the repository with the id and patch", async () => {
    const updated = { id: 1, name: "Drill", quantity: 3 };
    vi.mocked(equipmentRepository.updateEquipment).mockResolvedValue(updated as any);

    const patch = { quantity: 3 };
    await expect(equipmentService.updateEquipment(1, patch)).resolves.toEqual(updated);
    expect(equipmentRepository.updateEquipment).toHaveBeenCalledWith(1, patch);
  });

  it("deleteEquipment delegates to the repository", async () => {
    const deleted = { id: 1, isDeleted: true };
    vi.mocked(equipmentRepository.deleteEquipment).mockResolvedValue(deleted as any);

    await expect(equipmentService.deleteEquipment(1)).resolves.toEqual(deleted);
    expect(equipmentRepository.deleteEquipment).toHaveBeenCalledWith(1);
  });

  it("getAllEquipments returns whatever the repository returns", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    vi.mocked(equipmentRepository.getAllEquipments).mockResolvedValue(rows as any);

    await expect(equipmentService.getAllEquipments()).resolves.toEqual(rows);
  });

  it("bulkCreateEquipments delegates the full array to the repository", async () => {
    const items = [{ name: "Drill" }, { name: "Ladder" }] as any;
    const created = [{ id: 1 }, { id: 2 }];
    vi.mocked(equipmentRepository.bulkCreateEquipments).mockResolvedValue(created as any);

    await expect(equipmentService.bulkCreateEquipments(items)).resolves.toEqual(created);
    expect(equipmentRepository.bulkCreateEquipments).toHaveBeenCalledWith(items);
  });
});
