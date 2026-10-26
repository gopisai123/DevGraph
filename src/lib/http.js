export class AppError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
export function positiveInt(value, fallback = 50, maximum = 200) {
  if (value === undefined) return fallback;
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > maximum) throw new AppError(400, `limit must be an integer between 1 and ${maximum}`);
  return result;
}
export function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, `${field} is required`);
  return value.trim();
}
export function optionalInteger(value, field, minimum = 0) {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < minimum) throw new AppError(400, `${field} must be an integer of at least ${minimum}`);
  return value;
}
