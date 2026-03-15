import crypto from "node:crypto";

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function createTokenExpiry(windowMs: number) {
  return new Date(Date.now() + windowMs);
}

export function isExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

