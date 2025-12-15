import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { roomTypeService } from '../services/roomType.service';
import { createRoomTypeSchema, updateRoomTypeSchema } from '../types';

const roomTypeRoutes = new Hono();

// Get all room types
roomTypeRoutes.get('/', async (c) => {
  try {
    const roomTypes = await roomTypeService.getAll();
    return c.json({ success: true, data: roomTypes });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Get single room type
roomTypeRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const roomType = await roomTypeService.getById(id);
    return c.json({ success: true, data: roomType });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 404);
  }
});

// Create room type
roomTypeRoutes.post(
  '/',
  zValidator('json', createRoomTypeSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const roomType = await roomTypeService.create(data);
      return c.json({ success: true, data: roomType }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Update room type
roomTypeRoutes.patch(
  '/:id',
  zValidator('json', updateRoomTypeSchema),
  async (c) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const roomType = await roomTypeService.update(id, data);
      return c.json({ success: true, data: roomType });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Delete room type
roomTypeRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await roomTypeService.delete(id);
    return c.json({ success: true, message: 'Room type deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default roomTypeRoutes;