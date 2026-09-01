import { test, expect } from "@playwright/test";
import {
  mockUsers,
  login,
  authHeader,
  createTestEquipment,
  createTestBooking,
  createBookingRequest,
  futureIso,
} from "./fixtures.js";

test.describe("Rental Bookings API", () => {
  test("creating a booking decrements equipment stock", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });

    const createRes = await request.post("/rental-bookings", {
      headers: authHeader(userToken),
      data: {
        equipmentId: item.id,
        quantity: 2,
        rentFrom: futureIso(60 * 60 * 1000),
        rentTo: futureIso(2 * 60 * 60 * 1000),
      },
    });
    expect(createRes.status()).toBe(201);

    const getRes = await request.get(`/equipments/${item.id}`);
    expect((await getRes.json()).data.quantity).toBe(3);
  });

  test("rejects a booking that exceeds available stock", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 1 });

    const res = await request.post("/rental-bookings", {
      headers: authHeader(userToken),
      data: {
        equipmentId: item.id,
        quantity: 2,
        rentFrom: futureIso(60 * 60 * 1000),
        rentTo: futureIso(2 * 60 * 60 * 1000),
      },
    });
    expect(res.status()).toBe(409);
  });

  test("rejects a booking for non-existent equipment", async ({ request }) => {
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const res = await request.post("/rental-bookings", {
      headers: authHeader(userToken),
      data: {
        equipmentId: 999999999,
        quantity: 1,
        rentFrom: futureIso(60 * 60 * 1000),
        rentTo: futureIso(2 * 60 * 60 * 1000),
      },
    });
    expect(res.status()).toBe(404);
  });

  test("rejects a booking with rentFrom in the past (validation)", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });

    const res = await request.post("/rental-bookings", {
      headers: authHeader(userToken),
      data: {
        equipmentId: item.id,
        quantity: 1,
        rentFrom: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        rentTo: futureIso(60 * 60 * 1000),
      },
    });
    expect(res.status()).toBe(400);
  });

  test("creating a booking without auth is unauthorized", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });

    const res = await request.post("/rental-bookings", {
      data: {
        equipmentId: item.id,
        quantity: 1,
        rentFrom: futureIso(60 * 60 * 1000),
        rentTo: futureIso(2 * 60 * 60 * 1000),
      },
    });
    expect(res.status()).toBe(401);
  });

  test("a user cannot view another user's booking", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const user1Token = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const user2Token = await login(request, mockUsers.user2.email, mockUsers.user2.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });

    const booking = await createTestBooking(request, user1Token, item.id, 1);

    const res = await request.get(`/rental-bookings/${booking.id}`, {
      headers: authHeader(user2Token),
    });
    expect(res.status()).toBe(403);
  });

  test("an admin can view any user's booking", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);

    const res = await request.get(`/rental-bookings/${booking.id}`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(200);
  });

  test("deleting a still-requested (unapproved) booking restores equipment stock", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createBookingRequest(request, userToken, item.id, 2);

    const midRes = await request.get(`/equipments/${item.id}`);
    expect((await midRes.json()).data.quantity).toBe(3);

    const deleteRes = await request.delete(`/rental-bookings/${booking.id}`, {
      headers: authHeader(userToken),
    });
    expect(deleteRes.status()).toBe(200);

    const afterRes = await request.get(`/equipments/${item.id}`);
    expect((await afterRes.json()).data.quantity).toBe(5);
  });

  test("deleting an active (approved, not yet returned) booking is blocked", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 2);
    expect(booking.status).toBe("active");

    const deleteRes = await request.delete(`/rental-bookings/${booking.id}`, {
      headers: authHeader(userToken),
    });
    expect(deleteRes.status()).toBe(409);

    // Equipment stays checked out — deletion must not silently release it.
    const afterRes = await request.get(`/equipments/${item.id}`);
    expect((await afterRes.json()).data.quantity).toBe(3);
  });

  test("GET /rental-bookings/my returns only the caller's bookings", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);

    const res = await request.get("/rental-bookings/my", { headers: authHeader(userToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.some((b: any) => b.id === booking.id)).toBe(true);
  });

  test("GET /rental-bookings as admin returns all bookings", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createTestBooking(request, userToken, item.id, 1);

    const res = await request.get("/rental-bookings", { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.some((b: any) => b.id === booking.id)).toBe(true);
  });
});
