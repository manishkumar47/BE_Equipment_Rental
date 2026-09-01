import { test, expect } from "@playwright/test";
import {
  mockUsers,
  login,
  authHeader,
  createTestEquipment,
  createBookingRequest,
} from "./fixtures.js";

test.describe("Booking Requests API", () => {
  test("a new booking starts as 'requested', not 'active'", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });

    const booking = await createBookingRequest(request, userToken, item.id, 1);
    expect(booking.status).toBe("requested");
  });

  test("a return-request cannot be made until the booking is approved", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createBookingRequest(request, userToken, item.id, 1);

    const res = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
    });
    expect(res.status()).toBe(409);
  });

  test("non-admin cannot list, approve, or reject booking requests", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createBookingRequest(request, userToken, item.id, 1);

    const listRes = await request.get("/admin/rental-bookings/requests", {
      headers: authHeader(userToken),
    });
    expect(listRes.status()).toBe(403);

    const approveRes = await request.post(`/admin/rental-bookings/${booking.id}/approve`, {
      headers: authHeader(userToken),
    });
    expect(approveRes.status()).toBe(403);

    const rejectRes = await request.post(`/admin/rental-bookings/${booking.id}/reject`, {
      headers: authHeader(userToken),
      data: { rejectionReason: "test" },
    });
    expect(rejectRes.status()).toBe(403);
  });

  test("admin sees a new request in the pending list", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createBookingRequest(request, userToken, item.id, 1);

    const res = await request.get("/admin/rental-bookings/requests?limit=100", {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.data.some((b: any) => b.id === booking.id)).toBe(true);
  });

  test("approving a request activates it and auto-assigns a tracked unit when available", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });

    await request.post(`/equipments/${item.id}/items`, {
      headers: authHeader(adminToken),
      data: { serialNumber: `APPROVE-${Date.now()}` },
    });

    const before = await request.get(`/equipments/${item.id}`);
    expect((await before.json()).data.availableItemCount).toBe(1);

    const booking = await createBookingRequest(request, userToken, item.id, 1);

    const approveRes = await request.post(`/admin/rental-bookings/${booking.id}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(approveRes.status()).toBe(200);
    expect((await approveRes.json()).data.status).toBe("active");

    const after = await request.get(`/equipments/${item.id}`);
    expect((await after.json()).data.availableItemCount).toBe(0);
  });

  test("approving a request with no tracked units still activates it", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createBookingRequest(request, userToken, item.id, 1);

    const res = await request.post(`/admin/rental-bookings/${booking.id}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("active");
  });

  test("approving an already-processed request fails", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createBookingRequest(request, userToken, item.id, 1);

    await request.post(`/admin/rental-bookings/${booking.id}/approve`, {
      headers: authHeader(adminToken),
    });
    const res = await request.post(`/admin/rental-bookings/${booking.id}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(409);
  });

  test("rejecting a request restores the reserved stock", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });

    const booking = await createBookingRequest(request, userToken, item.id, 2);

    const midRes = await request.get(`/equipments/${item.id}`);
    expect((await midRes.json()).data.quantity).toBe(3);

    const rejectRes = await request.post(`/admin/rental-bookings/${booking.id}/reject`, {
      headers: authHeader(adminToken),
      data: { rejectionReason: "Equipment needed for maintenance" },
    });
    expect(rejectRes.status()).toBe(200);
    expect((await rejectRes.json()).data.status).toBe("rejected");

    const afterRes = await request.get(`/equipments/${item.id}`);
    expect((await afterRes.json()).data.quantity).toBe(5);
  });

  test("rejecting without a reason fails validation", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipment(request, adminToken, { quantity: 5 });
    const booking = await createBookingRequest(request, userToken, item.id, 1);

    const res = await request.post(`/admin/rental-bookings/${booking.id}/reject`, {
      headers: authHeader(adminToken),
      data: { rejectionReason: "" },
    });
    expect(res.status()).toBe(400);
  });
});
