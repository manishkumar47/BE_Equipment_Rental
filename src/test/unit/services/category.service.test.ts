import { describe, it, expect, vi } from "vitest";

vi.mock("../../../database/repository/category.repository.js");

import * as categoryRepository from "../../../database/repository/category.repository.js";
import * as categoryService from "../../../service/category.service.js";

describe("category.service", () => {
  it("getAllCategories returns whatever the repository returns", async () => {
    const rows = [{ id: 1, name: "Power Tools" }];
    vi.mocked(categoryRepository.getAllCategories).mockResolvedValue(rows as any);

    await expect(categoryService.getAllCategories()).resolves.toEqual(rows);
  });

  it("getAllCategories returns an empty array when there are none", async () => {
    vi.mocked(categoryRepository.getAllCategories).mockResolvedValue([] as any);
    await expect(categoryService.getAllCategories()).resolves.toEqual([]);
  });
});
