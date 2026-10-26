import express from 'express';
import apiRouter from './routes/api.js';
import { AppError } from './lib/http.js';

export const app = express();
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiRouter);
app.use((_req, _res, next) => next(new AppError(404, 'Route not found')));
app.use((error, _req, res, _next) => {
  const status = error instanceof AppError ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: { message: status === 500 ? 'Internal server error' : error.message, ...(error.details ? { details: error.details } : {}) } });
});
