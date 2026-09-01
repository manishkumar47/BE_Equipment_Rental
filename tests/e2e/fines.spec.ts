import { test, expect } from "@playwright/test";
import {
  mockUsers,
  login,
  authHeader,
  createTestEquipment,
  createTestBooking,
} from "./fixtures.js";

async function createDamagedReturnFine(request: any, adminToken: string, userToken: string) {
  const item = await createTestEquipment(request, adminToken, { quantity: 5, price: 100 });
  const booking = await createTestBooking(request, userToken, item.id, 1);
  await request.post(`/rentals/${booking.id}/return-request`, { headers: authHeader(userToken) });
  const confirmRes = await request.post(`/admin/rentals/${booking.id}/confirm-return`, {
    headers: authHeader(adminToken),
    data: { condition: "damaged", damageFee: 50 },
  });
  const fine = (await confirmRes.json()).data.fine;
  return fine;
}

test.describe("Fines API", () => {
  test("a damaged return creates a fine with a 5-day due date visible to the user", async ({
    request,
  }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const fine = await createDamagedReturnFine(request, adminToken, userToken);

    const res = await request.get("/fines/my", { headers: authHeader(userToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const mine = body.data.find((f: any) => f.fine.id === fine.id);
    expect(mine).toBeTruthy();
    expect(mine.fine.status).toBe("unpaid");
    expect(mine.fine.dueDate).toBeTruthy();

    const created = new Date(mine.fine.createdAt).getTime();
    const due = new Date(mine.fine.dueDate).getTime();
    const diffDays = Math.round((due - created) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(5);
  });

  test("GET /fines/my without a token is unauthorized", async ({ request }) => {
    const res = await request.get("/fines/my");
    expect(res.status()).toBe(401);
  });

  test("a user can pay their own fine", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const fine = await createDamagedReturnFine(request, adminToken, userToken);

    const res = await request.post(`/fines/${fine.id}/pay`, { headers: authHeader(userToken) });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("paid");
  });

  test("a different user cannot pay someone else's fine", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const otherUserToken = await login(request, mockUsers.user2.email, mockUsers.user2.password);
    const fine = await createDamagedReturnFine(request, adminToken, userToken);

    const res = await request.post(`/fines/${fine.id}/pay`, {
      headers: authHeader(otherUserToken),
    });
    expect(res.status()).toBe(403);
  });

  test("paying an already-paid fine fails", async ({ request }) => {
    const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const fine = await createDamagedReturnFine(request, adminToken, userToken);

    await request.post(`/fines/${fine.id}/pay`, { headers: authHeader(userToken) });
    const res = await request.post(`/fines/${fine.id}/pay`, { headers: authHeader(userToken) });
    expect(res.status()).toBe(409);
  });

  test("paying a non-existent fine 404s", async ({ request }) => {
    const userToken = await login(request, mockUsers.user1.email, mockUsers.user1.password);
    const res = await request.post("/fines/999999999/pay", { headers: authHeader(userToken) });
    expect(res.status()).toBe(404);
  });
});
