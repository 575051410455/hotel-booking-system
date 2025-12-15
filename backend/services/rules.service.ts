import { eq, and, lte, gte } from 'drizzle-orm';
import { db } from '../db';
import { blackoutDates, minimumStayRules, type BlackoutDate, type NewBlackoutDate, type MinimumStayRule, type NewMinimumStayRule } from '../db/schema';
import type { CreateBlackoutDateInput, CreateMinimumStayRuleInput, UpdateMinimumStayRuleInput } from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Blackout Dates Service
export const blackoutDateService = {
  // Create a new blackout date
  async create(data: CreateBlackoutDateInput): Promise<BlackoutDate> {
    const id = generateId();

    const newBlackoutDate: NewBlackoutDate = {
      id,
      date: data.date,
      reason: data.reason,
    };

    const [created] = await db.insert(blackoutDates).values(newBlackoutDate).returning();

    // Ensure creation was successful
    if (!created) {
      throw new Error('Failed to create blackout date');
    }
    return created;
  },

  // Get all blackout dates
  async getAll(): Promise<BlackoutDate[]> {
    return db.select().from(blackoutDates).orderBy(blackoutDates.date);
  },

  // Get blackout dates within a range
  async getByRange(startDate: string, endDate: string): Promise<BlackoutDate[]> {
    return db
      .select()
      .from(blackoutDates)
      .where(and(gte(blackoutDates.date, startDate), lte(blackoutDates.date, endDate)))
      .orderBy(blackoutDates.date);
  },

  // Check if a date is blacked out
  async isBlackedOut(date: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(blackoutDates)
      .where(eq(blackoutDates.date, date))
      .limit(1);

    return !!result;
  },

  // Delete a blackout date
  async delete(id: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(blackoutDates)
      .where(eq(blackoutDates.id, id))
      .limit(1);

    if (!existing) {
      throw new Error('Blackout date not found');
    }

    await db.delete(blackoutDates).where(eq(blackoutDates.id, id));
  },
};

// Minimum Stay Rules Service
export const minimumStayRuleService = {
  // Create a new minimum stay rule
  async create(data: CreateMinimumStayRuleInput): Promise<MinimumStayRule> {
    const id = generateId();

    const newRule: NewMinimumStayRule = {
      id,
      startDate: data.startDate,
      endDate: data.endDate,
      minNights: data.minNights,
    };

    const [created] = await db.insert(minimumStayRules).values(newRule).returning();

    // Ensure creation was successful
    if (!created) {
        throw new Error('Failed to create minimum stay rules');
    }
    return created;
  },

  // Get all minimum stay rules
  async getAll(): Promise<MinimumStayRule[]> {
    return db.select().from(minimumStayRules).orderBy(minimumStayRules.startDate);
  },

  // Get a single rule by ID
  async getById(id: string): Promise<MinimumStayRule> {
    const [rule] = await db
      .select()
      .from(minimumStayRules)
      .where(eq(minimumStayRules.id, id))
      .limit(1);

    if (!rule) {
      throw new Error('Minimum stay rule not found');
    }

    return rule;
  },

  // Get minimum nights required for a date
  async getMinNightsForDate(date: string): Promise<number> {
    const rules = await db
      .select()
      .from(minimumStayRules)
      .where(and(lte(minimumStayRules.startDate, date), gte(minimumStayRules.endDate, date)));

    if (rules.length === 0) {
      return 1; // Default minimum
    }

    // Return the highest minimum nights requirement
    return Math.max(...rules.map((r) => r.minNights));
  },

  // Update a minimum stay rule
  async update(id: string, data: UpdateMinimumStayRuleInput): Promise<MinimumStayRule> {
    const existing = await this.getById(id);

    const updateData: Partial<NewMinimumStayRule> = {
      updatedAt: new Date(),
    };

    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.minNights !== undefined) updateData.minNights = data.minNights;

    const [updated] = await db
      .update(minimumStayRules)
      .set(updateData)
      .where(eq(minimumStayRules.id, existing.id))
      .returning();

    // Ensure update was successful
    if (!updated) {
        throw new Error('Failed to update minimum stay rule');
    }
    return updated;
  },

  // Delete a minimum stay rule
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    await db.delete(minimumStayRules).where(eq(minimumStayRules.id, existing.id));
  },
};

export default { blackoutDateService, minimumStayRuleService };