import { eq, and, or, gte, lte, like, desc, asc, sql, ne, isNull, lt } from 'drizzle-orm';
import { db } from '../db';
import { bookings, roomTypes, type Booking, type NewBooking } from '../db/schema';
import { blackoutDateService, minimumStayRuleService } from './rules.service';

import type {
  CreateBookingInput,
  UpdateBookingInput,
  CancelBookingInput,
  AmendBookingInput,
  ListBookingsQuery,
  CheckAvailabilityInput,
} from '../types';

// Generate unique booking ID
function generateBookingId(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${year}${month}${day}-${random}`;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const bookingService = {
  // Helper: Validate blackout dates
  async validateBlackoutDates(checkIn: string, checkOut: string): Promise<void> {
    const blackoutedDates: string[] = [];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const currentDate = new Date(checkInDate);
    while (currentDate < checkOutDate) {
      const dateStr = currentDate.toISOString().split('T')[0] || '';
      const isBlackedOut = await blackoutDateService.isBlackedOut(dateStr);
      if (isBlackedOut) {
        blackoutedDates.push(dateStr);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (blackoutedDates.length > 0) {
      throw new Error(`Cannot book on blackout dates: ${blackoutedDates.join(', ')}`);
    }
  },

  // Helper: Validate minimum stay rules
  async validateMinimumStay(checkIn: string, checkOut: string): Promise<void> {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    const minNights = await minimumStayRuleService.getMinNightsForDate(checkIn);

    if (nights < minNights) {
      throw new Error(`Minimum stay is ${minNights} night(s) for this date. You are booking ${nights} night(s).`);
    }
  },

  // Helper: Release expired holds
  async releaseExpiredHolds(): Promise<void> {
    const now = new Date();
    await db
      .update(bookings)
      .set({
        status: 'CANCELLED',
        cancelReason: 'Hold expired (7 days)',
        cancelledAt: now,
        cancelledBy: 'SYSTEM',
      })
      .where(
        and(
          eq(bookings.status, 'PENDING'),
          lt(bookings.holdExpiry, now),
          isNull(bookings.deletedAt)
        )
      );
  },

  // Create a new booking
  async createBooking(data: CreateBookingInput): Promise<Booking> {
    // Validate business rules BEFORE transaction
    await this.validateBlackoutDates(data.checkIn, data.checkOut);
    await this.validateMinimumStay(data.checkIn, data.checkOut);

    return await db.transaction(async (tx) => {
      const id = generateId();
      const bookingId = generateBookingId();
      const now = new Date();
      const holdExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Lock room type row (pessimistic locking)
      const [roomType] = await tx
        .select()
        .from(roomTypes)
        .where(
          and(
            eq(roomTypes.name, data.roomType),
            isNull(roomTypes.deletedAt)
          )
        )
        .for('update')
        .limit(1);

      if (!roomType) {
        throw new Error('Room type not found');
      }

      // Check availability with locked data
      const overlappingBookings = await tx
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.roomType, data.roomType),
            isNull(bookings.deletedAt),
            ne(bookings.status, 'CANCELLED'),
            ne(bookings.status, 'VOID'),
            sql`${bookings.checkIn} < ${data.checkOut}`,
            sql`${bookings.checkOut} > ${data.checkIn}`
          )
        );

      // Calculate minimum available rooms across all days
      const checkInDate = new Date(data.checkIn);
      const checkOutDate = new Date(data.checkOut);
      let minAvailable = roomType.totalRooms;

      const currentDate = new Date(checkInDate);
      while (currentDate < checkOutDate) {
        const dateStr = currentDate.toISOString().split('T')[0] || '';
        const bookedRooms = overlappingBookings
          .filter((b) => {
            const bookingStart = new Date(b.checkIn);
            const bookingEnd = new Date(b.checkOut);
            const checkDate = new Date(dateStr);
            return checkDate >= bookingStart && checkDate < bookingEnd;
          })
          .reduce((sum, b) => sum + b.numberOfRooms, 0);

        const available = roomType.totalRooms - bookedRooms;
        if (available < minAvailable) {
          minAvailable = available;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (minAvailable < data.numberOfRooms) {
        throw new Error(`Not enough rooms available. Only ${minAvailable} rooms available.`);
      }

      // Insert booking
      const newBooking: NewBooking = {
        id,
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
        status: 'PENDING',
        holdExpiry,
        documents: data.documents,
        notes: data.notes,
      };

      const [created] = await tx.insert(bookings).values(newBooking).returning();

      if (!created) {
        throw new Error('Failed to create booking');
      }

      return created;
    });
  },

  // Get a single booking by ID
  async getBooking(bookingId: string): Promise<Booking> {
    // Release expired holds before querying
    await this.releaseExpiredHolds();

    const [booking] = await db
      .select()
      .from(bookings)
      .where(
        and(
          or(eq(bookings.id, bookingId), eq(bookings.bookingId, bookingId)),
          isNull(bookings.deletedAt)
        )
      )
      .limit(1);

    if (!booking) {
      throw new Error('Booking not found');
    }

    return booking;
  },

  // List bookings with filters and pagination
  async listBookings(
    filters: Omit<ListBookingsQuery, 'page' | 'limit'>,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: Booking[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    // Release expired holds before querying
    await this.releaseExpiredHolds();

    const conditions = [isNull(bookings.deletedAt)];

    if (filters.status) {
      conditions.push(eq(bookings.status, filters.status));
    }

    if (filters.roomType) {
      conditions.push(eq(bookings.roomType, filters.roomType));
    }

    if (filters.saleOwner) {
      conditions.push(eq(bookings.saleOwner, filters.saleOwner));
    }

    if (filters.checkInFrom) {
      conditions.push(gte(bookings.checkIn, filters.checkInFrom));
    }

    if (filters.checkInTo) {
      conditions.push(lte(bookings.checkIn, filters.checkInTo));
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(bookings.bookingId, searchTerm),
          like(bookings.customerName, searchTerm),
          like(bookings.phone, searchTerm),
          like(bookings.email, searchTerm),
          like(bookings.company, searchTerm)
        )
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(whereClause);

    const count = countResult[0]?.count || 0;

    // Get paginated data
    const offset = (page - 1) * limit;
    const data = await db
      .select()
      .from(bookings)
      .where(whereClause)
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  // Update a booking
  async updateBooking(bookingId: string, data: UpdateBookingInput): Promise<Booking> {
    const existing = await this.getBooking(bookingId);

    const updateData: Partial<NewBooking> = {};

    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.saleOwner !== undefined) updateData.saleOwner = data.saleOwner;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.checkIn !== undefined) updateData.checkIn = data.checkIn;
    if (data.checkOut !== undefined) updateData.checkOut = data.checkOut;
    if (data.roomType !== undefined) updateData.roomType = data.roomType;
    if (data.numberOfRooms !== undefined) updateData.numberOfRooms = data.numberOfRooms;
    if (data.rate !== undefined) updateData.rate = data.rate.toString();
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, existing.id))
      .returning();

    // Add this check to satisfy TypeScript that updated is Booking
    if (!updated) {
      throw new Error('Failed to update booking');
    }
    return updated;
  },

  // Cancel a booking
  async cancelBooking(bookingId: string, data: CancelBookingInput): Promise<Booking> {
    const existing = await this.getBooking(bookingId);

    if (existing.status === 'CANCELLED') {
      throw new Error('Booking is already cancelled');
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: 'CANCELLED',
        cancelReason: data.cancelReason,
        cancelledBy: data.cancelledBy,
        cancelledAt: new Date(),
        cancelDocuments: data.cancelDocuments,
      })
      .where(eq(bookings.id, existing.id))
      .returning();

      // Add this check to satisfy TypeScript that updated is Booking
      if (!updated) {
        throw new Error('Failed to cancel booking');
      }
    return updated;
  },

  // Confirm a booking
  async confirmBooking(bookingId: string): Promise<Booking> {
    const existing = await this.getBooking(bookingId);

    if (existing.status !== 'PENDING') {
      throw new Error('Only pending bookings can be confirmed');
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: 'CONFIRMED',
        holdExpiry: null, // Remove hold expiry once confirmed
      })
      .where(eq(bookings.id, existing.id))
      .returning();

      // Add this check to satisfy TypeScript that updated is Booking
      if (!updated) {
        throw new Error('Failed to confirm booking');
      }

    return updated;
  },

  // Amend a booking (with audit trail)
  async amendBooking(bookingId: string, data: AmendBookingInput): Promise<Booking> {
    const existing = await this.getBooking(bookingId);

    // Validate if dates are being changed
    if (data.amendments.checkIn || data.amendments.checkOut) {
      const newCheckIn = data.amendments.checkIn || existing.checkIn;
      const newCheckOut = data.amendments.checkOut || existing.checkOut;
      await this.validateBlackoutDates(newCheckIn, newCheckOut);
      await this.validateMinimumStay(newCheckIn, newCheckOut);
    }

    // Build changes log
    const changes: { field: string; before: any; after: any }[] = [];

    for (const [key, value] of Object.entries(data.amendments)) {
      if (value !== undefined && (existing as any)[key] !== value) {
        changes.push({
          field: key,
          before: (existing as any)[key],
          after: value,
        });
      }
    }

    if (changes.length === 0) {
      return existing; // No changes to make
    }

    // Build amendment log entry
    const amendmentEntry = {
      timestamp: new Date().toISOString(),
      amendedBy: data.amendedBy,
      changes,
    };

    // Update booking
    const updateData: Partial<NewBooking> = {};
    if (data.amendments.customerName) updateData.customerName = data.amendments.customerName;
    if (data.amendments.company) updateData.company = data.amendments.company;
    if (data.amendments.saleOwner) updateData.saleOwner = data.amendments.saleOwner;
    if (data.amendments.phone) updateData.phone = data.amendments.phone;
    if (data.amendments.email) updateData.email = data.amendments.email;
    if (data.amendments.checkIn) updateData.checkIn = data.amendments.checkIn;
    if (data.amendments.checkOut) updateData.checkOut = data.amendments.checkOut;
    if (data.amendments.roomType) updateData.roomType = data.amendments.roomType;
    if (data.amendments.numberOfRooms) updateData.numberOfRooms = data.amendments.numberOfRooms;
    if (data.amendments.rate) updateData.rate = data.amendments.rate.toString();
    if (data.amendments.paymentMethod) updateData.paymentMethod = data.amendments.paymentMethod;
    if (data.amendments.notes) updateData.notes = data.amendments.notes;

    const existingLogs = existing.amendmentLogs || [];

    const [updated] = await db
      .update(bookings)
      .set({
        ...updateData,
        lastAmendedAt: new Date(),
        lastAmendedBy: data.amendedBy,
        amendmentLogs: [...existingLogs, amendmentEntry],
      })
      .where(eq(bookings.id, existing.id))
      .returning();

      // Add this check to satisfy TypeScript that updated is Booking
      if (!updated) {
        throw new Error('Failed to amend booking');
      }
    return updated;
  },

  // Delete a booking (soft delete)
  async deleteBooking(bookingId: string, deletedBy: string): Promise<void> {
    const existing = await this.getBooking(bookingId);

    await db
      .update(bookings)
      .set({
        deletedAt: new Date(),
        deletedBy,
      })
      .where(eq(bookings.id, existing.id));
  },

  // Check room availability
  async checkAvailability(checkIn: string, checkOut: string, roomTypeName: string): Promise<number> {
    // Release expired holds before checking
    await this.releaseExpiredHolds();

    // Get room type info
    const [roomType] = await db
      .select()
      .from(roomTypes)
      .where(
        and(
          eq(roomTypes.name, roomTypeName),
          isNull(roomTypes.deletedAt)
        )
      )
      .limit(1);

    if (!roomType) {
      throw new Error('Room type not found');
    }

    // Get overlapping bookings (excluding cancelled/void and deleted)
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomType, roomTypeName),
          isNull(bookings.deletedAt),
          ne(bookings.status, 'CANCELLED'),
          ne(bookings.status, 'VOID'),
          // Booking overlaps if: booking.checkIn < checkOut AND booking.checkOut > checkIn
          sql`${bookings.checkIn} < ${checkOut}`,
          sql`${bookings.checkOut} > ${checkIn}`
        )
      );

    // Calculate minimum available rooms across all days in the range
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    let minAvailable = roomType.totalRooms;

    const currentDate = new Date(checkInDate);
    while (currentDate < checkOutDate) {
      const dateStr = currentDate.toISOString().split('T')[0] || '';

      const bookedRooms = overlappingBookings
        .filter((b) => {
          const bookingStart = new Date(b.checkIn);
          const bookingEnd = new Date(b.checkOut);
          const checkDate = new Date(dateStr);
          return checkDate >= bookingStart && checkDate < bookingEnd;
        })
        .reduce((sum, b) => sum + b.numberOfRooms, 0);

      const available = roomType.totalRooms - bookedRooms;
      if (available < minAvailable) {
        minAvailable = available;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return Math.max(0, minAvailable);
  },
};

export default bookingService;