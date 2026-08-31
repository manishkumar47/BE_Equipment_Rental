import { describe, test, expect } from "vitest";
import add from "./helper.js";

describe("add", () => {
    test("should add two numbers", () => {
        const result = add(2, 3);
        expect(result).toBe(5);
    });
});
