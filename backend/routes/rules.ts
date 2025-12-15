import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { blackoutDateService, minimumStayRuleService } from '../services/rules.service';
import {
  createBlackoutDateSchema,
  createMinimumStayRuleSchema,
  updateMinimumStayRuleSchema,
} from '../types';

// Blackout Dates Routes
export const blackoutDateRoutes = new Hono();

// Get all blackout dates
blackoutDateRoutes.get('/', async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let blackoutDates;
    if (startDate && endDate) {
      blackoutDates = await blackoutDateService.getByRange(startDate, endDate);
    } else {
      blackoutDates = await blackoutDateService.getAll();
    }

    return c.json({ success: true, data: blackoutDates });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Check if a date is blacked out
blackoutDateRoutes.get('/check/:date', async (c) => {
  try {
    const date = c.req.param('date');
    const isBlackedOut = await blackoutDateService.isBlackedOut(date);
    return c.json({ success: true, data: { isBlackedOut } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Create blackout date
blackoutDateRoutes.post(
  '/',
  zValidator('json', createBlackoutDateSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const blackoutDate = await blackoutDateService.create(data);
      return c.json({ success: true, data: blackoutDate }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Delete blackout date
blackoutDateRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await blackoutDateService.delete(id);
    return c.json({ success: true, message: 'Blackout date deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Minimum Stay Rules Routes
export const minimumStayRuleRoutes = new Hono();

// Get all minimum stay rules
minimumStayRuleRoutes.get('/', async (c) => {
  try {
    const rules = await minimumStayRuleService.getAll();
    return c.json({ success: true, data: rules });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Get minimum nights for a specific date
minimumStayRuleRoutes.get('/check/:date', async (c) => {
  try {
    const date = c.req.param('date');
    const minNights = await minimumStayRuleService.getMinNightsForDate(date);
    return c.json({ success: true, data: { minNights } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Get single rule
minimumStayRuleRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const rule = await minimumStayRuleService.getById(id);
    return c.json({ success: true, data: rule });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 404);
  }
});

// Create minimum stay rule
minimumStayRuleRoutes.post(
  '/',
  zValidator('json', createMinimumStayRuleSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const rule = await minimumStayRuleService.create(data);
      return c.json({ success: true, data: rule }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Update minimum stay rule
minimumStayRuleRoutes.patch(
  '/:id',
  zValidator('json', updateMinimumStayRuleSchema),
  async (c) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const rule = await minimumStayRuleService.update(id, data);
      return c.json({ success: true, data: rule });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Delete minimum stay rule
minimumStayRuleRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await minimumStayRuleService.delete(id);
    return c.json({ success: true, message: 'Minimum stay rule deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default { blackoutDateRoutes, minimumStayRuleRoutes };