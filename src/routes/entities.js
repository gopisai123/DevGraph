import { Router } from 'express';
import * as entities from '../services/entities.js';
import { asyncHandler, AppError, positiveInt } from '../lib/http.js';

export function entityRouter(type) {
  const router = Router();
  router.get('/', asyncHandler(async (req, res) => res.json({ data: await entities.list(type, positiveInt(req.query.limit)) })));
  router.get('/:id', asyncHandler(async (req, res) => { const data = await entities.find(type, req.params.id); if (!data) throw new AppError(404, 'Resource not found'); res.json({ data }); }));
  router.post('/', asyncHandler(async (req, res) => res.status(201).json({ data: await entities.create(type, req.body) })));
  router.patch('/:id', asyncHandler(async (req, res) => { const data = await entities.update(type, req.params.id, req.body); if (!data) throw new AppError(404, 'Resource not found'); res.json({ data }); }));
  router.delete('/:id', asyncHandler(async (req, res) => { if (!await entities.remove(type, req.params.id)) throw new AppError(404, 'Resource not found'); res.status(204).end(); }));
  return router;
}
