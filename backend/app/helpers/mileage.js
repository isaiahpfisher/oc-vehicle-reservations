import logger from "../config/logger.js";

const CAMPUS_ADDRESS =
  process.env.CAMPUS_ADDRESS || "Oklahoma Christian University, 2501 E Memorial Rd, Edmond, OK 73013";
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const METERS_PER_MILE = 1609.344;

export const formatAddress = (destination) =>
  [destination.addressLine1 || destination.name, destination.addressLine2, destination.city, destination.state, destination.zipCode]
    .filter(Boolean)
    .join(", ");

/** Round trip campus → stops (in order) → campus, driven, via the Google Routes API. */
const googleMiles = async (stops) => {
  const response = await fetch(ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { address: CAMPUS_ADDRESS },
      destination: { address: CAMPUS_ADDRESS },
      intermediates: stops.map((stop) => ({ address: formatAddress(stop) })),
      travelMode: "DRIVE",
    }),
  });

  if (!response.ok) {
    throw new Error(`Routes API responded ${response.status}.`);
  }

  const meters = (await response.json()).routes?.[0]?.distanceMeters;
  if (meters === undefined) {
    throw new Error("Routes API returned no route.");
  }

  return Math.round(meters / METERS_PER_MILE);
};

/**
 * Fallback from each stop's saved `milesFromCampus`: out to the first stop, between stops, and back.
 * Exact when stops lie on one road out of town, otherwise an underestimate. Stops with no saved distance count as 0.
 */
const savedMiles = (stops) => {
  const miles = stops.map((stop) => stop.milesFromCampus ?? 0);
  const between = miles.slice(1).reduce((sum, value, i) => sum + Math.abs(value - miles[i]), 0);
  return miles[0] + between + miles[miles.length - 1];
};

/** Estimated round-trip miles for a request's ordered stops (FR-007). */
export const estimateMiles = async (stops) => {
  if (!stops.length) {
    return 0;
  }

  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      return await googleMiles(stops);
    } catch (err) {
      logger.warn(`Google mileage estimate failed, using saved distances: ${err.message}`);
    }
  }

  return savedMiles(stops);
};
