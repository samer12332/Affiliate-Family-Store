const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;

export function validateEmail(value: string) {
  return EMAIL_REGEX.test(String(value || '').trim().toLowerCase());
}

export function validatePhone(value: string) {
  return PHONE_REGEX.test(String(value || '').trim());
}
