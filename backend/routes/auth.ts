import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, refreshTokens } from "../db/schema";
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "../types";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/jwt";
import { logActivity } from "../utils/logger";
import { authMiddleware } from "../middleware/auth";

const auth = new Hono();

// Login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const ipAddress = c.req.header("x-forwarded-for") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      await logActivity({
        userName: email,
        action: "LOGIN_FAILED",
        details: "ไม่พบอีเมลในระบบ",
        ipAddress,
        userAgent,
      });
      return c.json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
    }

    if (!user.isActive) {
      await logActivity({
        userId: user.id,
        userName: user.fullName,
        action: "LOGIN_FAILED",
        details: "บัญชีถูกระงับ",
        ipAddress,
        userAgent,
      });
      return c.json({ success: false, message: "บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ" }, 403);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logActivity({
        userId: user.id,
        userName: user.fullName,
        action: "LOGIN_FAILED",
        details: "รหัสผ่านไม่ถูกต้อง",
        ipAddress,
        userAgent,
      });
      return c.json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await logActivity({
      userId: user.id,
      userName: user.fullName,
      action: "LOGIN",
      details: "เข้าสู่ระบบสำเร็จ",
      ipAddress,
      userAgent,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ success: false, message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }, 500);
  }
});

// Refresh token
auth.post("/refresh", zValidator("json", refreshTokenSchema), async (c) => {
  const { refreshToken: token } = c.req.valid("json");

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(token);
    if (!payload) {
      return c.json({ success: false, message: "Refresh token ไม่ถูกต้อง" }, 401);
    }

    // Check if token exists in database
    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return c.json({ success: false, message: "Refresh token หมดอายุ" }, 401);
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user || !user.isActive) {
      return c.json({ success: false, message: "ผู้ใช้ไม่พบหรือถูกระงับ" }, 401);
    }

    // Delete old refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Save new refresh token
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    return c.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
  }
});

// Logout
auth.post("/logout", authMiddleware, async (c) => {
  const user = c.get("user");
  const ipAddress = c.req.header("x-forwarded-for") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";

  try {
    // Delete all refresh tokens for user
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.userId));

    await logActivity({
      userId: user.userId,
      userName: user.fullName,
      action: "LOGOUT",
      details: "ออกจากระบบสำเร็จ",
      ipAddress,
      userAgent,
    });

    return c.json({ success: true, message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
  }
});

// Get current user
auth.get("/me", authMiddleware, async (c) => {
  const userPayload = c.get("user");

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userPayload.userId),
    });

    if (!user) {
      return c.json({ success: false, message: "ไม่พบผู้ใช้" }, 404);
    }

    const { password: _, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
  }
});

// Change password (for logged in user)
auth.post(
  "/change-password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const userPayload = c.get("user");
    const { currentPassword, newPassword } = c.req.valid("json");
    const ipAddress = c.req.header("x-forwarded-for") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userPayload.userId),
      });

      if (!user) {
        return c.json({ success: false, message: "ไม่พบผู้ใช้" }, 404);
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        await logActivity({
          userId: user.id,
          userName: user.fullName,
          action: "CHANGE_PASSWORD_FAILED",
          details: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
          ipAddress,
          userAgent,
        });
        return c.json({ success: false, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      await logActivity({
        userId: user.id,
        userName: user.fullName,
        action: "CHANGE_PASSWORD",
        details: "เปลี่ยนรหัสผ่านสำเร็จ",
        ipAddress,
        userAgent,
      });

      return c.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (error) {
      console.error("Change password error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
    }
  }
);

export default auth;