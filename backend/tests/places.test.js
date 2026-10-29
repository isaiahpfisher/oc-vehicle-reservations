/**
 * Feature 8 — Vehicle Request Management (custom address search, FR-008)
 * Spec: features/feature-8-vehicle-requests.md
 */
import { jest } from "@jest/globals";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const SESSION = "0b6f3c1e-3a52-4d3e-9a51-6d1f2c7e8b90";

const signIn = async () => {
  const { body } = await registerUser({ email: "jane@example.com" });
  return bearer(body.token);
};

const search = (headers, input = "202 E Oklahoma", sessionToken = SESSION) =>
  request(app).get("/api/places/autocomplete").query({ input, sessionToken }).set(headers);

const details = (headers, placeId = "ChIJ-place_1", sessionToken = SESSION) =>
  request(app).get(`/api/places/${placeId}`).query({ sessionToken }).set(headers);

/** Stub Google: `responses` are returned in order; every call's url and init are kept. tests/setup.js clears the real key. */
const stubGoogle = (...responses) => {
  const calls = [];
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    const { status = 200, body } = responses.shift();
    return { ok: status < 400, status, json: async () => body };
  });
  return calls;
};

const realFetch = global.fetch;

beforeEach(async () => {
  await syncTestDatabase();
});

afterEach(() => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  global.fetch = realFetch;
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 8 — Vehicle Request Management", () => {
  describe("US-8.1 — Create vehicle request", () => {
    it("User searches for a custom address", async () => {
      const headers = await signIn();
      const calls = stubGoogle(
        {
          body: {
            suggestions: [
              {
                placePrediction: {
                  placeId: "ChIJ-place_1",
                  structuredFormat: { mainText: { text: "202 E Oklahoma Ave" }, secondaryText: { text: "Guthrie, OK, USA" } },
                },
              },
            ],
          },
        },
        {
          body: {
            addressComponents: [
              { longText: "202", shortText: "202", types: ["street_number"] },
              { longText: "East Oklahoma Avenue", shortText: "E Oklahoma Ave", types: ["route"] },
              { longText: "Suite 4", shortText: "Suite 4", types: ["subpremise"] },
              { longText: "Guthrie", shortText: "Guthrie", types: ["locality", "political"] },
              { longText: "Oklahoma", shortText: "OK", types: ["administrative_area_level_1", "political"] },
              { longText: "73044", shortText: "73044", types: ["postal_code"] },
            ],
          },
        },
      );

      const suggestions = await search(headers);
      expect(suggestions.status).toBe(200);
      expect(suggestions.body).toEqual([{ placeId: "ChIJ-place_1", name: "202 E Oklahoma Ave", description: "Guthrie, OK, USA" }]);

      const address = await details(headers);
      expect(address.status).toBe(200);
      expect(address.body).toEqual({
        addressLine1: "202 East Oklahoma Avenue",
        addressLine2: "Suite 4",
        city: "Guthrie",
        state: "OK",
        zipCode: "73044",
      });

      // One billing session: both calls carry the same token, and details stays in the Essentials tier.
      expect(calls[0].body).toMatchObject({ input: "202 E Oklahoma", sessionToken: SESSION, includedRegionCodes: ["us"] });
      expect(calls[1].url).toContain(`places/ChIJ-place_1?sessionToken=${SESSION}`);
      expect(calls[1].init.headers["X-Goog-FieldMask"]).toBe("addressComponents");
    });

    it("requires a session", async () => {
      expect((await search({})).status).toBe(401);
      expect((await details({})).status).toBe(401);
    });

    it("rejects bad input before calling Google", async () => {
      const headers = await signIn();
      const calls = stubGoogle();

      expect((await search(headers, "ab")).body).toEqual({ message: "Enter 3 to 200 characters to search." });
      expect((await search(headers, "a".repeat(201))).status).toBe(400);
      expect((await search(headers, "202 E Oklahoma", "")).body).toEqual({ message: "Invalid session token." });
      expect((await search(headers, "202 E Oklahoma", "bad token!")).status).toBe(400);
      expect((await details(headers, "bad.id")).body).toEqual({ message: "Invalid place id." });
      expect((await details(headers, "ChIJ-place_1", "")).body).toEqual({ message: "Invalid session token." });
      expect(calls).toHaveLength(0);
    });

    it("reports address search as unavailable without a Google key", async () => {
      const headers = await signIn();

      const response = await search(headers);

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ message: "Address search isn't available." });
    });

    it("reports a failed Google request", async () => {
      const headers = await signIn();
      stubGoogle({ status: 403, body: { error: { message: "API key not valid." } } });

      const response = await search(headers);

      expect(response.status).toBe(502);
      expect(response.body).toEqual({ message: "Address search failed." });
    });
  });
});
