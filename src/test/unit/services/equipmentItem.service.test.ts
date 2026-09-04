import { describe, it, expect, vi } from "vitest";

vi.mock("../../../database/repository/equipmentItem.repository.js");
vi.mock("../../../database/repository/equipment.repository.js");

import * as equipmentItemRepository from "../../../database/repository/equipmentItem.repository.js";
import * as equipmentRepository from "../../../database/repository/equipment.repository.js";
import * as equipmentItemService from "../../../service/equipmentItem.service.js";

// Matches the real shape thrown by drizzle-orm (DrizzleQueryError nests the
// original pg error under `.cause`, not at the top level).
const uniqueViolation = { name: "DrizzleQueryError", cause: { code: "23505" } };

describe("equipmentItem.service", () => {
  describe("createEquipmentItem", () => {
    it("throws 404 when the parent equipment does not exist", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue(undefined as any);

      await expect(
        equipmentItemService.createEquipmentItem(1, { serialNumber: "A-1" }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(equipmentItemRepository.createEquipmentItem).not.toHaveBeenCalled();
    });

    it("creates the item scoped to the equipment on success", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1 } as any);
      const created = { id: 10, equipmentId: 1, serialNumber: "A-1" };
      vi.mocked(equipmentItemRepository.createEquipmentItem).mockResolvedValue(created as any);

      await expect(
        equipmentItemService.createEquipmentItem(1, { serialNumber: "A-1" }),
      ).resolves.toEqual(created);
      expect(equipmentItemRepository.createEquipmentItem).toHaveBeenCalledWith({
        serialNumber: "A-1",
        equipmentId: 1,
      });
    });

    it("maps a duplicate serial number to a 409 AppError", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1 } as any);
      vi.mocked(equipmentItemRepository.createEquipmentItem).mockRejectedValue(uniqueViolation);

      await expect(
        equipmentItemService.createEquipmentItem(1, { serialNumber: "A-1" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("rethrows non-uniqueness errors as-is", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1 } as any);
      vi.mocked(equipmentItemRepository.createEquipmentItem).mockRejectedValue(new Error("boom"));

      await expect(
        equipmentItemService.createEquipmentItem(1, { serialNumber: "A-1" }),
      ).rejects.toThrow("boom");
    });
  });

  describe("bulkCreateEquipmentItems", () => {
    it("throws 404 when the parent equipment does not exist", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue(undefined as any);

      await expect(
        equipmentItemService.bulkCreateEquipmentItems(1, [{ serialNumber: "A-1" }]),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("attaches the equipmentId to every item before inserting", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1 } as any);
      const created = [{ id: 1 }, { id: 2 }];
      vi.mocked(equipmentItemRepository.bulkCreateEquipmentItems).mockResolvedValue(created as any);

      const items = [{ serialNumber: "A-1" }, { serialNumber: "A-2" }];
      await expect(equipmentItemService.bulkCreateEquipmentItems(1, items)).resolves.toEqual(created);
      expect(equipmentItemRepository.bulkCreateEquipmentItems).toHaveBeenCalledWith([
        { serialNumber: "A-1", equipmentId: 1 },
        { serialNumber: "A-2", equipmentId: 1 },
      ]);
    });

    it("maps a duplicate serial number to a 409 AppError", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1 } as any);
      vi.mocked(equipmentItemRepository.bulkCreateEquipmentItems).mockRejectedValue(uniqueViolation);

      await expect(
        equipmentItemService.bulkCreateEquipmentItems(1, [{ serialNumber: "A-1" }]),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("rethrows non-uniqueness errors as-is", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1 } as any);
      vi.mocked(equipmentItemRepository.bulkCreateEquipmentItems).mockRejectedValue(new Error("boom"));

      await expect(
        equipmentItemService.bulkCreateEquipmentItems(1, [{ serialNumber: "A-1" }]),
      ).rejects.toThrow("boom");
    });
  });

  describe("getEquipmentItemsByEquipmentId", () => {
    it("throws 404 when the parent equipment does not exist", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue(undefined as any);
      await expect(equipmentItemService.getEquipmentItemsByEquipmentId(1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("returns the items for the equipment", async () => {
      vi.mocked(equipmentRepository.getEquipmentFromId).mockResolvedValue({ id: 1 } as any);
      const rows = [{ id: 1 }, { id: 2 }];
      vi.mocked(equipmentItemRepository.getEquipmentItemsByEquipmentId).mockResolvedValue(rows as any);

      await expect(equipmentItemService.getEquipmentItemsByEquipmentId(1)).resolves.toEqual(rows);
    });
  });

  describe("updateEquipmentItem", () => {
    it("throws 404 when the item does not exist", async () => {
      vi.mocked(equipmentItemRepository.getEquipmentItemById).mockResolvedValue(undefined as any);

      await expect(
        equipmentItemService.updateEquipmentItem(1, 5, { status: "damaged" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 404 when the item belongs to a different equipment", async () => {
      vi.mocked(equipmentItemRepository.getEquipmentItemById).mockResolvedValue({
        id: 5,
        equipmentId: 2,
      } as any);

      await expect(
        equipmentItemService.updateEquipmentItem(1, 5, { status: "damaged" }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(equipmentItemRepository.updateEquipmentItem).not.toHaveBeenCalled();
    });

    it("updates the item when it belongs to the given equipment", async () => {
      vi.mocked(equipmentItemRepository.getEquipmentItemById).mockResolvedValue({
        id: 5,
        equipmentId: 1,
      } as any);
      const updated = { id: 5, equipmentId: 1, status: "damaged" };
      vi.mocked(equipmentItemRepository.updateEquipmentItem).mockResolvedValue(updated as any);

      await expect(
        equipmentItemService.updateEquipmentItem(1, 5, { status: "damaged" }),
      ).resolves.toEqual(updated);
      expect(equipmentItemRepository.updateEquipmentItem).toHaveBeenCalledWith(5, {
        status: "damaged",
      });
    });

    it("maps a duplicate serial number to a 409 AppError", async () => {
      vi.mocked(equipmentItemRepository.getEquipmentItemById).mockResolvedValue({
        id: 5,
        equipmentId: 1,
      } as any);
      vi.mocked(equipmentItemRepository.updateEquipmentItem).mockRejectedValue(uniqueViolation);

      await expect(
        equipmentItemService.updateEquipmentItem(1, 5, { serialNumber: "DUP" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("rethrows non-uniqueness errors as-is", async () => {
      vi.mocked(equipmentItemRepository.getEquipmentItemById).mockResolvedValue({
        id: 5,
        equipmentId: 1,
      } as any);
      vi.mocked(equipmentItemRepository.updateEquipmentItem).mockRejectedValue(new Error("boom"));

      await expect(
        equipmentItemService.updateEquipmentItem(1, 5, { status: "damaged" }),
      ).rejects.toThrow("boom");
    });
  });

  describe("deleteEquipmentItem", () => {
    it("throws 404 when the item does not belong to the given equipment", async () => {
      vi.mocked(equipmentItemRepository.getEquipmentItemById).mockResolvedValue({
        id: 5,
        equipmentId: 2,
      } as any);

      await expect(equipmentItemService.deleteEquipmentItem(1, 5)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("soft-deletes the item on success", async () => {
      vi.mocked(equipmentItemRepository.getEquipmentItemById).mockResolvedValue({
        id: 5,
        equipmentId: 1,
      } as any);
      vi.mocked(equipmentItemRepository.softDeleteEquipmentItem).mockResolvedValue({
        id: 5,
        isDeleted: true,
      } as any);

      await equipmentItemService.deleteEquipmentItem(1, 5);
      expect(equipmentItemRepository.softDeleteEquipmentItem).toHaveBeenCalledWith(5);
    });
  });

  describe("getItemCounts", () => {
    it("returns zeros when there are no item rows for the equipment", async () => {
      vi.mocked(equipmentItemRepository.getItemCountsForEquipmentIds).mockResolvedValue([]);

      await expect(equipmentItemService.getItemCounts(1)).resolves.toEqual({
        totalItemCount: 0,
        availableItemCount: 0,
      });
    });

    it("returns the matching count row", async () => {
      vi.mocked(equipmentItemRepository.getItemCountsForEquipmentIds).mockResolvedValue([
        { equipmentId: 1, totalItemCount: 5, availableItemCount: 2 },
      ] as any);

      await expect(equipmentItemService.getItemCounts(1)).resolves.toEqual({
        totalItemCount: 5,
        availableItemCount: 2,
      });
    });
  });

  describe("getItemCountsMap", () => {
    it("builds a map keyed by equipmentId", async () => {
      vi.mocked(equipmentItemRepository.getItemCountsForEquipmentIds).mockResolvedValue([
        { equipmentId: 1, totalItemCount: 5, availableItemCount: 2 },
        { equipmentId: 2, totalItemCount: 1, availableItemCount: 1 },
      ] as any);

      const map = await equipmentItemService.getItemCountsMap([1, 2]);

      expect(map.get(1)).toEqual({ totalItemCount: 5, availableItemCount: 2 });
      expect(map.get(2)).toEqual({ totalItemCount: 1, availableItemCount: 1 });
    });
  });
});
