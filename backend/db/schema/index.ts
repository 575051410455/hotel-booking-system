import { pgTable, text, timestamp, uuid, varchar, boolean, pgEnum, integer, decimal, jsonb, index } from "drizzle-orm/pg-core";

// Role enum
export const roleEnum = pgEnum("role", ["admin", "manager", "staff", "user", "sales", "salescoordinator", "frontoffice", "housekeeping"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("user"),
  department: varchar("department", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  userName: varchar("user_name", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Refresh tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Room Types Table
export const roomTypes = pgTable('room_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en').notNull(),
  totalRooms: integer('total_rooms').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Companies Table
export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sales Owners Table
export const salesOwners = pgTable('sales_owners', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Bookings Table
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull().unique(),
  customerName: text('customer_name').notNull(),
  company: text('company').notNull(),
  saleOwner: text('sale_owner').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  checkIn: text('check_in').notNull(),
  checkOut: text('check_out').notNull(),
  roomType: text('room_type').notNull(),
  numberOfRooms: integer('number_of_rooms').notNull(),
  rate: decimal('rate', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, CONFIRMED, CANCELLED, VOID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  holdExpiry: timestamp('hold_expiry'),
  documents: jsonb('documents').$type<string[]>(),
  cancelReason: text('cancel_reason'),
  cancelDocuments: jsonb('cancel_documents').$type<string[]>(),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: text('cancelled_by'),
  lastAmendedAt: timestamp('last_amended_at'),
  lastAmendedBy: text('last_amended_by'),
  amendmentLogs: jsonb('amendment_logs').$type<{
    timestamp: string;
    amendedBy: string;
    changes: {
      field: string;
      before: any;
      after: any;
    }[];
  }[]>(),
  notes: text('notes'),
}, (table) => ({
  bookingIdIdx: index('booking_id_idx').on(table.bookingId),
  statusIdx: index('status_idx').on(table.status),
  checkInIdx: index('check_in_idx').on(table.checkIn),
  checkOutIdx: index('check_out_idx').on(table.checkOut),
  roomTypeIdx: index('room_type_idx').on(table.roomType),
}));

// Blackout Dates Table
export const blackoutDates = pgTable('blackout_dates', {
  id: text('id').primaryKey(),
  date: text('date').notNull().unique(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Minimum Stay Rules Table
export const minimumStayRules = pgTable('minimum_stay_rules', {
  id: text('id').primaryKey(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  minNights: integer('min_nights').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});




// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;


// Type exports for TypeScript
export type RoomType = typeof roomTypes.$inferSelect;
export type NewRoomType = typeof roomTypes.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type SalesOwner = typeof salesOwners.$inferSelect;
export type NewSalesOwner = typeof salesOwners.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type BlackoutDate = typeof blackoutDates.$inferSelect;
export type NewBlackoutDate = typeof blackoutDates.$inferInsert;

export type MinimumStayRule = typeof minimumStayRules.$inferSelect;
export type NewMinimumStayRule = typeof minimumStayRules.$inferInsert;



