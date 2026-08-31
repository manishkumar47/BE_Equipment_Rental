import { test, expect } from "@playwright/test";

test.describe("Category API", () => {
  test("GET /category/all returns the seeded categories", async ({ request }) => {
    const res = await request.get("/category/all");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const names = body.data.map((c: any) => c.name);
    expect(names).toEqual(expect.arrayContaining(["Power Tools", "Photography"]));
  });
});
