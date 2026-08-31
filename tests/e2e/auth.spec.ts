import { test, expect } from "@playwright/test";
import { mockUsers } from "./fixtures.js";

test.describe("Auth API", () => {
  test("POST /auth/login succeeds with correct credentials", async ({ request }) => {
    const res = await request.post("/auth/login", {
      data: { email: mockUsers.user1.email, password: mockUsers.user1.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.token).toBeTruthy();
    expect(body.data.email).toBe(mockUsers.user1.email);
  });

  test("POST /auth/login fails with the wrong password", async ({ request }) => {
    const res = await request.post("/auth/login", {
      data: { email: mockUsers.user1.email, password: "wrong-password" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /auth/login fails for a non-existent email", async ({ request }) => {
    const res = await request.post("/auth/login", {
      data: { email: "nobody-e2e@yopmail.com", password: "whatever123" },
    });
    expect(res.status()).toBe(404);
  });

  test("POST /auth/login rejects a malformed email with a validation error", async ({ request }) => {
    const res = await request.post("/auth/login", {
      data: { email: "not-an-email", password: "x" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /auth/forgot-password rejects a malformed email", async ({ request }) => {
    const res = await request.post("/auth/forgot-password", { data: { email: "bad" } });
    expect(res.status()).toBe(400);
  });

  test("POST /auth/forgot-password 404s for a non-existent account", async ({ request }) => {
    const res = await request.post("/auth/forgot-password", {
      data: { email: "nobody-e2e@yopmail.com" },
    });
    expect(res.status()).toBe(404);
  });

  test("POST /auth/signup/initiate accepts a brand-new email", async ({ request }) => {
    const res = await request.post("/auth/signup/initiate", {
      data: {
        name: "New Signup",
        email: `new-signup-${Date.now()}@yopmail.com`,
        password: "longenough1",
      },
    });
    expect(res.status()).toBe(200);
  });

  test("POST /auth/signup/initiate rejects an email that already has an account", async ({ request }) => {
    const res = await request.post("/auth/signup/initiate", {
      data: { name: "Dup", email: mockUsers.user1.email, password: "longenough1" },
    });
    expect(res.status()).toBe(409);
  });

  test("POST /auth/signup/resend 400s when there is no pending signup", async ({ request }) => {
    const res = await request.post("/auth/signup/resend", {
      data: { email: `no-pending-${Date.now()}@yopmail.com` },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /auth/signup/verify 400s for an unknown/expired session", async ({ request }) => {
    const res = await request.post("/auth/signup/verify", {
      data: { email: `no-session-${Date.now()}@yopmail.com`, otp: "1234" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /auth/reset-password 400s for an invalid token", async ({ request }) => {
    const res = await request.post("/auth/reset-password", {
      data: { password: "longenough1", token: "not-a-real-token" },
    });
    expect(res.status()).toBe(400);
  });
});
