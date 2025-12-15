import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { companyService } from '../services/company.service';
import { createCompanySchema, updateCompanySchema } from '../types';

const companyRoutes = new Hono();

// Get all companies
companyRoutes.get('/', async (c) => {
  try {
    const includeInactive = c.req.query('includeInactive') === 'true';
    const companies = await companyService.getAll(includeInactive);
    return c.json({ success: true, data: companies });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Get single company
companyRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const company = await companyService.getById(id);
    return c.json({ success: true, data: company });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 404);
  }
});

// Create company
companyRoutes.post(
  '/',
  zValidator('json', createCompanySchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const company = await companyService.create(data);
      return c.json({ success: true, data: company }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Update company
companyRoutes.patch(
  '/:id',
  zValidator('json', updateCompanySchema),
  async (c) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const company = await companyService.update(id, data);
      return c.json({ success: true, data: company });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// Delete company
companyRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await companyService.delete(id);
    return c.json({ success: true, message: 'Company deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default companyRoutes;