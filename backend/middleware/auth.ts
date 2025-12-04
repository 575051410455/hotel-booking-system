import { Context, Next } from "hono";
import { verifyToken, JWTPayload } from "../utils/jwt";

// Extend Hono context
declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "กรุณาเข้าสู่ระบบ" }, 401);
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ success: false, message: "Token ไม่ถูกต้องหรือหมดอายุ" }, 401);
  }

  c.set("user", payload);
  await next();
}

// Role-based access control middleware
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ success: false, message: "กรุณาเข้าสู่ระบบ" }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ success: false, message: "คุณไม่มีสิทธิ์ในการเข้าถึง" }, 403);
    }

    await next();
  };
}

// Admin only middleware
export const adminOnly = requireRole("admin");

// Manager and above middleware
export const managerAndAbove = requireRole("admin", "manager");

// Staff and above middleware
export const staffAndAbove = requireRole("admin", "manager", "staff");