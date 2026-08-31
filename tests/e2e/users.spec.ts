import { test, expect } from "@playwright/test";
import { mockUsers, login, authHeader } from "./fixtures.js";

test.describe("Users API", () => {
  test("GET /users/me returns the authenticated user's profile without a password field", async ({
    request,
  }) => {
    const token = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const res = await request.get("/users/me", { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe(mockUsers.user1.email);
    expect(body.data).not.toHaveProperty("password");
  });

  test("GET /users/me without a token is unauthorized", async ({ request }) => {
    const res = await request.get("/users/me");
    expect(res.status()).toBe(401);
  });

  test("GET /users is forbidden for a non-admin user", async ({ request }) => {
    const token = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const res = await request.get("/users", { headers: authHeader(token) });
    expect(res.status()).toBe(403);
  });

  test("GET /users lists users for an admin", async ({ request }) => {
    const token = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const res = await request.get("/users", { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((u: any) => u.email === mockUsers.user1.email)).toBe(true);
  });

  test("admin can create, fetch, promote, and soft-delete a user", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const email = `created-${Date.now()}@yopmail.com`;

    const createRes = await request.post("/users", {
      headers: authHeader(adminToken),
      data: { name: "Created User", email, password: "longenough1" },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).data;
    const userId = Array.isArray(created) ? created[0].id : created.id;

    const getRes = await request.get(`/users/${userId}`, { headers: authHeader(adminToken) });
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).data.email).toBe(email);

    const roleRes = await request.patch(`/users/${userId}/role`, {
      headers: authHeader(adminToken),
      data: { role: "ADMIN" },
    });
    expect(roleRes.status()).toBe(200);
    expect((await roleRes.json()).data.role).toBe("ADMIN");

    const deleteRes = await request.delete(`/users/${userId}`, { headers: authHeader(adminToken) });
    expect(deleteRes.status()).toBe(200);

    const getAfterDelete = await request.get(`/users/${userId}`, { headers: authHeader(adminToken) });
    expect(getAfterDelete.status()).toBe(404);
  });

  test("creating a user with a duplicate email is rejected", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const res = await request.post("/users", {
      headers: authHeader(adminToken),
      data: { name: "Dup", email: mockUsers.user1.email, password: "longenough1" },
    });
    expect(res.status()).toBe(409);
  });

  test("creating a user with invalid data fails validation", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const res = await request.post("/users", {
      headers: authHeader(adminToken),
      data: { name: "A", email: "not-an-email", password: "short" },
    });
    expect(res.status()).toBe(400);
  });
});
