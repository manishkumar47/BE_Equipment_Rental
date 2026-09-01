import type { APIRequestContext } from "@playwright/test";
import { mockUsers } from "../../src/database/seed/mockData.js";

export { mockUsers };

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post("/auth/login", { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.token as string;
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function getCategoryId(
  request: APIRequestContext,
  name?: string,
): Promise<number> {
  const res = await request.get("/category/all");
  const body = await res.json();
  const category = name ? body.data.find((c: any) => c.name === name) : body.data[0];
  if (!category) throw new Error(`Seed category '${name}' not found`);
  return category.id as number;
}

export async function createTestEquipment(
  request: APIRequestContext,
  adminToken: string,
  overrides: { quantity: number; price?: number; categoryName?: string },
): Promise<{ id: number; quantity: number; price: number }> {
  const categoryId = await getCategoryId(request, overrides.categoryName);
  const res = await request.post("/equipments", {
    headers: authHeader(adminToken),
    data: {
      name: `E2E Fixture Item ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      price: overrides.price ?? 100,
      quantity: overrides.quantity,
      categoryId,
    },
  });
  const body = await res.json();
  return body.data;
}

export function futureIso(msFromNow: number): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

/** Creates a booking request (status 'requested') without approving it. */
export async function createBookingRequest(
  request: APIRequestContext,
  userToken: string,
  equipmentId: number,
  quantity: number,
): Promise<{ id: number; status: string }> {
  const res = await request.post("/rental-bookings", {
    headers: authHeader(userToken),
    data: {
      equipmentId,
      quantity,
      rentFrom: futureIso(60 * 60 * 1000),
      rentTo: futureIso(2 * 60 * 60 * 1000),
    },
  });
  const body = await res.json();
  return body.data;
}

/**
 * Creates a booking and immediately admin-approves it, matching the real
 * request -> approve -> active flow. Used by tests that need an already
 * -active booking (return flow, cancellation, listings) without testing
 * the approval step itself.
 */
export async function createTestBooking(
  request: APIRequestContext,
  userToken: string,
  equipmentId: number,
  quantity: number,
): Promise<{ id: number; status: string }> {
  const booking = await createBookingRequest(request, userToken, equipmentId, quantity);
  const adminToken = await login(request, mockUsers.admin.email, mockUsers.admin.password);
  const approveRes = await request.post(`/admin/rental-bookings/${booking.id}/approve`, {
    headers: authHeader(adminToken),
  });
  const approveBody = await approveRes.json();
  return approveBody.data;
}
