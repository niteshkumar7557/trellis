/**
 * Client-side form validation for the auth screens.
 *
 * This is deliberately backend-free: it only decides whether the UI should
 * advance to its "preview" state. Wire real auth (JWT + refresh tokens,
 * Google OAuth2) behind the submit handlers when the API exists.
 */

export type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  const capped = Math.min(score, 4) as PasswordStrength["score"];
  return { score: capped, label: STRENGTH_LABELS[capped] };
}

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

export function validateLogin(values: LoginValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "That doesn't look like a valid email.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function validateRegister(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Enter your name.";
  } else if (name.length < 2) {
    errors.name = "Use at least 2 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "That doesn't look like a valid email.";
  }

  if (!values.password) {
    errors.password = "Choose a password.";
  } else if (values.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  if (!values.terms) {
    errors.terms = "Please accept the terms to continue.";
  }

  return errors;
}
