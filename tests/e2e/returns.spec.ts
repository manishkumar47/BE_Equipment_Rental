import { test, expect } from "@playwright/test";
import {
  mockUsers,
  login,
  authHeader,
  createTestEquipment,
  createTestBooking,
} from "./fixtures.js";

test.describe("Returns API", () => {
  test("user can request a return for their own active booking", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);

    const res = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("return_requested");
  });

  test("a user cannot request a return for someone else's booking", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const user1Token = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const user2Token = await login(request, mockUsers.user2.email, mockUsers.user2.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, user1Token, item.id, 1);

    const res = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(user2Token),
    });
    expect(res.status()).toBe(403);
  });

  test("requesting a return twice fails on the second attempt", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);

    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });
    const res = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
    });
    expect(res.status()).toBe(409);
  });

  test("non-admin cannot list pending return requests", async ({ request }) => {
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const res = await request.get("/admin/rentals/return-requests", {
      headers: authHeader(userToken),
    });
    expect(res.status()).toBe(403);
  });

  test("admin can see a requested return in the pending list", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);
    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.get("/admin/rentals/return-requests?limit=100", {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.data.some((b: any) => b.id === booking.id)).toBe(true);
  });

  test("confirming a 'good' return with no fine restores stock", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 2);
    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: { condition: "good" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()).data;
    expect(body.fine).toBeNull();

    const equipmentRes = await request.get(`/equipments/${item.id}`);
    expect((await equipmentRes.json()).data.quantity).toBe(5);
  });

  test("confirming a 'damaged' return charges the damage fee and restores stock", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 1);
    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: { condition: "damaged", damageFee: 50 },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()).data;
    expect(body.fine.totalFine).toBe(50);

    const equipmentRes = await request.get(`/equipments/${item.id}`);
    expect((await equipmentRes.json()).data.quantity).toBe(5);
  });

  test("rejects a damage fee above 1.5x the equipment price", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 1);
    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: { condition: "damaged", damageFee: 200 },
    });
    expect(res.status()).toBe(400);
  });

  test("confirming a 'lost' item charges full replacement cost and does not restore stock", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 2);
    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: { condition: "lost" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()).data;
    expect(body.fine.totalFine).toBe(200); // 2 * 100

    const equipmentRes = await request.get(`/equipments/${item.id}`);
    expect((await equipmentRes.json()).data.quantity).toBe(3); // stock NOT restored
  });

  test("confirming a booking that is not 'return_requested' fails", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);
    // never requested a return

    const res = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: { condition: "good" },
    });
    expect(res.status()).toBe(409);
  });

  test("admin can reject a return request, reverting it to active", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);
    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.post(`/admin/rentals/${booking.id}/reject-return`, {
      headers: authHeader(adminToken),
      data: { rejectionReason: "Wrong item returned" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("active");
  });

  test("rejecting a return without a reason fails validation", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);
    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.post(`/admin/rentals/${booking.id}/reject-return`, {
      headers: authHeader(adminToken),
      data: { rejectionReason: "" },
    });
    expect(res.status()).toBe(400);
  });
});
