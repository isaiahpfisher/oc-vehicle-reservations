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

export const isValidPhoneNumber = (value) => /^\d{3}-\d{3}-\d{4}$/.test(String(value ?? "").trim());

const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** A license is valid through its expiration date. */
export const isLicenseExpired = (driver) => driver.licenseExpirationDate < today();

/** Every search word must appear in the driver's first name, last name, or phone number. */
export const driverMatchesQuery = (driver, query) => {
  if (!query?.trim()) return true;

  const text = `${driver.firstName} ${driver.lastName} ${driver.phoneNumber}`.toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
};

export const driverHasStatus = (driver, status) => !status || driver.status === status;
