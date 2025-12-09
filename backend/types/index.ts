import { z } from "zod";

// Role enum
export const roleSchema = z.enum(["admin", "manager", "staff", "user", "sales", "salescoordinator", "frontoffice", "housekeeping"]);
export type Role = z.infer<typeof roleSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Register/Create user schema
export const createUserSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  fullName: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  role: roleSchema.optional().default("user"),
  department: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update user schema
export const updateUserSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง").optional(),
  fullName: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร").optional(),
  role: roleSchema.optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "รหัสผ่านปัจจุบันต้องมีอย่างน้อย 6 ตัวอักษร"),
  newPassword: z.string().min(6, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"),
  confirmPassword: z.string().min(6, "ยืนยันรหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Admin reset password schema
export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"),
});
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token จำเป็น"),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Query params schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: roleSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(["createdAt", "fullName", "email", "role"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

// Activity log query schema
export const activityLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ActivityLogQueryInput = z.infer<typeof activityLogQuerySchema>;

// ID param schema
export const idParamSchema = z.object({
  id: z.string().uuid("ID ไม่ถูกต้อง"),
});
export type IdParam = z.infer<typeof idParamSchema>;




// Booking Status Enum
export const bookingStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'VOID']);

// Create Booking Schema
export const createBookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  company: z.string().min(1, 'Company is required'),
  saleOwner: z.string().min(1, 'Sale owner is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email format'),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  roomType: z.string().min(1, 'Room type is required'),
  numberOfRooms: z.number().int().min(1, 'Number of rooms must be at least 1'),
  rate: z.number().min(0, 'Rate must be non-negative'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  documents: z.array(z.string()).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut > checkIn;
}, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOut'],
});

// Update Booking Schema
export const updateBookingSchema = z.object({
  customerName: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  saleOwner: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  roomType: z.string().min(1).optional(),
  numberOfRooms: z.number().int().min(1).optional(),
  rate: z.number().min(0).optional(),
  paymentMethod: z.string().min(1).optional(),
  status: bookingStatusSchema.optional(),
  documents: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Cancel Booking Schema
export const cancelBookingSchema = z.object({
  cancelReason: z.string().min(1, 'Cancel reason is required'),
  cancelDocuments: z.array(z.string()).optional(),
  cancelledBy: z.string().min(1, 'Cancelled by is required'),
});

// Amend Booking Schema
export const amendBookingSchema = z.object({
  amendments: updateBookingSchema,
  amendedBy: z.string().min(1, 'Amended by is required'),
  amendLogs: z.array(z.object({
    field: z.string(),
    before: z.any(),
    after: z.any(),
  })),
});

// Query Parameters Schema
export const listBookingsQuerySchema = z.object({
  status: bookingStatusSchema.optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  roomType: z.string().optional(),
  saleOwner: z.string().optional(),
  company: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

// Availability Check Schema
export const checkAvailabilitySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomType: z.string().min(1),
}).refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
  message: 'Check-out date must be after check-in date',
  path: ['checkOut'],
});

// ============ Room Type Schemas ============

export const createRoomTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  totalRooms: z.number().int().positive('Total rooms must be positive'),
  baseRate: z.number().nonnegative('Base rate must be non-negative'),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
});

export const updateRoomTypeSchema = z.object({
  name: z.string().min(1).optional(),
  totalRooms: z.number().int().positive().optional(),
  baseRate: z.number().nonnegative().optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
});

// ============ Company Schemas ============
export const createSalesOwnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});


export const updateSalesOwnerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});


// ============ Blackout Date Schemas ============
export const createBlackoutDateSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  reason: z.string().optional(),
});


// ============ Minimum Stay Rule Schemas ============

export const createMinimumStayRuleSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  minNights: z.number().int().positive('Minimum nights must be positive'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const updateMinimumStayRuleSchema = z.object({
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  minNights: z.number().int().positive().optional(),
});




export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type AmendBookingInput = z.infer<typeof amendBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;



// Type exports

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;

export type CreateSalesOwnerInput = z.infer<typeof createSalesOwnerSchema>;
export type UpdateSalesOwnerInput = z.infer<typeof updateSalesOwnerSchema>;

export type CreateBlackoutDateInput = z.infer<typeof createBlackoutDateSchema>;

export type CreateMinimumStayRuleInput = z.infer<typeof createMinimumStayRuleSchema>;
export type UpdateMinimumStayRuleInput = z.infer<typeof updateMinimumStayRuleSchema>;

