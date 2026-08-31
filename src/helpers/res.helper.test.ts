import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { successResponse, errorResponse } from "./res.helper.js";

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe("res.helper", () => {
  describe("successResponse", () => {
    it("sets the given status code and success:true body", () => {
      const res = mockResponse();

      successResponse(res, { status: 201, message: "Created!", data: { id: 1 } });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Created!",
        data: { id: 1 },
      });
    });

    it("defaults data to null when omitted", () => {
      const res = mockResponse();

      successResponse(res, { status: 200, message: "OK" });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "OK",
        data: null,
      });
    });
  });

  describe("errorResponse", () => {
    it("sets the given status code and success:false body", () => {
      const res = mockResponse();

      errorResponse(res, 404, "Not found");

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not found",
        errors: null,
      });
    });

    it("passes through validation error details when provided", () => {
      const res = mockResponse();

      errorResponse(res, 400, "Validation failed", ["email is required"]);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Validation failed",
        errors: ["email is required"],
      });
    });
  });
});
