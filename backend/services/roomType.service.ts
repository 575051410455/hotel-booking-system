import { eq } from 'drizzle-orm';
import { db } from '../db';
import { roomTypes, type RoomType, type NewRoomType } from '../db/schema';
import type { CreateRoomTypeInput, UpdateRoomTypeInput } from '../types/';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const roomTypeService = {
  // Create a new room type
  async create(data: CreateRoomTypeInput): Promise<RoomType> {
    const id = generateId();

    const newRoomType: NewRoomType = {
      id,
      name: data.name,
      totalRooms: data.totalRooms,
      baseRate: data.baseRate.toString(),
      description: data.description,
      amenities: data.amenities,
    };

    const [created] = await db.insert(roomTypes).values(newRoomType).returning();
    
    // Update totalRooms in case it's not provided
    if (!created) {
        throw new Error('Failed to create room type');
    }

    return created;
  },

  // Get all room types
  async getAll(): Promise<RoomType[]> {
    return db.select().from(roomTypes).orderBy(roomTypes.name);
  },

  // Get a single room type by ID
  async getById(id: string): Promise<RoomType> {
    const [roomType] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, id))
      .limit(1);

    if (!roomType) {
      throw new Error('Room type not found');
    }

    return roomType;
  },

  // Get a room type by name
  async getByName(name: string): Promise<RoomType | null> {
    const [roomType] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.name, name))
      .limit(1);

    return roomType || null;
  },

  // Update a room type
  async update(id: string, data: UpdateRoomTypeInput): Promise<RoomType> {
    const existing = await this.getById(id);

    const updateData: Partial<NewRoomType> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.totalRooms !== undefined) updateData.totalRooms = data.totalRooms;
    if (data.baseRate !== undefined) updateData.baseRate = data.baseRate.toString();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amenities !== undefined) updateData.amenities = data.amenities;

    const [updated] = await db
      .update(roomTypes)
      .set(updateData)
      .where(eq(roomTypes.id, existing.id))
      .returning();

    if (!updated) {
      throw new Error('Failed to update room type');
    }

    return updated;
  },

  // Delete a room type
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    await db.delete(roomTypes).where(eq(roomTypes.id, existing.id));
  },
};

export default roomTypeService;