import { test, expect } from "@playwright/test";
import {
  mockUsers,
  login,
  authHeader,
  createTestEquipment,
  createTestEquipmentWithUnits,
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

test.describe("Returns API — serialized / per-unit path", () => {
  test("returning fewer than the full quantity leaves the booking active with a remainder", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipmentWithUnits(request, adminToken, { quantity: 5, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 5);

    const requestRes = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
      data: { quantity: 3 },
    });
    expect(requestRes.status()).toBe(200);
    expect((await requestRes.json()).data.status).toBe("return_requested");

    const pendingRes = await request.get("/admin/rentals/return-requests?limit=100", {
      headers: authHeader(adminToken),
    });
    const pendingBody = await pendingRes.json();
    const pendingBooking = pendingBody.data.data.find((b: any) => b.id === booking.id);
    expect(pendingBooking.pendingItems).toHaveLength(3);

    const items = pendingBooking.pendingItems.map((i: any) => ({
      equipmentItemId: i.equipmentItemId,
      condition: "good",
    }));

    const confirmRes = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: { items },
    });
    expect(confirmRes.status()).toBe(200);
    const confirmBody = (await confirmRes.json()).data;
    expect(confirmBody.booking.status).toBe("active"); // 2 units still outstanding
    expect(confirmBody.fine).toBeNull();

    // 3 of 5 restored so far
    const equipmentRes = await request.get(`/equipments/${item.id}`);
    expect((await equipmentRes.json()).data.quantity).toBe(3);

    // Requesting the last 2 should now be allowed (previous group already confirmed)
    const secondRequestRes = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
    });
    expect(secondRequestRes.status()).toBe(200);
  });

  test("a mixed good/damaged/lost return produces one combined itemized fine", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipmentWithUnits(request, adminToken, { quantity: 3, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 3);

    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const pendingRes = await request.get("/admin/rentals/return-requests?limit=100", {
      headers: authHeader(adminToken),
    });
    const pendingBooking = (await pendingRes.json()).data.data.find((b: any) => b.id === booking.id);
    const [unitA, unitB, unitC] = pendingBooking.pendingItems;

    const confirmRes = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: {
        items: [
          { equipmentItemId: unitA.equipmentItemId, condition: "good" },
          { equipmentItemId: unitB.equipmentItemId, condition: "damaged", damageFee: 40 },
          { equipmentItemId: unitC.equipmentItemId, condition: "lost" },
        ],
      },
    });
    expect(confirmRes.status()).toBe(200);
    const body = (await confirmRes.json()).data;

    expect(body.booking.status).toBe("returned"); // all 3 accounted for
    expect(body.fine.totalFine).toBe(140); // 40 damage + 100 replacement

    // good + damaged (2 units) restore stock, lost does not
    const equipmentRes = await request.get(`/equipments/${item.id}`);
    expect((await equipmentRes.json()).data.quantity).toBe(2);
  });

  test("submitting items that don't match the pending set is rejected", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipmentWithUnits(request, adminToken, { quantity: 2, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 2);

    await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });

    const res = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
      headers: authHeader(adminToken),
      data: { items: [{ equipmentItemId: 999999, condition: "good" }] },
    });
    expect(res.status()).toBe(400);
  });

  test("cannot submit a second return request while one is already pending", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipmentWithUnits(request, adminToken, { quantity: 5, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 5);

    await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
      data: { quantity: 2 },
    });

    const res = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
      data: { quantity: 1 },
    });
    expect(res.status()).toBe(409);
  });

  test("rejecting a partial return un-pends those units so they can be requested again", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipmentWithUnits(request, adminToken, { quantity: 4, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 4);

    await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
      data: { quantity: 2 },
    });

    const rejectRes = await request.post(`/admin/rentals/${booking.id}/reject-return`, {
      headers: authHeader(adminToken),
      data: { rejectionReason: "Please bring them in person for inspection" },
    });
    expect(rejectRes.status()).toBe(200);
    expect((await rejectRes.json()).data.status).toBe("active");

    // All 4 should be requestable again (none were actually returned)
    const secondRequestRes = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
    });
    expect(secondRequestRes.status()).toBe(200);

    const pendingRes = await request.get("/admin/rentals/return-requests?limit=100", {
      headers: authHeader(adminToken),
    });
    const pendingBooking = (await pendingRes.json()).data.data.find((b: any) => b.id === booking.id);
    expect(pendingBooking.pendingItems).toHaveLength(4);
  });

  test("requesting more than the outstanding quantity is rejected", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const item = await createTestEquipmentWithUnits(request, adminToken, { quantity: 2, price: 100 });
    const booking = await createTestBooking(request, userToken, item.id, 2);

    const res = await request.post(`/rentals/${booking.id}/return-request`, {
      headers: authHeader(userToken),
      data: { quantity: 5 },
    });
    expect(res.status()).toBe(400);
  });
});
