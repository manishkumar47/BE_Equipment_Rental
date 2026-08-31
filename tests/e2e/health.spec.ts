import { test, expect } from "@playwright/test";

test("GET /health reports ok", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(typeof body.uptime).toBe("number");
});
