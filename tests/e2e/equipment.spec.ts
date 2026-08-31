import { test, expect } from "@playwright/test";
import { mockUsers, login, authHeader, getCategoryId } from "./fixtures.js";

test.describe("Equipment API", () => {
  test("GET /equipments lists the seeded equipment", async ({ request }) => {
    const res = await request.get("/equipments");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.some((e: any) => e.name === "E2E Drill")).toBe(true);
  });

  test("GET /equipments/:id 404s for a non-existent id", async ({ request }) => {
    const res = await request.get("/equipments/999999999");
    expect(res.status()).toBe(404);
  });

  test("full admin lifecycle: create, read, update, delete", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const categoryId = await getCategoryId(request, "Power Tools");

    const createRes = await request.post("/equipments", {
      headers: authHeader(adminToken),
      data: {
        name: `E2E Lifecycle Item ${Date.now()}`,
        price: 250,
        quantity: 4,
        categoryId,
      },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).data;

    const updateRes = await request.put(`/equipments/${created.id}`, {
      headers: authHeader(adminToken),
      data: { quantity: 9 },
    });
    expect(updateRes.status()).toBe(200);
    expect((await updateRes.json()).data.quantity).toBe(9);

    const deleteRes = await request.delete(`/equipments/${created.id}`, {
      headers: authHeader(adminToken),
    });
    expect(deleteRes.status()).toBe(200);

    const getAfterDelete = await request.get(`/equipments/${created.id}`);
    expect(getAfterDelete.status()).toBe(404);
  });

  test("creating equipment without a token is unauthorized", async ({ request }) => {
    const categoryId = await getCategoryId(request, "Power Tools");
    const res = await request.post("/equipments", {
      data: { name: "Should Fail", price: 100, categoryId },
    });
    expect(res.status()).toBe(401);
  });

  test("creating equipment as a non-admin is forbidden", async ({ request }) => {
    const token = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const categoryId = await getCategoryId(request, "Power Tools");
    const res = await request.post("/equipments", {
      headers: authHeader(token),
      data: { name: "Should Fail", price: 100, categoryId },
    });
    expect(res.status()).toBe(403);
  });

  test("creating equipment with invalid data fails validation", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const categoryId = await getCategoryId(request, "Power Tools");
    const res = await request.post("/equipments", {
      headers: authHeader(adminToken),
      data: { name: "", price: -10, categoryId },
    });
    expect(res.status()).toBe(400);
  });

  test("bulk-create adds multiple equipment items at once", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const categoryId = await getCategoryId(request, "Photography");

    const res = await request.post("/equipments/bulk", {
      headers: authHeader(adminToken),
      data: {
        items: [
          { name: `Bulk A ${Date.now()}`, price: 10, categoryId },
          { name: `Bulk B ${Date.now()}`, price: 20, categoryId },
        ],
      },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).data).toHaveLength(2);
  });
});
