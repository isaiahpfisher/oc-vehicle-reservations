import db from "../models/index.js";

/** Lowercase, no punctuation, single spaces: "660 OK-66." and "660 ok 66" compare equal. */
const plain = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * UI/UX backlog #6: whether two destinations are the same place: street address, unit, city and state match (ignoring
 * case and punctuation), and the ZIP codes match when both have one.
 */
export const sameAddress = (a, b) =>
  plain(a.addressLine1) === plain(b.addressLine1) &&
  plain(a.addressLine2) === plain(b.addressLine2) &&
  plain(a.city) === plain(b.city) &&
  plain(a.state) === plain(b.state) &&
  (!a.zipCode || !b.zipCode || plain(a.zipCode) === plain(b.zipCode));

/**
 * UI/UX backlog #6: the destination already stored at this address, so a custom stop reuses it instead of adding a
 * duplicate. Prefers an official (saved) destination, then the oldest. `null` when the address is new.
 */
export const existingDestinationAt = async (fields) => {
  const candidates = await db.destination.findAll({
    where: { city: fields.city, state: fields.state },
    order: [
      ["isSaved", "DESC"],
      ["id", "ASC"],
    ],
  });
  return candidates.find((candidate) => sameAddress(candidate, fields)) ?? null;
};
