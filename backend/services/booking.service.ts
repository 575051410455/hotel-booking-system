import { eq, and, or, gte, lte, like, desc, asc, sql, ne } from 'drizzle-orm';
import { db } from '../db';
import { bookings, roomTypes, type Booking, type NewBooking } from '../db/schema';

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
  // Create a new booking
  async createBooking(data: CreateBookingInput): Promise<Booking> {
    const id = generateId();
    const bookingId = generateBookingId();
    const now = new Date();
    const holdExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days hold

    // Check availability first
    const available = await this.checkAvailability(data.checkIn, data.checkOut, data.roomType);
    if (available < data.numberOfRooms) {
      throw new Error(`Not enough rooms available. Only ${available} rooms available.`);
    }

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

    const [created] = await db.insert(bookings).values(newBooking).returning();

    // Add this check to satisfy TypeScript that created is Booking
    if (!created) {
      throw new Error('Failed to create booking');
    }

    return created;
  },

  // Get a single booking by ID
  async getBooking(bookingId: string): Promise<Booking> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(or(eq(bookings.id, bookingId), eq(bookings.bookingId, bookingId)))
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(whereClause);

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
        cancelReason: data.reason,
        cancelledBy: data.cancelledBy,
        cancelledAt: new Date(),
        cancelDocuments: data.cancelDocuments,
      })
      .where(eq(bookings.id, existing.id))
      .returning();

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

    return updated;
  },

  // Amend a booking (with audit trail)
  async amendBooking(bookingId: string, data: AmendBookingInput): Promise<Booking> {
    const existing = await this.getBooking(bookingId);

    // Build changes log
    const changes: { field: string; before: any; after: any }[] = [];

    for (const [key, value] of Object.entries(data.changes)) {
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
    if (data.changes.customerName) updateData.customerName = data.changes.customerName;
    if (data.changes.company) updateData.company = data.changes.company;
    if (data.changes.saleOwner) updateData.saleOwner = data.changes.saleOwner;
    if (data.changes.phone) updateData.phone = data.changes.phone;
    if (data.changes.email) updateData.email = data.changes.email;
    if (data.changes.checkIn) updateData.checkIn = data.changes.checkIn;
    if (data.changes.checkOut) updateData.checkOut = data.changes.checkOut;
    if (data.changes.roomType) updateData.roomType = data.changes.roomType;
    if (data.changes.numberOfRooms) updateData.numberOfRooms = data.changes.numberOfRooms;
    if (data.changes.rate) updateData.rate = data.changes.rate.toString();
    if (data.changes.paymentMethod) updateData.paymentMethod = data.changes.paymentMethod;
    if (data.changes.notes) updateData.notes = data.changes.notes;

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

    return updated;
  },

  // Delete a booking
  async deleteBooking(bookingId: string): Promise<void> {
    const existing = await this.getBooking(bookingId);

    await db.delete(bookings).where(eq(bookings.id, existing.id));
  },

  // Check room availability
  async checkAvailability(checkIn: string, checkOut: string, roomTypeName: string): Promise<number> {
    // Get room type info
    const [roomType] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.name, roomTypeName))
      .limit(1);

    if (!roomType) {
      throw new Error('Room type not found');
    }

    // Get overlapping bookings (excluding cancelled/void)
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomType, roomTypeName),
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
      const dateStr = currentDate.toISOString().split('T')[0];

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