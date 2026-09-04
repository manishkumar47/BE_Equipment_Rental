import { describe, it, expect, vi } from "vitest";

vi.mock("../../../database/repository/equipment.repository.js");
vi.mock("../../../service/equipmentItem.service.js");

import * as equipmentRepository from "../../../database/repository/equipment.repository.js";
import * as equipmentItemService from "../../../service/equipmentItem.service.js";
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

  describe("getAllEquipmentsWithItemCounts", () => {
    it("annotates each equipment with its item-derived counts", async () => {
      const rows = [{ id: 1, name: "Drill" }, { id: 2, name: "Ladder" }];
      vi.mocked(equipmentRepository.getAllEquipments).mockResolvedValue(rows as any);
      vi.mocked(equipmentItemService.getItemCountsMap).mockResolvedValue(
        new Map([
          [1, { totalItemCount: 5, availableItemCount: 3 }],
          [2, { totalItemCount: 2, availableItemCount: 2 }],
        ]),
      );

      const result = await equipmentService.getAllEquipmentsWithItemCounts();

      expect(equipmentItemService.getItemCountsMap).toHaveBeenCalledWith([1, 2]);
      expect(result).toEqual([
        { id: 1, name: "Drill", totalItemCount: 5, availableItemCount: 3 },
        { id: 2, name: "Ladder", totalItemCount: 2, availableItemCount: 2 },
      ]);
    });

    it("defaults counts to 0 for equipment with no item rows", async () => {
      vi.mocked(equipmentRepository.getAllEquipments).mockResolvedValue([{ id: 9, name: "New" }] as any);
      vi.mocked(equipmentItemService.getItemCountsMap).mockResolvedValue(new Map());

      const result = await equipmentService.getAllEquipmentsWithItemCounts();

      expect(result).toEqual([{ id: 9, name: "New", totalItemCount: 0, availableItemCount: 0 }]);
    });
  });

  describe("getEquipmentsPaginated", () => {
    it("annotates paginated results with item counts and pagination metadata", async () => {
      const rows = [{ id: 1, name: "Drill" }, { id: 2, name: "Ladder" }];
      vi.mocked(equipmentRepository.getEquipmentsPaginated).mockResolvedValue({
        data: rows,
        total: 42,
      } as any);
      vi.mocked(equipmentItemService.getItemCountsMap).mockResolvedValue(
        new Map([[1, { totalItemCount: 5, availableItemCount: 3 }]]),
      );

      const filters = { categoryId: 2 } as any;
      const result = await equipmentService.getEquipmentsPaginated(1, 20, filters);

      expect(equipmentRepository.getEquipmentsPaginated).toHaveBeenCalledWith(1, 20, filters);
      expect(equipmentItemService.getItemCountsMap).toHaveBeenCalledWith([1, 2]);
      expect(result).toEqual({
        data: [
          { id: 1, name: "Drill", totalItemCount: 5, availableItemCount: 3 },
          { id: 2, name: "Ladder", totalItemCount: 0, availableItemCount: 0 },
        ],
        total: 42,
        page: 1,
        limit: 20,
        totalPages: 3,
      });
    });
  });

  describe("getEquipmentByIdWithItemCounts", () => {
    it("returns undefined without querying counts when the equipment does not exist", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue(undefined as any);

      await expect(equipmentService.getEquipmentByIdWithItemCounts(999)).resolves.toBeUndefined();
      expect(equipmentItemService.getItemCounts).not.toHaveBeenCalled();
    });

    it("merges item counts into the equipment when found", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1, name: "Drill" } as any);
      vi.mocked(equipmentItemService.getItemCounts).mockResolvedValue({
        totalItemCount: 4,
        availableItemCount: 1,
      });

      const result = await equipmentService.getEquipmentByIdWithItemCounts(1);

      expect(equipmentItemService.getItemCounts).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: "Drill", totalItemCount: 4, availableItemCount: 1 });
    });
  });
});
