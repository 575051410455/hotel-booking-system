import { eq } from 'drizzle-orm';
import { db } from '../db';
import {  companies, type Company, type NewCompany } from '../db/schema';
import type { CreateCompanyInput, UpdateCompanyInput } from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const companyService = {
  // Create a new company
  async create(data: CreateCompanyInput): Promise<Company> {
    const id = generateId();

    const newCompany: NewCompany = {
      id,
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email || null,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId,
      creditTerms: data.creditTerms ?? 0,
      isActive: data.isActive ?? true,
    };

    const [created] = await db.insert(companies).values(newCompany).returning();

    // Ensure creation was successful
    if (!created) {
      throw new Error('Failed to create company');
    }
    return created;
  },

  // Get all companies
  async getAll(includeInactive: boolean = false): Promise<Company[]> {
    if (includeInactive) {
      return db.select().from(companies).orderBy(companies.name);
    }
    
    return db
      .select()
      .from(companies)
      .where(eq(companies.isActive, true))
      .orderBy(companies.name);
  },

  // Get a single company by ID
  async getById(id: string): Promise<Company> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!company) {
      throw new Error('Company not found');
    }

    return company;
  },

  // Update a company
  async update(id: string, data: UpdateCompanyInput): Promise<Company> {
    const existing = await this.getById(id);

    const updateData: Partial<NewCompany> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.creditTerms !== undefined) updateData.creditTerms = data.creditTerms;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, existing.id))
      .returning();

    // Ensure update was successful
    if (!updated) {
        throw new Error('Failed to update company');
    }

    return updated;
  },

  // Delete a company
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    await db.delete(companies).where(eq(companies.id, existing.id));
  },
};

export default companyService;