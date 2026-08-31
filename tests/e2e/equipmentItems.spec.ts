import { test, expect } from "@playwright/test";
import { mockUsers, login, authHeader, getCategoryId } from "./fixtures.js";

async function createEquipmentType(request: any, adminToken: string, quantity = 0) {
  const categoryId = await getCategoryId(request, "Power Tools");
  const res = await request.post("/equipments", {
    headers: authHeader(adminToken),
    data: {
      name: `E2E Item-Test Equipment ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      price: 100,
      quantity,
      categoryId,
    },
  });
  return (await res.json()).data as { id: number };
}

test.describe("Equipment Items API", () => {
  test("admin can register a physical unit for an equipment", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);

    const res = await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber: `SN-${Date.now()}`, conditionNotes: "Brand new" },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()).data;
    expect(body.status).toBe("available");
    expect(body.equipmentId).toBe(equipmentType.id);
  });

  test("registering an item for a non-existent equipment 404s", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const res = await request.post("/equipments/999999999/items", {
      headers: authHeader(adminToken),
      data: { serialNumber: `SN-${Date.now()}` },
    });
    expect(res.status()).toBe(404);
  });

  test("registering an item without a token is unauthorized", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);

    const res = await request.post(`/equipments/${equipmentType.id}/items`, {
      data: { serialNumber: `SN-${Date.now()}` },
    });
    expect(res.status()).toBe(401);
  });

  test("registering an item as a non-admin is forbidden", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const equipmentType = await createEquipmentType(request, adminToken);

    const res = await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(userToken),
      data: { serialNumber: `SN-${Date.now()}` },
    });
    expect(res.status()).toBe(403);
  });

  test("registering a duplicate serial number is rejected", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);
    const serialNumber = `SN-DUP-${Date.now()}`;

    const first = await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber },
    });
    expect(first.status()).toBe(201);

    const second = await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber },
    });
    expect(second.status()).toBe(409);
  });

  test("bulk-registers multiple items at once", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);

    const res = await request.post(`/equipments/${equipmentType.id}/items/bulk`, {
      headers: authHeader(adminToken),
      data: {
        items: [
          { serialNumber: `BULK-${Date.now()}-1` },
          { serialNumber: `BULK-${Date.now()}-2` },
          { serialNumber: `BULK-${Date.now()}-3` },
        ],
      },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).data).toHaveLength(3);
  });

  test("lists items registered for an equipment (admin only)", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const equipmentType = await createEquipmentType(request, adminToken);

    await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber: `SN-${Date.now()}` },
    });

    const forbidden = await request.get(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(userToken),
    });
    expect(forbidden.status()).toBe(403);

    const res = await request.get(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });

  test("admin can update an item's status and notes", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);
    const createRes = await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber: `SN-${Date.now()}` },
    });
    const item = (await createRes.json()).data;

    const res = await request.patch(`/equipments/${equipmentType.id}/items/${item.id}`, {
      headers: authHeader(adminToken),
      data: { status: "damaged", conditionNotes: "Cracked casing" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()).data;
    expect(body.status).toBe("damaged");
    expect(body.conditionNotes).toBe("Cracked casing");
  });

  test("updating with an empty payload fails validation", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);
    const createRes = await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber: `SN-${Date.now()}` },
    });
    const item = (await createRes.json()).data;

    const res = await request.patch(`/equipments/${equipmentType.id}/items/${item.id}`, {
      headers: authHeader(adminToken),
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("an item under a different equipment id 404s", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentA = await createEquipmentType(request, adminToken);
    const equipmentB = await createEquipmentType(request, adminToken);
    const createRes = await request.post(`/equipments/${equipmentA.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber: `SN-${Date.now()}` },
    });
    const item = (await createRes.json()).data;

    const res = await request.patch(`/equipments/${equipmentB.id}/items/${item.id}`, {
      headers: authHeader(adminToken),
      data: { status: "damaged" },
    });
    expect(res.status()).toBe(404);
  });

  test("admin can soft-delete an item", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);
    const createRes = await request.post(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber: `SN-${Date.now()}` },
    });
    const item = (await createRes.json()).data;

    const deleteRes = await request.delete(`/equipments/${equipmentType.id}/items/${item.id}`, {
      headers: authHeader(adminToken),
    });
    expect(deleteRes.status()).toBe(200);

    const listRes = await request.get(`/equipments/${equipmentType.id}/items`, {
      headers: authHeader(adminToken),
    });
    expect((await listRes.json()).data).toHaveLength(0);
  });

  test("equipment list/detail responses derive available/total item counts from item status", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const equipmentType = await createEquipmentType(request, adminToken);

    const bulkRes = await request.post(`/equipments/${equipmentType.id}/items/bulk`, {
      headers: authHeader(adminToken),
      data: {
        items: [
          { serialNumber: `COUNT-${Date.now()}-1` },
          { serialNumber: `COUNT-${Date.now()}-2` },
          { serialNumber: `COUNT-${Date.now()}-3` },
        ],
      },
    });
    const items = (await bulkRes.json()).data as Array<{ id: number }>;

    const detailBefore = await request.get(`/equipments/${equipmentType.id}`);
    expect((await detailBefore.json()).data).toMatchObject({
      totalItemCount: 3,
      availableItemCount: 3,
    });

    await request.patch(`/equipments/${equipmentType.id}/items/${items[0]!.id}`, {
      headers: authHeader(adminToken),
      data: { status: "damaged" },
    });

    const detailAfter = await request.get(`/equipments/${equipmentType.id}`);
    expect((await detailAfter.json()).data).toMatchObject({
      totalItemCount: 3,
      availableItemCount: 2,
    });

    const listRes = await request.get("/equipments");
    const listed = (await listRes.json()).data.find((e: any) => e.id === equipmentType.id);
    expect(listed).toMatchObject({ totalItemCount: 3, availableItemCount: 2 });
  });
});
