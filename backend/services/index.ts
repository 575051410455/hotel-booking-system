import { db } from '../db';
import { bookings, roomTypes, blackoutDates, minimumStayRules } from '../db/schema';
import { eq, and, gte, lte, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { CreateBookingInput, UpdateBookingInput, CancelBookingInput, AmendBookingInput } from '../types';

export class BookingService {
  // Generate unique booking ID
  generateBookingId(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BK${year}${random}`;
  }

  // Check room availability
  async checkAvailability(checkIn: string, checkOut: string, roomType: string, excludeBookingId?: string): Promise<number> {
    const roomTypeInfo = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.name, roomType))
      .limit(1);

    if (!roomTypeInfo.length) {
      throw new Error('Room type not found');
    }

    const totalRooms = roomTypeInfo[0].totalRooms;

    // Get all bookings that overlap with the requested dates
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomType, roomType),
          or(
            eq(bookings.status, 'PENDING'),
            eq(bookings.status, 'CONFIRMED')
          ),
          sql`${bookings.checkIn} < ${checkOut}`,
          sql`${bookings.checkOut} > ${checkIn}`
        )
      );

    // Exclude current booking if amending
    const relevantBookings = excludeBookingId
      ? overlappingBookings.filter(b => b.bookingId !== excludeBookingId)
      : overlappingBookings;

    // Calculate maximum rooms booked on any single day
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    let minAvailable = totalRooms;

    const currentDate = new Date(checkInDate);
    while (currentDate < checkOutDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      const bookedRooms = relevantBookings
        .filter(b => {
          const bookingStart = new Date(b.checkIn);
          const bookingEnd = new Date(b.checkOut);
          const checkDate = new Date(dateStr);
          return checkDate >= bookingStart && checkDate < bookingEnd;
        })
        .reduce((sum, b) => sum + b.numberOfRooms, 0);

      const available = totalRooms - bookedRooms;
      if (available < minAvailable) {
        minAvailable = available;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return minAvailable;
  }

  // Check if dates fall within blackout period
  async checkBlackoutDates(checkIn: string, checkOut: string): Promise<string[]> {
    const blackoutList = await db
      .select()
      .from(blackoutDates)
      .where(
        and(
          gte(blackoutDates.date, checkIn),
          lte(blackoutDates.date, checkOut)
        )
      );

    return blackoutList.map(b => b.date);
  }

  // Check minimum stay requirements
  async checkMinimumStay(checkIn: string, checkOut: string): Promise<{ required: number; actual: number } | null> {
    const rules = await db
      .select()
      .from(minimumStayRules)
      .where(
        and(
          lte(minimumStayRules.startDate, checkIn),
          gte(minimumStayRules.endDate, checkOut)
        )
      );

    if (rules.length === 0) {
      return null;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    const maxMinNights = Math.max(...rules.map(r => r.minNights));

    if (nights < maxMinNights) {
      return { required: maxMinNights, actual: nights };
    }

    return null;
  }

  // Create new booking
  async createBooking(data: CreateBookingInput) {
    // Check availability
    const available = await this.checkAvailability(data.checkIn, data.checkOut, data.roomType);
    if (available < data.numberOfRooms) {
      throw new Error(`Insufficient rooms available. Only ${available} room(s) available.`);
    }

    // Check blackout dates
    const blackoutList = await this.checkBlackoutDates(data.checkIn, data.checkOut);
    if (blackoutList.length > 0) {
      throw new Error(`Cannot book during blackout dates: ${blackoutList.join(', ')}`);
    }

    // Check minimum stay
    const minStayViolation = await this.checkMinimumStay(data.checkIn, data.checkOut);
    if (minStayViolation) {
      throw new Error(`Minimum stay of ${minStayViolation.required} nights required. You selected ${minStayViolation.actual} nights.`);
    }

    // Generate booking ID
    const bookingId = this.generateBookingId();
    const holdExpiry = new Date();
    holdExpiry.setDate(holdExpiry.getDate() + 7);

    const newBooking = {
      id: nanoid(),
      bookingId,
      customerName: data.customerName,
      company: data.company,
      saleOwner: data.saleOwner,
      phone: data.phone,
      email: data.email,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      roomType: data.roomType,
      numberOfRooms: data.numberOfRooms,
      rate: data.rate.toString(),
      paymentMethod: data.paymentMethod,
      status: 'PENDING' as const,
      holdExpiry,
      documents: data.documents || [],
      notes: data.notes,
    };

    const [created] = await db.insert(bookings).values(newBooking).returning();
    return created;
  }

  // Get booking by ID
  async getBooking(bookingId: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingId, bookingId))
      .limit(1);

    if (!booking) {
      throw new Error('Booking not found');
    }

    return booking;
  }

  // List bookings with filters
  async listBookings(filters: any = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(bookings.status, filters.status));
    }
    if (filters.roomType) {
      conditions.push(eq(bookings.roomType, filters.roomType));
    }
    if (filters.saleOwner) {
      conditions.push(eq(bookings.saleOwner, filters.saleOwner));
    }
    if (filters.company) {
      conditions.push(eq(bookings.company, filters.company));
    }
    if (filters.checkIn) {
      conditions.push(gte(bookings.checkIn, filters.checkIn));
    }
    if (filters.checkOut) {
      conditions.push(lte(bookings.checkOut, filters.checkOut));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(bookings)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${bookings.createdAt} DESC`);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(whereClause);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  // Update booking
  async updateBooking(bookingId: string, data: UpdateBookingInput) {
    const booking = await this.getBooking(bookingId);

    if (booking.status === 'CANCELLED' || booking.status === 'VOID') {
      throw new Error('Cannot update cancelled or voided booking');
    }

    // If dates or rooms are being changed, check availability
    if (data.checkIn || data.checkOut || data.roomType || data.numberOfRooms) {
      const checkIn = data.checkIn || booking.checkIn;
      const checkOut = data.checkOut || booking.checkOut;
      const roomType = data.roomType || booking.roomType;
      const numberOfRooms = data.numberOfRooms || booking.numberOfRooms;

      const available = await this.checkAvailability(checkIn, checkOut, roomType, bookingId);
      if (available < numberOfRooms) {
        throw new Error(`Insufficient rooms available. Only ${available} room(s) available.`);
      }
    }

    const [updated] = await db
      .update(bookings)
      .set({
        ...data,
        rate: data.rate?.toString(),
        lastAmendedAt: new Date(),
      })
      .where(eq(bookings.bookingId, bookingId))
      .returning();

    return updated;
  }

  // Cancel booking
  async cancelBooking(bookingId: string, cancelData: CancelBookingInput) {
    const booking = await this.getBooking(bookingId);

    const newStatus = booking.status === 'PENDING' ? 'VOID' : 'CANCELLED';

    const [updated] = await db
      .update(bookings)
      .set({
        status: newStatus,
        cancelReason: cancelData.cancelReason,
        cancelDocuments: cancelData.cancelDocuments || [],
        cancelledAt: new Date(),
        cancelledBy: cancelData.cancelledBy,
      })
      .where(eq(bookings.bookingId, bookingId))
      .returning();

    return updated;
  }

  // Amend booking (with audit trail)
  async amendBooking(bookingId: string, amendData: AmendBookingInput) {
    const booking = await this.getBooking(bookingId);

    if (booking.status === 'CANCELLED' || booking.status === 'VOID') {
      throw new Error('Cannot amend cancelled or voided booking');
    }

    // Check availability if needed
    const { amendments } = amendData;
    if (amendments.checkIn || amendments.checkOut || amendments.roomType || amendments.numberOfRooms) {
      const checkIn = amendments.checkIn || booking.checkIn;
      const checkOut = amendments.checkOut || booking.checkOut;
      const roomType = amendments.roomType || booking.roomType;
      const numberOfRooms = amendments.numberOfRooms || booking.numberOfRooms;

      const available = await this.checkAvailability(checkIn, checkOut, roomType, bookingId);
      if (available < numberOfRooms) {
        throw new Error(`Insufficient rooms available. Only ${available} room(s) available.`);
      }
    }

    const existingLogs = booking.amendmentLogs || [];
    const newLog = {
      timestamp: new Date().toISOString(),
      amendedBy: amendData.amendedBy,
      changes: amendData.amendLogs,
    };

    const [updated] = await db
      .update(bookings)
      .set({
        ...amendments,
        rate: amendments.rate?.toString(),
        lastAmendedAt: new Date(),
        lastAmendedBy: amendData.amendedBy,
        amendmentLogs: [...existingLogs, newLog],
      })
      .where(eq(bookings.bookingId, bookingId))
      .returning();

    return updated;
  }

  // Confirm booking
  async confirmBooking(bookingId: string) {
    const [updated] = await db
      .update(bookings)
      .set({ status: 'CONFIRMED', holdExpiry: null })
      .where(eq(bookings.bookingId, bookingId))
      .returning();

    return updated;
  }

  // Delete booking (hard delete - use with caution)
  async deleteBooking(bookingId: string) {
    await db.delete(bookings).where(eq(bookings.bookingId, bookingId));
    return { success: true };
  }
}

export const bookingService = new BookingService();