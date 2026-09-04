import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import {
  authenticateRequest,
  getUserIdFromToken,
  getTokenPayload,
} from "./auth.helper.js";

const signToken = (
  payload: object,
  secret: string = env.JWT_SECRET,
  options?: jwt.SignOptions,
) => jwt.sign(payload, secret, options);

const mockReq = (authorization?: string): Request => {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) headers.authorization = authorization;
  return {
    get: (name: string) => headers[name.toLowerCase()],
    headers,
  } as unknown as Request;
};

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe("auth.helper", () => {
  describe("authenticateRequest", () => {
    let next: NextFunction;

    beforeEach(() => {
      next = vi.fn();
    });

    it("returns 401 when no Authorization header is present", async () => {
      const req = mockReq();
      const res = mockRes();

      await authenticateRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Not logged in!" }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when the Bearer token is empty", async () => {
      const req = mockReq("Bearer ");
      const res = mockRes();

      await authenticateRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User not authenticated!" }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when jwt.verify resolves without a decoded payload", async () => {
      const token = signToken({ id: 1, role: "USER" });
      const req = mockReq(`Bearer ${token}`);
      const res = mockRes();
      const verifySpy = vi.spyOn(jwt, "verify").mockReturnValue(null as any);

      await authenticateRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid or expired token!" }),
      );
      expect(next).not.toHaveBeenCalled();

      verifySpy.mockRestore();
    });

    it("returns 401 for a malformed/garbage token", async () => {
      const req = mockReq("Bearer not-a-real-jwt");
      const res = mockRes();

      await authenticateRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid or expired token!" }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 for an expired token", async () => {
      const expired = signToken({ id: 1, role: "USER" }, env.JWT_SECRET, {
        expiresIn: "-10s",
      });
      const req = mockReq(`Bearer ${expired}`);
      const res = mockRes();

      await authenticateRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 for a token signed with a different secret", async () => {
      const forged = signToken({ id: 1, role: "ADMIN" }, "some-other-secret");
      const req = mockReq(`Bearer ${forged}`);
      const res = mockRes();

      await authenticateRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("attaches the decoded payload to req.user and calls next() for a valid token", async () => {
      const token = signToken({ id: 42, email: "u@example.com", role: "USER" });
      const req = mockReq(`Bearer ${token}`);
      const res = mockRes();

      await authenticateRequest(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toMatchObject({ id: 42, email: "u@example.com", role: "USER" });
      expect(res.status).not.toHaveBeenCalled();
    });

    it("accepts a raw token without the 'Bearer ' prefix", async () => {
      const token = signToken({ id: 1, role: "USER" });
      const req = mockReq(token);
      const res = mockRes();

      await authenticateRequest(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it("returns 403 when ADMIN is required but the token role is USER", async () => {
      const token = signToken({ id: 1, role: "USER" });
      const req = mockReq(`Bearer ${token}`);
      const res = mockRes();

      await authenticateRequest(req, res, next, "ADMIN");

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Forbidden: Admin access required!" }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next() when ADMIN is required and the token role is ADMIN", async () => {
      const token = signToken({ id: 1, role: "ADMIN" });
      const req = mockReq(`Bearer ${token}`);
      const res = mockRes();

      await authenticateRequest(req, res, next, "ADMIN");

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("getUserIdFromToken", () => {
    it("returns req.user.id directly when already attached", () => {
      const req = mockReq();
      req.user = { id: 7, email: "a@b.com", role: "USER" } as any;

      expect(getUserIdFromToken(req)).toBe(7);
    });

    it("decodes the id from the Authorization header when req.user is absent", () => {
      const token = signToken({ id: 9, role: "USER" });
      const req = mockReq(`Bearer ${token}`);

      expect(getUserIdFromToken(req)).toBe(9);
    });

    it("returns null when there is no Authorization header", () => {
      const req = mockReq();
      expect(getUserIdFromToken(req)).toBeNull();
    });

    it("returns null for an invalid token", () => {
      const req = mockReq("Bearer garbage");
      expect(getUserIdFromToken(req)).toBeNull();
    });

    it("accepts a raw token without the 'Bearer ' prefix", () => {
      const token = signToken({ id: 4, role: "USER" });
      const req = mockReq(token);

      expect(getUserIdFromToken(req)).toBe(4);
    });

    it("falls back to req.headers.authorization when req.get is unavailable", () => {
      const token = signToken({ id: 6, role: "USER" });
      const req = {
        get: () => undefined,
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;

      expect(getUserIdFromToken(req)).toBe(6);
    });

    it("returns null when jwt.verify resolves without a decoded payload", () => {
      const req = mockReq("Bearer some-token");
      const verifySpy = vi.spyOn(jwt, "verify").mockReturnValue(null as any);

      expect(getUserIdFromToken(req)).toBeNull();

      verifySpy.mockRestore();
    });
  });

  describe("getTokenPayload", () => {
    it("returns req.user directly when already attached", () => {
      const req = mockReq();
      const payload = { id: 3, email: "c@d.com", role: "ADMIN" } as any;
      req.user = payload;

      expect(getTokenPayload(req)).toBe(payload);
    });

    it("decodes the payload from the Authorization header when req.user is absent", () => {
      const token = signToken({ id: 5, email: "e@f.com", role: "ADMIN" });
      const req = mockReq(`Bearer ${token}`);

      expect(getTokenPayload(req)).toMatchObject({
        id: 5,
        email: "e@f.com",
        role: "ADMIN",
      });
    });

    it("returns null when there is no Authorization header", () => {
      const req = mockReq();
      expect(getTokenPayload(req)).toBeNull();
    });

    it("returns null for an invalid token", () => {
      const req = mockReq("Bearer garbage");
      expect(getTokenPayload(req)).toBeNull();
    });

    it("accepts a raw token without the 'Bearer ' prefix", () => {
      const token = signToken({ id: 8, email: "g@h.com", role: "USER" });
      const req = mockReq(token);

      expect(getTokenPayload(req)).toMatchObject({ id: 8, email: "g@h.com", role: "USER" });
    });

    it("falls back to req.headers.authorization when req.get is unavailable", () => {
      const token = signToken({ id: 9, email: "i@j.com", role: "USER" });
      const req = {
        get: () => undefined,
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;

      expect(getTokenPayload(req)).toMatchObject({ id: 9, email: "i@j.com", role: "USER" });
    });

    it("returns null when jwt.verify resolves without a decoded payload", () => {
      const req = mockReq("Bearer some-token");
      const verifySpy = vi.spyOn(jwt, "verify").mockReturnValue(null as any);

      expect(getTokenPayload(req)).toBeNull();

      verifySpy.mockRestore();
    });
  });
});
