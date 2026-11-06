/**
 * Google Places (New) for custom-address search (Feature 8, FR-008).
 * Billing: autocomplete calls sharing a session token are one session, ended by a Place Details call.
 * Details asks for `addressComponents` only, which keeps it in the Essentials tier (`displayName` would be Pro).
 */
const PLACES_URL = "https://places.googleapis.com/v1";
// Suggestions are biased toward campus (Oklahoma Christian University, Edmond, OK), not limited to it.
const CAMPUS_LOCATION = { latitude: 35.6386, longitude: -97.4707 };
const BIAS_RADIUS_METERS = 50000; // the API's maximum

export const placesEnabled = () => !!process.env.GOOGLE_MAPS_API_KEY;

const googleFetch = async (url, { fieldMask, ...options }) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Places API responded ${response.status}${body?.error?.message ? `: ${body.error.message}` : "."}`);
  }

  return body ?? {};
};

/** Address suggestions for `input`: `[{ placeId, name, description }]`. */
export const autocomplete = async (input, sessionToken) => {
  const { suggestions = [] } = await googleFetch(`${PLACES_URL}/places:autocomplete`, {
    method: "POST",
    fieldMask: "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["us"],
      locationBias: { circle: { center: CAMPUS_LOCATION, radius: BIAS_RADIUS_METERS } },
    }),
  });

  return suggestions
    .map(({ placePrediction }) => placePrediction)
    .filter(Boolean)
    .map(({ placeId, structuredFormat }) => ({
      placeId,
      name: structuredFormat?.mainText?.text ?? "",
      description: structuredFormat?.secondaryText?.text ?? "",
    }));
};

/** Destination address fields for a suggestion: `{ addressLine1, addressLine2, city, state, zipCode }`. */
export const placeAddress = async (placeId, sessionToken) => {
  const { addressComponents = [] } = await googleFetch(
    `${PLACES_URL}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    { method: "GET", fieldMask: "addressComponents" },
  );

  const part = (type, text = "longText") => addressComponents.find(({ types }) => types?.includes(type))?.[text] ?? "";

  return {
    addressLine1: [part("street_number"), part("route")].filter(Boolean).join(" "),
    addressLine2: part("subpremise"),
    city: part("locality") || part("postal_town") || part("sublocality") || part("administrative_area_level_2"),
    state: part("administrative_area_level_1", "shortText"),
    zipCode: part("postal_code"),
  };
};
