import { describe, it, expect } from "vitest";
import { AppError } from "./appError.js";

describe("AppError", () => {
  it("is an instance of Error", () => {
    const err = new AppError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
  });

  it("stores the status code and message", () => {
    const err = new AppError(409, "Conflict occurred");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Conflict occurred");
  });

  it("can be thrown and caught with its properties intact", () => {
    const throwIt = () => {
      throw new AppError(400, "Bad request");
    };

    expect(throwIt).toThrow("Bad request");
    try {
      throwIt();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
    }
  });
});
