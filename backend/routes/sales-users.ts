import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, or, and, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const salesUsersRouter = new Hono();

// Middleware - ทุก route ต้อง login
salesUsersRouter.use("/*", authMiddleware);

// Get all sales users (role: sales, salescoordinator)
// ใช้สำหรับ dropdown เลือก Sale Owner ในฟอร์มจอง
salesUsersRouter.get("/", async (c) => {
  try {
    const salesUsersList = await db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        department: users.department,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          or(
            eq(users.role, "sales"),
            eq(users.role, "salescoordinator")
          ),
          eq(users.isActive, true) // เอาเฉพาะ user ที่ active
        )
      )
      .orderBy(asc(users.fullName));

    return c.json({
      success: true,
      data: salesUsersList,
    });
  } catch (error) {
    console.error("Get sales users error:", error);
    return c.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล Sales" },
      500
    );
  }
});

// Get single sales user by ID
salesUsersRouter.get("/:id", async (c) => {
  const { id } = c.req.param();

  try {
    const [salesUser] = await db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        department: users.department,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.id, id),
          or(
            eq(users.role, "sales"),
            eq(users.role, "salescoordinator")
          )
        )
      )
      .limit(1);

    if (!salesUser) {
      return c.json(
        { success: false, message: "ไม่พบข้อมูล Sales User" },
        404
      );
    }

    return c.json({
      success: true,
      data: salesUser,
    });
  } catch (error) {
    console.error("Get sales user error:", error);
    return c.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      500
    );
  }
});

export { salesUsersRouter };