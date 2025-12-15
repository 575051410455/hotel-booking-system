import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { bookings, roomTypes, blackoutDates, minimumStayRules } from "../db/schema";
import { eq, and, or, gte, lte, lt, gt, ne, sql, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const availabilityRouter = new Hono();

// Middleware - ทุก route ต้อง login
availabilityRouter.use("/*", authMiddleware);

// Schema for checking availability
const checkAvailabilitySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  roomTypeId: z.string().optional(),
  roomTypeName: z.string().optional(),
  numberOfRooms: z.number().min(1).default(1),
}).refine(data => data.roomTypeId || data.roomTypeName, {
  message: "Either roomTypeId or roomTypeName is required",
});

// Schema for detailed availability check
const detailedAvailabilitySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  roomTypeId: z.string().optional(),
  roomTypeName: z.string().optional(),
  numberOfRooms: z.number().min(1).default(1),
}).refine(data => data.roomTypeId || data.roomTypeName, {
  message: "Either roomTypeId or roomTypeName is required",
});

// Helper function: Get dates between two dates
function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Helper function: Calculate booked rooms for a specific date and room type
async function getBookedRoomsForDate(
  date: string, 
  roomTypeName: string
): Promise<number> {
  const result = await db
    .select({
      totalBooked: sql<number>`COALESCE(SUM(${bookings.numberOfRooms}), 0)`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.roomType, roomTypeName),
        lte(bookings.checkIn, date),
        gt(bookings.checkOut, date),
        or(
          eq(bookings.status, "PENDING"),
          eq(bookings.status, "CONFIRMED")
        )
      )
    );

  return Number(result[0]?.totalBooked || 0);
}

// GET /api/availability/check - Quick availability check
availabilityRouter.post(
  "/check",
  zValidator("json", checkAvailabilitySchema),
  async (c) => {
    const { checkIn, checkOut, roomTypeId, roomTypeName, numberOfRooms } = c.req.valid("json");

    try {
      // Get room type
      let roomType;
      if (roomTypeId) {
        [roomType] = await db
          .select()
          .from(roomTypes)
          .where(eq(roomTypes.id, roomTypeId))
          .limit(1);
      } else if (roomTypeName) {
        [roomType] = await db
          .select()
          .from(roomTypes)
          .where(eq(roomTypes.name, roomTypeName))
          .limit(1);
      }

      if (!roomType) {
        return c.json({ success: false, message: "ไม่พบประเภทห้องที่ระบุ" }, 404);
      }

      // Check each date in range
      const dates = getDatesBetween(checkIn, checkOut);
      let minAvailable = roomType.totalRooms;

      for (const date of dates) {
        const bookedRooms = await getBookedRoomsForDate(date, roomType.name);
        const available = roomType.totalRooms - bookedRooms;
        if (available < minAvailable) {
          minAvailable = available;
        }
      }

      return c.json({
        success: true,
        data: {
          roomType: roomType.name,
          totalRooms: roomType.totalRooms,
          available: minAvailable,
          requested: numberOfRooms,
          hasAvailability: minAvailable >= numberOfRooms,
        },
      });
    } catch (error) {
      console.error("Check availability error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบ" }, 500);
    }
  }
);

// POST /api/availability/detailed - Detailed availability check with daily breakdown
availabilityRouter.post(
  "/detailed",
  zValidator("json", detailedAvailabilitySchema),
  async (c) => {
    const { checkIn, checkOut, roomTypeId, roomTypeName, numberOfRooms } = c.req.valid("json");

    try {
      // Validate dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (checkInDate >= checkOutDate) {
        return c.json({ 
          success: false, 
          message: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน" 
        }, 400);
      }

      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get room type
      let roomType;
      if (roomTypeId) {
        [roomType] = await db
          .select()
          .from(roomTypes)
          .where(eq(roomTypes.id, roomTypeId))
          .limit(1);
      } else if (roomTypeName) {
        [roomType] = await db
          .select()
          .from(roomTypes)
          .where(eq(roomTypes.name, roomTypeName))
          .limit(1);
      }

      if (!roomType) {
        return c.json({ success: false, message: "ไม่พบประเภทห้องที่ระบุ" }, 404);
      }

      // Check blackout dates
      const allBlackoutDates = await db
        .select()
        .from(blackoutDates)
        .where(
          and(
            gte(blackoutDates.date, checkIn),
            lt(blackoutDates.date, checkOut)
          )
        );

      const blockedDates = allBlackoutDates.map(d => d.date);

      // Check minimum stay rules
      const applicableRules = await db
        .select()
        .from(minimumStayRules)
        .where(
          and(
            lte(minimumStayRules.startDate, checkIn),
            gte(minimumStayRules.endDate, checkIn)
          )
        );

      let minStayViolation: { required: number; actual: number } | null = null;
      for (const rule of applicableRules) {
        if (nights < rule.minNights) {
          minStayViolation = {
            required: rule.minNights,
            actual: nights,
          };
          break;
        }
      }

      // Calculate daily availability
      const dates = getDatesBetween(checkIn, checkOut);
      const dailyAvailability: { date: string; available: number; isBlocked: boolean }[] = [];
      let minAvailable = roomType.totalRooms;

      for (const date of dates) {
        const bookedRooms = await getBookedRoomsForDate(date, roomType.name);
        const available = roomType.totalRooms - bookedRooms;
        const isBlocked = blockedDates.includes(date);

        dailyAvailability.push({ date, available, isBlocked });

        if (available < minAvailable) {
          minAvailable = available;
        }
      }

      // Get conflicting bookings if not available
      let conflictingBookings: { bookingId: string; customerName: string; checkIn: string; checkOut: string }[] = [];
      
      if (minAvailable < numberOfRooms) {
        const conflicts = await db
          .select({
            bookingId: bookings.bookingId,
            customerName: bookings.customerName,
            checkIn: bookings.checkIn,
            checkOut: bookings.checkOut,
          })
          .from(bookings)
          .where(
            and(
              eq(bookings.roomType, roomType.name),
              or(
                eq(bookings.status, "PENDING"),
                eq(bookings.status, "CONFIRMED")
              ),
              // Overlapping dates
              lt(bookings.checkIn, checkOut),
              gt(bookings.checkOut, checkIn)
            )
          )
          .orderBy(asc(bookings.checkIn));

        conflictingBookings = conflicts.map(b => ({
          bookingId: b.bookingId,
          customerName: b.customerName,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
        }));
      }

      const hasAvailability = minAvailable >= numberOfRooms && 
                              blockedDates.length === 0 && 
                              !minStayViolation;

      return c.json({
        success: true,
        data: {
          roomType: roomType.name,
          roomTypeId: roomType.id,
          totalRooms: roomType.totalRooms,
          baseRate: roomType.baseRate,
          availableRooms: minAvailable,
          requestedRooms: numberOfRooms,
          nights,
          hasAvailability,
          dailyAvailability,
          blockedDates,
          minStayViolation,
          conflictingBookings: hasAvailability ? [] : conflictingBookings,
        },
      });
    } catch (error) {
      console.error("Detailed availability check error:", error);
      return c.json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบ" }, 500);
    }
  }
);

// GET /api/availability/blackout-dates - Get all blackout dates
availabilityRouter.get("/blackout-dates", async (c) => {
  try {
    const dates = await db
      .select()
      .from(blackoutDates)
      .orderBy(asc(blackoutDates.date));

    return c.json({
      success: true,
      data: dates.map(d => ({
        id: d.id,
        date: d.date,
        reason: d.reason,
      })),
    });
  } catch (error) {
    console.error("Get blackout dates error:", error);
    return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
  }
});

// GET /api/availability/minimum-stay-rules - Get all minimum stay rules
availabilityRouter.get("/minimum-stay-rules", async (c) => {
  try {
    const rules = await db
      .select()
      .from(minimumStayRules)
      .orderBy(asc(minimumStayRules.startDate));

    return c.json({
      success: true,
      data: rules.map(r => ({
        id: r.id,
        startDate: r.startDate,
        endDate: r.endDate,
        minNights: r.minNights,
      })),
    });
  } catch (error) {
    console.error("Get minimum stay rules error:", error);
    return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
  }
});

// GET /api/availability/room-types - Get all room types with current availability for today
availabilityRouter.get("/room-types", async (c) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const allRoomTypes = await db
      .select()
      .from(roomTypes)
      .orderBy(asc(roomTypes.name));

    const roomTypesWithAvailability = await Promise.all(
      allRoomTypes.map(async (rt) => {
        const roomName = rt.name as string;
        const bookedToday = await getBookedRoomsForDate(today, roomName);
        return {
          id: rt.id,
          name: rt.name,
          totalRooms: rt.totalRooms,
          baseRate: rt.baseRate,
          availableToday: rt.totalRooms - bookedToday,
        };
      })
    );

    return c.json({
      success: true,
      data: roomTypesWithAvailability,
    });
  } catch (error) {
    console.error("Get room types error:", error);
    return c.json({ success: false, message: "เกิดข้อผิดพลาด" }, 500);
  }
});

export { availabilityRouter };