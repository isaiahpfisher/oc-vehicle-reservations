/**
 * Feature 5 — Vehicles
 * Spec: features/feature-5-vehicles.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const unauthorized = { message: "Unauthorized! No token provided." };
const forbidden = { message: "Admin or area admin role required." };
const wrongArea = { message: "Not authorized for the specified area." };

const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
  return bearer(body.token);
};

const validBody = (overrides = {}) => ({
  area_id: 1,
  vehicle_type_id: 1,
  university_id: "ABCD12345EFG",
  make: "Toyota",
  model: "Sienna",
  year: 2015,
  identifier: "1HGCM82633A004352",
  purchased_at: "2018-01-01",
  color: "gray",
  passenger_capacity: 8,
  license_plate: "ABC123",
  license_plate_expiration_date: "2027-09-01",
  status: "active",
  ...overrides,
});

const seed = async ({ typeIdentifier = "VIN", typeName = "Car", areaNames = ["Athletics"] } = {}) => {
  const areas = [];
  for (const name of areaNames) {
    areas.push(await db.area.create({ name, logo: "" }));
  }

  const type = await db.vehicleType.create({ name: typeName, identifier: typeIdentifier });
  return { areas, type };
};

const postVehicle = (headers, overrides = {}) =>
  request(app).post("/api/vehicles").set(headers).send(validBody(overrides));

const putVehicle = (headers, overrides = {}, id = 1) =>
  request(app).put(`/api/vehicles/${id}`).set(headers).send(validBody(overrides));

beforeEach(async () => {
  await syncTestDatabase();
});

const createErrors = [
  ["Admin user requests to create a vehicle with a missing area id", { area_id: "" }, "Missing area id."],
  ["Admin user requests to create a vehicle with a missing vehicle type id", { vehicle_type_id: "" }, "Missing vehicle type id."],
  ["Admin user requests to create a vehicle with a missing make", { make: "" }, "Missing make."],
  ["Admin user requests to create a vehicle with a missing model", { model: "" }, "Missing model."],
  ["Admin user requests to create a vehicle with a missing year", { year: "" }, "Missing year."],
  ["Admin user requests to create a vehicle with a missing identifier", { identifier: "" }, "Missing identifier."],
  ["Admin user requests to create a vehicle with a missing purchase date", { purchased_at: "" }, "Missing purchase date."],
  ["Admin user requests to create a vehicle with a missing color", { color: "" }, "Missing color."],
  ["Admin user requests to create a vehicle with a missing passenger capacity", { passenger_capacity: "" }, "Missing passenger capacity."],
  ["Admin user requests to create a vehicle with a missing status", { status: "" }, "Missing status."],
  ["Admin user requests to create a vehicle with a whitespace-only university id", { university_id: " " }, "Missing university id."],
  ["Admin user requests to create a vehicle with a whitespace-only make", { make: " " }, "Missing make."],
  ["Admin user requests to create a vehicle with a whitespace-only model", { model: " " }, "Missing model."],
  ["Admin user requests to create a vehicle with a whitespace-only identifier", { identifier: " " }, "Missing identifier."],
  ["Admin user requests to create a vehicle with a whitespace-only color", { color: " " }, "Missing color."],
  ["Admin user requests to create a vehicle with an area_id that does not correspond to an existing area_id", { area_id: 45 }, "Area does not exist."],
  ["Admin user requests to create a vehicle with a vehicle_type_id that does not correspond to an existing vehicle_type_id", { vehicle_type_id: 45 }, "Vehicle type does not exist."],
  ["Admin user requests to create a vehicle with a status other than active or retired", { status: "in use" }, "Invalid status."],
  ["Admin user requests to create a vehicle with a non-integer value for year", { year: "two thousand thirteen" }, "Year must be an integer."],
  ["Admin user requests to create a vehicle with a non-integer value for passenger capacity", { passenger_capacity: "eight" }, "Passenger capacity must be an integer."],
  ["Admin user requests to create a vehicle with a non-date value for purchase date", { purchased_at: "September 13" }, "Purchase date must be a numerical date."],
  ["Admin user requests to create a vehicle with a non-date value for license plate expiration date", { license_plate_expiration_date: "September 13" }, "License plate expiration date must be a numerical date."],
  ["Admin user requests to create a vehicle with a bad date format for purchase date", { purchased_at: "2013/01/01" }, "Purchase date must be in format 'yyyy-mm-dd'."],
  ["Admin user requests to create a vehicle with a bad date format for license plate expiration date", { license_plate_expiration_date: "2013/01/01" }, "License plate expiration date must be in format 'yyyy-mm-dd'."],
  ["Admin user requests to create a vehicle with university id longer than 255 characters", { university_id: "u".repeat(256) }, "University id too long."],
  ["Admin user requests to create a vehicle with make longer than 255 characters", { make: "m".repeat(256) }, "Make too long."],
  ["Admin user requests to create a vehicle with model longer than 255 characters", { model: "m".repeat(256) }, "Model too long."],
  ["Admin user requests to create a vehicle with color longer than 255 characters", { color: "c".repeat(256) }, "Color too long."],
  ["Admin user requests to create a vehicle with license plate longer than 8 characters", { license_plate: "PLATE1234" }, "License plate too long."],
  ["Admin user requests to create a vehicle with a year before 1950", { year: 1949 }, "Year must be between 1950 and the year after this year."],
  ["Admin user requests to create a vehicle with a year after the current year + 1", { year: new Date().getFullYear() + 2 }, "Year must be between 1950 and the year after this year."],
  ["Admin user requests to create a vehicle with a passenger capacity less than 1", { passenger_capacity: 0 }, "Passenger capacity must be between 1 and 300."],
  ["Admin user requests to create a vehicle with a passenger capacity greater than 300", { passenger_capacity: 301 }, "Passenger capacity must be between 1 and 300."],
  ["Admin user requests to create a vehicle with a purchase date before 1950", { purchased_at: "1949-12-31" }, "Purchase date must be between 1950 and the current date."],
  ["Admin user requests to create a vehicle with a purchase date after the current date", { purchased_at: "2999-01-01" }, "Purchase date must be between 1950 and the current date."],
];

const editErrors = [
  ["Admin user requests to edit a vehicle to have a missing area id", { area_id: "" }, "Missing area id."],
  ["Admin user requests to edit a vehicle to have a missing vehicle type id", { vehicle_type_id: "" }, "Missing vehicle type id."],
  ["Admin user requests to edit a vehicle to have a missing make", { make: "" }, "Missing make."],
  ["Admin user requests to edit a vehicle to have a missing model", { model: "" }, "Missing model."],
  ["Admin user requests to edit a vehicle to have a missing year", { year: "" }, "Missing year."],
  ["Admin user requests to edit a vehicle to have a missing identifier", { identifier: "" }, "Missing identifier."],
  ["Admin user requests to edit a vehicle to have a missing purchase date", { purchased_at: "" }, "Missing purchase date."],
  ["Admin user requests to edit a vehicle to have a missing color", { color: "" }, "Missing color."],
  ["Admin user requests to edit a vehicle to have a missing passenger capacity", { passenger_capacity: "" }, "Missing passenger capacity."],
  ["Admin user requests to edit a vehicle to have a missing status", { status: "" }, "Missing status."],
  ["Admin user requests to edit a vehicle to have a whitespace-only university id", { university_id: " " }, "Missing university id."],
  ["Admin user requests to edit a vehicle to have a whitespace-only make", { make: " " }, "Missing make."],
  ["Admin user requests to edit a vehicle to have a whitespace-only model", { model: " " }, "Missing model."],
  ["Admin user requests to edit a vehicle to have a whitespace-only identifier", { identifier: " " }, "Missing identifier."],
  ["Admin user requests to edit a vehicle to have a whitespace-only color", { color: " " }, "Missing color."],
  ["Admin user requests to edit a vehicle to have an area_id that does not correspond to an existing area_id", { area_id: 45 }, "Area does not exist."],
  ["Admin user requests to edit a vehicle to have a vehicle_type_id that does not correspond to an existing vehicle_type_id", { vehicle_type_id: 45 }, "Vehicle type does not exist."],
  ["Admin user requests to edit a vehicle to have a status other than active or retired", { status: "in use" }, "Invalid status."],
  ["Admin user requests to edit a vehicle to have a non-integer value for year", { year: "two thousand thirteen" }, "Year must be an integer."],
  ["Admin user requests to edit a vehicle to have a non-integer value for passenger capacity", { passenger_capacity: "eight" }, "Passenger capacity must be an integer."],
  ["Admin user requests to edit a vehicle to have a non-date value for purchase date", { purchased_at: "September 13" }, "Purchase date must be a numerical date."],
  ["Admin user requests to edit a vehicle to have a non-date value for license plate expiration date", { license_plate_expiration_date: "September 13" }, "License plate expiration date must be a numerical date."],
  ["Admin user requests to edit a vehicle to have a bad date format for purchase date", { purchased_at: "2013/01/01" }, "Purchase date must be in format 'yyyy-mm-dd'."],
  ["Admin user requests to edit a vehicle to have a bad date format for license plate expiration date", { license_plate_expiration_date: "2013/01/01" }, "License plate expiration date must be in format 'yyyy-mm-dd'."],
  ["Admin user requests to edit a vehicle to have a university id longer than 255 characters", { university_id: "u".repeat(256) }, "University id too long."],
  ["Admin user requests to edit a vehicle to have a make longer than 255 characters", { make: "m".repeat(256) }, "Make too long."],
  ["Admin user requests to edit a vehicle to have a model longer than 255 characters", { model: "m".repeat(256) }, "Model too long."],
  ["Admin user requests to edit a vehicle to have a color longer than 255 characters", { color: "c".repeat(256) }, "Color too long."],
  ["Admin user requests to edit a vehicle to have a license plate longer than 8 characters", { license_plate: "PLATE1234" }, "License plate too long."],
  ["Admin user requests to edit a vehicle to have a year before 1950", { year: 1949 }, "Year must be between 1950 and the year after this year."],
  ["Admin user requests to edit a vehicle to have a year after the current year + 1", { year: new Date().getFullYear() + 2 }, "Year must be between 1950 and the year after this year."],
  ["Admin user requests to edit a vehicle to have a passenger capacity less than 1", { passenger_capacity: 0 }, "Passenger capacity must be between 1 and 300."],
  ["Admin user requests to edit a vehicle to have a passenger capacity greater than 300", { passenger_capacity: 301 }, "Passenger capacity must be between 1 and 300."],
  ["Admin user requests to edit a vehicle to have a purchase date before 1950", { purchased_at: "1949-12-31" }, "Purchase date must be between 1950 and the current date."],
  ["Admin user requests to edit a vehicle to have a purchase date after the current date", { purchased_at: "2999-01-01" }, "Purchase date must be between 1950 and the current date."],
];

const editSuccess = [
  ["Admin user edits a vehicle university id", { university_id: "987654" }, "universityId", "987654"],
  ["Admin user edits a vehicle make", { make: "Honda" }, "make", "Honda"],
  ["Admin user edits a vehicle model", { model: "Accord" }, "model", "Accord"],
  ["Admin user edits a vehicle year", { year: 2016 }, "year", 2016],
  ["Admin user edits a vehicle identifier", { identifier: "1HGCM82633A004353" }, "identifier", "1HGCM82633A004353"],
  ["Admin user edits a vehicle purchase date", { purchased_at: "2026-09-14" }, "purchasedAt", "2026-09-14"],
  ["Admin user edits a vehicle color", { color: "white" }, "color", "white"],
  ["Admin user edits a vehicle passenger capacity", { passenger_capacity: 8 }, "passengerCapacity", 8],
  ["Admin user edits a vehicle license plate", { license_plate: "DEF456" }, "licensePlate", "DEF456"],
  ["Admin user edits a vehicle license plate expiration date", { license_plate_expiration_date: "2026-09-14" }, "licensePlateExpirationDate", "2026-09-14"],
  ["Admin user edits a vehicle status", { status: "retired" }, "status", "retired"],
];

describe("Feature 5 — Vehicles", () => {
  describe("US-5.1 — Create vehicles", () => {
    it("Admin user saves vehicle", async () => {
      const headers = await signIn();
      await seed();

      const response = await postVehicle(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 1,
        areaId: 1,
        vehicleTypeId: 1,
        universityId: "ABCD12345EFG",
        make: "Toyota",
        model: "Sienna",
        year: 2015,
        identifier: "1HGCM82633A004352",
        purchasedAt: "2018-01-01",
        color: "gray",
        passengerCapacity: 8,
        licensePlate: "ABC123",
        licensePlateExpirationDate: "2027-09-01",
        status: "active",
      });

      const listed = await request(app).get("/api/vehicles").set(headers);
      expect(listed.status).toBe(200);
      expect(listed.body).toHaveLength(1);
    });

    for (const [title, override, message] of createErrors) {
      it(title, async () => {
        const headers = await signIn();
        await seed();

        const response = await postVehicle(headers, override);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message });
      });
    }

    it("Admin user requests to create a vehicle with serial identifier longer than 255 characters", async () => {
      const headers = await signIn();
      await seed({ typeIdentifier: "Serial" });

      const response = await postVehicle(headers, { identifier: "s".repeat(256) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Serial number too long." });
    });

    it("Admin user requests to create a vehicle with VIN identifier less than 17 characters", async () => {
      const headers = await signIn();
      await seed();

      const response = await postVehicle(headers, { identifier: "SHORT" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "VIN must be 17 characters." });
    });

    it("Admin user requests to create a vehicle with VIN identifier more than 17 characters", async () => {
      const headers = await signIn();
      await seed();

      const response = await postVehicle(headers, { identifier: "1".repeat(18) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "VIN must be 17 characters." });
    });

    const saveBlankPlate = async () => {
      const headers = await signIn();
      await seed();

      const response = await postVehicle(headers, { license_plate: " " });

      expect(response.status).toBe(201);
      expect(response.body.licensePlate).toBeNull();
    };

    it("Admin user creates vehicle with a whitespace only license plate", saveBlankPlate);
    it("Admin user requests to create a vehicle with a whitespace-only license plate", saveBlankPlate);

    it("Admin user requests to create a vehicle with a non-unique university id", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await postVehicle(headers, {
        university_id: "ABCD12345EFG",
        identifier: "1HGCM82633A004353",
        license_plate: "DEF456",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "University id already taken." });
    });

    it("Admin user requests to create a vehicle with a non-unique identifier", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await postVehicle(headers, {
        university_id: "OTHER123",
        identifier: "1HGCM82633A004352",
        license_plate: "DEF456",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Identifier already taken." });
    });

    it("Admin user requests to create a vehicle with a non-unique license plate", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await postVehicle(headers, {
        university_id: "OTHER123",
        identifier: "1HGCM82633A004353",
        license_plate: "ABC123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "License plate already taken." });
    });
  });

  describe("US-5.4 — Edit and delete vehicles", () => {
    it("Admin user edits a vehicle area", async () => {
      const headers = await signIn();
      await seed({ areaNames: ["Athletics", "Maintenance"] });
      await postVehicle(headers);

      const response = await putVehicle(headers, { area_id: 2 });

      expect(response.status).toBe(200);
      expect(response.body.areaId).toBe(2);
    });

    it("Admin user edits a vehicle type with identifier of 17 characters", async () => {
      const headers = await signIn();
      await seed();
      await db.vehicleType.create({ name: "Bus", identifier: "VIN" });
      await postVehicle(headers);

      const response = await putVehicle(headers, { vehicle_type_id: 2 });

      expect(response.status).toBe(200);
      expect(response.body.vehicleTypeId).toBe(2);
    });

    for (const [title, override, key, expected] of editSuccess) {
      it(title, async () => {
        const headers = await signIn();
        await seed();
        await postVehicle(headers);

        const response = await putVehicle(headers, override);

        expect(response.status).toBe(200);
        expect(response.body[key]).toBe(expected);
      });
    }

    for (const [title, override, message] of editErrors) {
      it(title, async () => {
        const headers = await signIn();
        await seed();
        await postVehicle(headers);

        const response = await putVehicle(headers, override);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message });
      });
    }

    it("Admin user requests to edit a vehicle to have a serial identifier longer than 255 characters", async () => {
      const headers = await signIn();
      await seed({ typeIdentifier: "Serial" });
      await postVehicle(headers);

      const response = await putVehicle(headers, { identifier: "s".repeat(256) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Serial number too long." });
    });

    it("Admin user requests to edit a vehicle to have a VIN identifier less than 17 characters", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await putVehicle(headers, { identifier: "SHORT" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "VIN must be 17 characters." });
    });

    it("Admin user requests to edit a vehicle to have a VIN identifier more than 17 characters", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await putVehicle(headers, { identifier: "1".repeat(18) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "VIN must be 17 characters." });
    });

    const clearPlate = async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await putVehicle(headers, { license_plate: " " });

      expect(response.status).toBe(200);
      expect(response.body.licensePlate).toBeNull();
    };

    it("Admin user edits a vehicle to have a whitespace only license plate", clearPlate);
    it("Admin user requests to edit a vehicle to have a whitespace-only license plate", clearPlate);

    it("Admin user requests to edit a vehicle to have a non-unique university id", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);
      await postVehicle(headers, {
        university_id: "OTHER123",
        identifier: "1HGCM82633A004353",
        license_plate: "DEF456",
      });

      const response = await putVehicle(headers, { university_id: "OTHER123" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "University id already taken." });
    });

    it("Admin user requests to edit a vehicle to have a non-unique identifier", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);
      await postVehicle(headers, {
        university_id: "OTHER123",
        identifier: "1HGCM82633A004353",
        license_plate: "DEF456",
      });

      const response = await putVehicle(headers, { identifier: "1HGCM82633A004353" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Identifier already taken." });
    });

    it("Admin user requests to edit a vehicle to have a non-unique license plate", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);
      await postVehicle(headers, {
        university_id: "OTHER123",
        identifier: "1HGCM82633A004353",
        license_plate: "DEF456",
      });

      const response = await putVehicle(headers, { license_plate: "DEF456" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "License plate already taken." });
    });

    it("Admin user deletes a vehicle", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await request(app).delete("/api/vehicles/1").set(headers);

      expect(response.status).toBe(200);
      expect(await db.vehicle.count()).toBe(0);
    });

    it("Admin user updates a vehicle that does not exist", async () => {
      const headers = await signIn();

      const response = await putVehicle(headers, {}, 999);

      expect(response.status).toBe(404);
    });

    it("Admin user updates a vehicle with an invalid vehicleId", async () => {
      const headers = await signIn();

      const response = await request(app).put("/api/vehicles/abc").set(headers).send(validBody());

      expect(response.status).toBe(400);
    });

    it("Admin user deletes a vehicle that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/vehicles/999").set(headers);

      expect(response.status).toBe(404);
    });

    it("Admin user deletes a vehicle with an invalid vehicleId", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/vehicles/abc").set(headers);

      expect(response.status).toBe(400);
    });
  });

  describe("US-5.5 — Access", () => {
    it("Unauthenticated API request to vehicles", async () => {
      const response = await request(app).get("/api/vehicles");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to a particular vehicle", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await request(app).get("/api/vehicles/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to create a vehicle", async () => {
      const response = await request(app).post("/api/vehicles").send(validBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to update a vehicle", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await request(app).put("/api/vehicles/1").send(validBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to delete a vehicle", async () => {
      const headers = await signIn();
      await seed();
      await postVehicle(headers);

      const response = await request(app).delete("/api/vehicles/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Signed-in user without admin or area admin role API request to vehicles", async () => {
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await request(app).get("/api/vehicles").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to a particular vehicle", async () => {
      const admin = await signIn();
      await seed();
      await postVehicle(admin);
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await request(app).get("/api/vehicles/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to create a vehicle", async () => {
      await seed();
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await postVehicle(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to update a vehicle", async () => {
      const admin = await signIn();
      await seed();
      await postVehicle(admin);
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await putVehicle(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to delete a vehicle", async () => {
      const admin = await signIn();
      await seed();
      await postVehicle(admin);
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await request(app).delete("/api/vehicles/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user with area admin role API request to a particular vehicle of different area", async () => {
      await seed({ areaNames: ["Athletics", "Maintenance"] });
      await db.vehicle.create({
        areaId: 2,
        vehicleTypeId: 1,
        universityId: "ABCD12345EFG",
        make: "Toyota",
        model: "Sienna",
        year: 2015,
        identifier: "1HGCM82633A004352",
        purchasedAt: "2018-01-01",
        color: "gray",
        passengerCapacity: 8,
        status: "active",
      });
      const headers = await signIn([{ role: "area_admin", areaId: 1 }], { email: "area@oc.edu" });

      const response = await request(app).get("/api/vehicles/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });

    it("Signed-in user with area admin role API request to create a vehicle in a different area", async () => {
      await seed({ areaNames: ["Athletics", "Maintenance"] });
      const headers = await signIn([{ role: "area_admin", areaId: 1 }], { email: "area@oc.edu" });

      const response = await postVehicle(headers, { area_id: 2 });

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });

    it("Signed-in user with area admin role API request to update a vehicle to have a different area", async () => {
      await seed();
      const admin = await signIn();
      await postVehicle(admin);
      const headers = await signIn([{ role: "area_admin", areaId: 1 }], { email: "area@oc.edu" });

      const response = await putVehicle(headers, { area_id: 2 });

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });

    it("Signed-in user with area admin role API request to update a vehicle with a different area", async () => {
      await seed({ areaNames: ["Athletics", "Maintenance"] });
      await db.vehicle.create({
        areaId: 2,
        vehicleTypeId: 1,
        universityId: "ABCD12345EFG",
        make: "Toyota",
        model: "Sienna",
        year: 2015,
        identifier: "1HGCM82633A004352",
        purchasedAt: "2018-01-01",
        color: "gray",
        passengerCapacity: 8,
        status: "active",
      });
      const headers = await signIn([{ role: "area_admin", areaId: 1 }], { email: "area@oc.edu" });

      const response = await putVehicle(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });

    it("Signed-in user with area admin role API request to delete a vehicle of a different area", async () => {
      await seed({ areaNames: ["Athletics", "Maintenance"] });
      await db.vehicle.create({
        areaId: 2,
        vehicleTypeId: 1,
        universityId: "ABCD12345EFG",
        make: "Toyota",
        model: "Sienna",
        year: 2015,
        identifier: "1HGCM82633A004352",
        purchasedAt: "2018-01-01",
        color: "gray",
        passengerCapacity: 8,
        status: "active",
      });
      const headers = await signIn([{ role: "area_admin", areaId: 1 }], { email: "area@oc.edu" });

      const response = await request(app).delete("/api/vehicles/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });

    it("Area admin vehicle list includes only their areas", async () => {
      await seed({ areaNames: ["Athletics", "Maintenance"] });
      await db.vehicle.create({
        areaId: 1,
        vehicleTypeId: 1,
        universityId: "MINE",
        make: "Toyota",
        model: "Sienna",
        year: 2015,
        identifier: "1HGCM82633A004352",
        purchasedAt: "2018-01-01",
        color: "gray",
        passengerCapacity: 8,
        status: "active",
      });
      await db.vehicle.create({
        areaId: 2,
        vehicleTypeId: 1,
        universityId: "THEIRS",
        make: "Honda",
        model: "Accord",
        year: 2016,
        identifier: "1HGCM82633A004353",
        purchasedAt: "2018-01-01",
        color: "white",
        passengerCapacity: 5,
        status: "active",
      });
      const headers = await signIn([{ role: "area_admin", areaId: 1 }], { email: "area@oc.edu" });

      const response = await request(app).get("/api/vehicles").set(headers);

      expect(response.status).toBe(200);
      expect(response.body.map((vehicle) => vehicle.universityId)).toEqual(["MINE"]);
    });
  });
});
