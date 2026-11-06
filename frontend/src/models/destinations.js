export const AVAILABILITY_OPTIONS = [
  { title: "Official", value: true },
  { title: "Unofficial", value: false },
];

/** Every search word must appear in the destination's name or address. */
export const destinationMatchesQuery = (destination, query) => {
  if (!query?.trim()) return true;

  const text = [
    destination.name,
    destination.address_line_1,
    destination.address_line_2,
    destination.city,
    destination.state,
    destination.zip_code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
};

/** `availability` is true (Official), false (Unofficial), or null (either). */
export const destinationHasAvailability = (destination, availability) =>
  availability === null || availability === undefined || destination.is_saved === availability;
