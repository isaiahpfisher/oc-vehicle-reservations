import logger from "../config/logger.js";

const CAMPUS_ADDRESS =
  process.env.CAMPUS_ADDRESS || "Oklahoma Christian University, 2501 E Memorial Rd, Edmond, OK 73013";
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const METERS_PER_MILE = 1609.344;
/** FR-009: Routes bills more than 10 intermediate stops at a higher tier, so trips stop at 10. */
export const MAX_STOPS = 10;

if (!process.env.GOOGLE_MAPS_API_KEY && process.env.NODE_ENV !== "test") {
  logger.warn("GOOGLE_MAPS_API_KEY is not set: only single saved-destination trips get a mileage estimate.");
}

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
    // Google explains key / API-enablement problems in the body; surface it in the log.
    const detail = (await response.json().catch(() => null))?.error?.message;
    throw new Error(`Routes API responded ${response.status}${detail ? `: ${detail}` : "."}`);
  }

  const meters = (await response.json()).routes?.[0]?.distanceMeters;
  if (meters === undefined) {
    throw new Error("Routes API returned no route.");
  }

  return Math.round(meters / METERS_PER_MILE);
};

/**
 * Fallback from a saved `milesFromCampus`: out and back to a single saved stop.
 * Distances from campus can't give the legs between stops, and custom stops have none, so anything else is unknown (null)
 * rather than a guess that understates the trip.
 */
export const savedMiles = (stops) => {
  const miles = stops.length === 1 ? stops[0].milesFromCampus : null;
  return miles == null ? null : miles * 2;
};

/** Estimated round-trip miles for a request's ordered stops (FR-007), or null when it can't be estimated. */
export const estimateMiles = async (stops) => {
  if (!stops.length) {
    return null;
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
