import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { eq, and, or, ilike, desc, asc, sql, count } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import {
  createUserSchema,
  updateUserSchema,
  adminResetPasswordSchema,
  paginationSchema,
  idParamSchema,
} from "../types";
import { logActivity } from "../utils/logger";
import { authMiddleware, adminOnly, managerAndAbove } from "../middleware/auth";

const usersRouter = new Hono();

// Apply auth middleware to all routes
usersRouter.use("*", authMiddleware);

// Get all users (admin and manager)
usersRouter.get(
  "/",
  managerAndAbove,
  zValidator("query", paginationSchema),
  async (c) => {
    const { page, limit, search, role, isActive, sortBy, sortOrder } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            ilike(users.fullName, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.department || "", `%${search}%`)
          )
        );
      }
      
      if (role) {
        conditions.push(eq(users.role, role));
      }
      
      if (typeof isActive === "boolean") {
        conditions.push(eq(users.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get sort column
      const sortColumn = {
        createdAt: users.createdAt,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      }[sortBy || "createdAt"];

      const orderFunc = sortOrder === "asc" ? asc : desc;

      // Get users
      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          department: users.department,
          phone: users.phone,
          avatar: users.avatar,
          isActive: users.isActive,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(orderFunc(sortColumn))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(users)
        .where(whereClause);

      return c.json({
        success: true,
        data: {
          users: usersList,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" }, 500);
    }
  }
);

// Get single user
usersRouter.get(
  "/:id",
  managerAndAbove,
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
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
      console.error("Get user error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
    }
  }
);

// Create user (admin only)
usersRouter.post(
  "/",
  adminOnly,
  zValidator("json", createUserSchema),
  async (c) => {
    const input = c.req.valid("json");
    const currentUser = c.get("user");
    const ipAddress = c.req.header("x-forwarded-for") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      // Check if email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        return c.json({ success: false, message: "อีเมลนี้ถูกใช้งานแล้ว" }, 400);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          ...input,
          password: hashedPassword,
        })
        .returning();

      await logActivity({
        userId: currentUser.userId,
        userName: currentUser.fullName,
        action: "CREATE_USER",
        details: `สร้างผู้ใช้ใหม่: ${newUser.fullName} (${newUser.email})`,
        ipAddress,
        userAgent,
      });

      const { password: _, ...userWithoutPassword } = newUser;

      return c.json(
        {
          success: true,
          message: "สร้างผู้ใช้สำเร็จ",
          data: userWithoutPassword,
        },
        201
      );
    } catch (error) {
      console.error("Create user error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาดในการสร้างผู้ใช้" }, 500);
    }
  }
);

// Update user (admin only)
usersRouter.put(
  "/:id",
  adminOnly,
  zValidator("param", idParamSchema),
  zValidator("json", updateUserSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const currentUser = c.get("user");
    const ipAddress = c.req.header("x-forwarded-for") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!existingUser) {
        return c.json({ success: false, message: "ไม่พบผู้ใช้" }, 404);
      }

      // Check if email is being changed and if it's already in use
      if (input.email && input.email !== existingUser.email) {
        const emailExists = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });
        if (emailExists) {
          return c.json({ success: false, message: "อีเมลนี้ถูกใช้งานแล้ว" }, 400);
        }
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      await logActivity({
        userId: currentUser.userId,
        userName: currentUser.fullName,
        action: "UPDATE_USER",
        details: `แก้ไขข้อมูลผู้ใช้: ${updatedUser.fullName} (${updatedUser.email})`,
        ipAddress,
        userAgent,
      });

      const { password: _, ...userWithoutPassword } = updatedUser;

      return c.json({
        success: true,
        message: "แก้ไขข้อมูลสำเร็จ",
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error("Update user error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" }, 500);
    }
  }
);

// Delete user (admin only)
usersRouter.delete(
  "/:id",
  adminOnly,
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const currentUser = c.get("user");
    const ipAddress = c.req.header("x-forwarded-for") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      // Prevent self-deletion
      if (id === currentUser.userId) {
        return c.json({ success: false, message: "ไม่สามารถลบบัญชีตัวเองได้" }, 400);
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!existingUser) {
        return c.json({ success: false, message: "ไม่พบผู้ใช้" }, 404);
      }

      await db.delete(users).where(eq(users.id, id));

      await logActivity({
        userId: currentUser.userId,
        userName: currentUser.fullName,
        action: "DELETE_USER",
        details: `ลบผู้ใช้: ${existingUser.fullName} (${existingUser.email})`,
        ipAddress,
        userAgent,
      });

      return c.json({ success: true, message: "ลบผู้ใช้สำเร็จ" });
    } catch (error) {
      console.error("Delete user error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาดในการลบผู้ใช้" }, 500);
    }
  }
);

// Reset user password (admin only)
usersRouter.post(
  "/:id/reset-password",
  adminOnly,
  zValidator("param", idParamSchema),
  zValidator("json", adminResetPasswordSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { newPassword } = c.req.valid("json");
    const currentUser = c.get("user");
    const ipAddress = c.req.header("x-forwarded-for") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!existingUser) {
        return c.json({ success: false, message: "ไม่พบผู้ใช้" }, 404);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, id));

      await logActivity({
        userId: currentUser.userId,
        userName: currentUser.fullName,
        action: "RESET_PASSWORD",
        details: `รีเซ็ตรหัสผ่านผู้ใช้: ${existingUser.fullName} (${existingUser.email})`,
        ipAddress,
        userAgent,
      });

      return c.json({ success: true, message: "รีเซ็ตรหัสผ่านสำเร็จ" });
    } catch (error) {
      console.error("Reset password error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
    }
  }
);

// Toggle user active status (admin only)
usersRouter.post(
  "/:id/toggle-active",
  adminOnly,
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const currentUser = c.get("user");
    const ipAddress = c.req.header("x-forwarded-for") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      // Prevent self-deactivation
      if (id === currentUser.userId) {
        return c.json({ success: false, message: "ไม่สามารถระงับบัญชีตัวเองได้" }, 400);
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!existingUser) {
        return c.json({ success: false, message: "ไม่พบผู้ใช้" }, 404);
      }

      const newStatus = !existingUser.isActive;

      await db
        .update(users)
        .set({ isActive: newStatus, updatedAt: new Date() })
        .where(eq(users.id, id));

      await logActivity({
        userId: currentUser.userId,
        userName: currentUser.fullName,
        action: newStatus ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        details: `${newStatus ? "เปิดใช้งาน" : "ระงับ"}ผู้ใช้: ${existingUser.fullName} (${existingUser.email})`,
        ipAddress,
        userAgent,
      });

      return c.json({
        success: true,
        message: newStatus ? "เปิดใช้งานผู้ใช้สำเร็จ" : "ระงับผู้ใช้สำเร็จ",
        data: { isActive: newStatus },
      });
    } catch (error) {
      console.error("Toggle active error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
    }
  }
);

export default usersRouter;