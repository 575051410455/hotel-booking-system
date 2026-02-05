import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bookingService } from '../services/booking.service';
import {
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  amendBookingSchema,
  listBookingsQuerySchema,
  checkAvailabilitySchema,
} from '../types';
import { success } from 'zod';

const bookingRoutes = new Hono();


// List bookings with filters
bookingRoutes.get(
  '/',
  zValidator('query', listBookingsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
    
      const result = await bookingService.listBookings(query);
      return c.json({ success: true, data: result });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Create booking
bookingRoutes.post(
  '/',
  zValidator('json', createBookingSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const booking = await bookingService.createBooking(data);
      return c.json({ success: true, data: booking }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Get single booking
bookingRoutes.get('/:bookingId', async (c) => {
  try {
    const bookingId = c.req.param('bookingId');
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    return c.json({ success: true, data: booking });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 404);
  }
});


// Check availability - Must be before /:bookingId to avoid route conflict
bookingRoutes.post(
  '/check-availability',
  zValidator('json', checkAvailabilitySchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const available = await bookingService.checkAvailability(
        data.checkIn,
        data.checkOut,
        data.roomType
      );
      return c.json({ success: true, data: { available } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);


// PATCH /bookings/:id - Update
bookingRoutes.patch("/:id", zValidator("json", updateBookingSchema), async (c) => {
  const id = c.req.param("id");
  const data = c.req.valid("json");
  const booking = await bookingService.updateBooking(id, data);
  return c.json({ success: true, data: booking });
})

// Delete booking
bookingRoutes.delete('/:bookingId', async (c) => {
  try {
    const bookingId = c.req.param('bookingId');
    const booking = await bookingService.confirmBooking(bookingId);
    return c.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});


// Cancel booking
bookingRoutes.post(
  '/:bookingId/cancel',
  zValidator('json', cancelBookingSchema),
  async (c) => {
    try {
      const bookingId = c.req.param('bookingId');
      const data = c.req.valid('json');
      const booking = await bookingService.cancelBooking(bookingId, data);
      return c.json({ success: true, data: booking });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Amend booking
bookingRoutes.post(
  '/:bookingId/amend',
  zValidator('json', amendBookingSchema),
  async (c) => {
    try {
      const bookingId = c.req.param('bookingId');
      const data = c.req.valid('json');
      const booking = await bookingService.amendBooking(bookingId, data);
      return c.json({ success: true, data: booking });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Confirm booking
bookingRoutes.post('/:bookingId/confirm', async (c) => {
  try {
    const bookingId = c.req.param('bookingId');
    const booking = await bookingService.confirmBooking(bookingId);
    return c.json({ success: true, data: booking });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});


export default bookingRoutes;