import jwt from "jsonwebtoken";
import type { User } from "../db/schema";
import type { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  fullName: string;
}

export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };

  return jwt.sign(
    payload,
    JWT_SECRET as Secret,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
  );
}

export function generateRefreshToken(user: User): string {
  const payload = {
    userId: user.id,
    type: "refresh",
  };

  return jwt.sign(
    payload,
    JWT_SECRET as Secret,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as SignOptions
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as Secret) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string; type: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET as Secret) as { userId: string; type: string };
    if (payload.type !== "refresh") return null;
    return payload;
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiry(): Date {
  const days = parseInt(REFRESH_TOKEN_EXPIRES_IN.replace("d", ""), 10) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}