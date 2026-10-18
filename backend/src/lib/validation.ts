/**
 * Centralized Input Validation & Sanitization Helpers for Bizora ERP.
 * Protects against injection, mass assignment, weak credentials, and invalid financial values.
 */

export function validatePassword(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== 'string' || !password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters.' };
  }
  return { valid: true };
}

export function validatePin(pin: unknown): { valid: boolean; error?: string } {
  if (typeof pin !== 'string' || !pin) {
    return { valid: false, error: 'PIN is required.' };
  }
  const clean = pin.trim();
  if (!/^\d{4,6}$/.test(clean)) {
    return { valid: false, error: 'PIN must be exactly 4 to 6 numeric digits.' };
  }
  return { valid: true };
}

export function validateEmail(email: unknown): { valid: boolean; error?: string; normalized?: string } {
  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, error: 'Email address is required.' };
  }
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean) || clean.length > 254) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  return { valid: true, normalized: clean };
}

export function validatePhone(phone: unknown): { valid: boolean; error?: string; normalized?: string } {
  if (typeof phone !== 'string' || !phone.trim()) {
    return { valid: false, error: 'Phone number is required.' };
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return { valid: false, error: 'Phone number must contain between 8 and 15 digits.' };
  }
  return { valid: true, normalized: digits };
}

export function validatePositiveMoney(amount: unknown, fieldName = 'Amount'): { valid: boolean; error?: string; value?: number } {
  const num = Number(amount);
  if (!Number.isFinite(num) || isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number.` };
  }
  if (num < 0) {
    return { valid: false, error: `${fieldName} cannot be negative.` };
  }
  if (num > 1_000_000_000) {
    return { valid: false, error: `${fieldName} exceeds maximum allowable transaction limit.` };
  }
  // Round to 2 decimal places to avoid floating point precision leaks
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  return { valid: true, value: rounded };
}

export function sanitizePlainText(text: unknown, maxLength = 1000): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '') // Strip null & non-printable control chars
    .trim()
    .slice(0, maxLength);
}
