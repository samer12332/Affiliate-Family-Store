import mongoose from 'mongoose';
export { validateEmail, validatePhone } from '@/lib/common-validation';

export function isValidObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(String(value || '').trim());
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function safeTrim(value: unknown, maxLen: number) {
  return String(value ?? '').trim().slice(0, Math.max(0, maxLen));
}

export function escapeRegex(value: string) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
