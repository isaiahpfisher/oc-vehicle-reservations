export const DRIVER_STATUS_OPTIONS = [
  { title: "Pending", value: "pending" },
  { title: "Approved", value: "approved" },
  { title: "Denied", value: "denied" },
  { title: "Revoked", value: "revoked" },
  { title: "Former", value: "former" },
];

const STATUS_COLORS = { pending: "warning", approved: "success", denied: "error", revoked: "error" };

export const driverStatusLabel = (status) => DRIVER_STATUS_OPTIONS.find(({ value }) => value === status)?.title ?? status;

export const driverStatusColor = (status) => STATUS_COLORS[status];

export const LICENSE_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC",
  "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());

export const isValidPhoneNumber = (value) => /^\d{3}-\d{3}-\d{4}$/.test(String(value ?? "").trim());

/**
 * UI/UX backlog #65: accept a phone number however it's typed — (405) 425-1234, 405.425.1234, 4054251234, +1 405… —
 * and store it the one way the API takes (405-425-1234). Anything that isn't 10 digits (11 with a leading 1) is left
 * as typed, so the format check can say what's wrong.
 */
export const normalizePhoneNumber = (value) => {
  const text = String(value ?? "").trim();
  let digits = text.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : text;
};

const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** A license is valid through its expiration date. */
export const isLicenseExpired = (driver) => driver.licenseExpirationDate < today();

/** UI/UX backlog #51: still valid, but expiring within `days` (30 by default) — time to ask for the renewal. */
export const isLicenseExpiringSoon = (driver, days = 30) => {
  if (isLicenseExpired(driver)) return false;
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  const limit = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`;
  return driver.licenseExpirationDate <= limit;
};

/** Days from today until the license expires (negative once it has). */
export const daysUntilLicenseExpires = (driver) =>
  Math.round((Date.parse(`${driver.licenseExpirationDate}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / (24 * 60 * 60 * 1000));

/** Drivers whose license matters: approved ones drive, and pending ones are about to. */
const ACTIVE_DRIVER_STATUSES = ["approved", "pending"];

/** Expired or expiring within 30 days, for a driver who drives (or is about to). */
export const licenseNeedsRenewal = (driver) =>
  ACTIVE_DRIVER_STATUSES.includes(driver.status) && (isLicenseExpired(driver) || isLicenseExpiringSoon(driver));

/** "Expires today", "Expires tomorrow", "Expires in 12 days". */
export const licenseExpiresInText = (driver) => {
  const days = daysUntilLicenseExpires(driver);
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
};

/** Every search word must appear in the driver's first name, last name, phone number, or email. */
export const driverMatchesQuery = (driver, query) => {
  if (!query?.trim()) return true;

  const text = `${driver.firstName} ${driver.lastName} ${driver.phoneNumber} ${driver.email ?? ""}`.toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
};

export const driverHasStatus = (driver, status) => !status || driver.status === status;
