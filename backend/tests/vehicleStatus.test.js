/**
 * Feature 18 — Vehicle Status
 * Spec: features/feature-18-vehicle-status.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithRoles } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const pad = (value) => String(value).padStart(2, "0");

/** Local `YYYY-MM-DD`, `offset` days from today. */
const day = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

let fx;

const signInWithRoles = async (roles, email) => {
  const { body } = await createUserWithRoles(roles, { email });
  return { headers: bearer(body.token), userId: body.userId };
};

const seed = async () => {
  const athletics = await db.area.create({ name: "Athletics" });
  const music = await db.area.create({ name: "Music" });
  const van = await db.vehicleType.create({ name: "Van", identifier: "VIN" });
  const requester = await registerUser({ email: "requester@example.com" });

  return {
    athletics,
    music,
    van,
    requester: { headers: bearer(requester.body.token), userId: requester.body.userId },
    admin: await signInWithRoles(["admin"], "admin@example.com"),
    areaAdmin: await signInWithRoles([{ role: "area_admin", areaId: athletics.id }], "aa@example.com"),
    maintenance: await signInWithRoles(["maintenance"], "fixer@example.com"),
    driver: await db.driver.create({
      firstName: "Dana",
      lastName: "Driver",
      email: "dana.driver@example.com",
      phoneNumber: "405-555-0100",
      licenseState: "OK",
      licenseExpirationDate: "2099-01-01",
      status: "approved",
    }),
    near: await db.destination.create({ name: "Near", addressLine1: "1 Near Way", city: "Edmond", state: "OK", isSaved: true, milesFromCampus: 10 }),
    far: await db.destination.create({ name: "Far", addressLine1: "1 Far Way", city: "Tulsa", state: "OK", isSaved: true, milesFromCampus: 100 }),
  };
};

let vehicleCount = 0;
const makeVehicle = (overrides = {}) => {
  vehicleCount += 1;
  const universityId = overrides.universityId ?? `V-${vehicleCount}`;
  return db.vehicle.create({
    areaId: fx.athletics.id,
    vehicleTypeId: fx.van.id,
    universityId,
    make: "Ford",
    model: "Transit",
    year: 2022,
    identifier: universityId.padEnd(17, "0"),
    purchasedAt: day(-30),
    color: "White",
    passengerCapacity: 12,
    status: "active",
    ...overrides,
  });
};

const reading = (vehicle, odometerReading, recordedAt) =>
  db.mileageLog.create({ vehicleId: vehicle.id, userId: fx.maintenance.userId, odometerReading, recordedAt });

const service = async (vehicle, serviceType, miles, servicedAt) => {
  const log = await reading(vehicle, miles, servicedAt);
  return db.serviceLog.create({
    vehicleId: vehicle.id,
    userId: fx.maintenance.userId,
    serviceTypeId: serviceType.id,
    mileageLogId: log.id,
    servicedAt,
  });
};

const serviceType = (name, { days = null, miles = null } = {}) =>
  db.serviceType.create({ name, service_frequency_days: days, service_frequency_miles: miles });

const need = (vehicle, overrides = {}) =>
  db.maintenanceNeed.create({
    vehicleId: vehicle.id,
    authorId: fx.maintenance.userId,
    title: "Brakes",
    outOfService: true,
    priority: "High",
    status: "Open",
    ...overrides,
  });

/** An all-day trip from `start` through `end` (`YYYY-MM-DD`), stored the way Feature 8 stores it. */
const trip = async (vehicles, { start, end, status = "reserved", estimatedMiles = 20, areaId, driver, stop } = {}) => {
  const row = await db.vehicleRequest.create({
    userId: fx.requester.userId,
    areaId: areaId ?? fx.athletics.id,
    purpose: "Trip",
    startAt: new Date(`${start}T00:00:00.000Z`),
    endAt: new Date(`${end ?? start}T00:00:00.000Z`),
    allDay: true,
    numberOfPeople: 4,
    estimatedMiles,
    status,
    approverId: status === "pending" ? null : fx.admin.userId,
    approvedAt: status === "pending" ? null : new Date(),
  });
  await db.vehicleRequestDriver.create({ vehicleRequestId: row.id, driverId: (driver ?? fx.driver).id });
  await db.vehicleRequestDestination.create({ vehicleRequestId: row.id, destinationId: (stop ?? fx.near).id, stopOrder: 1 });
  await db.vehicleRequestVehicle.bulkCreate(vehicles.map((vehicle) => ({ vehicleRequestId: row.id, vehicleId: vehicle.id })));
  return row;
};

const getVehicle = async (vehicle, user = fx.admin) =>
  (await request(app).get(`/api/vehicles/${vehicle.id}`).set(user.headers)).body;
const condition = async (vehicle, user) => (await getVehicle(vehicle, user)).condition;
const statusOf = async (vehicle) => (await condition(vehicle)).status;
const serviceNamed = async (vehicle, name) =>
  (await condition(vehicle)).services.find(({ serviceType }) => serviceType.name === name);

const assign = (requestId, vehicles, user = fx.admin) =>
  request(app)
    .put(`/api/requests/${requestId}`)
    .set(user.headers)
    .send({ vehicles: vehicles.map(({ id }) => id) });

const options = async (requestId) => {
  const { body } = await request(app).get(`/api/requests/${requestId}/vehicle-options`).set(fx.admin.headers);
  return Object.fromEntries(body.map((option) => [option.vehicle.universityId, option]));
};
const problemTypes = (option) => option.problems.map(({ type }) => type);

const getRequest = async (id, user = fx.admin) => (await request(app).get(`/api/requests/${id}`).set(user.headers)).body;
const vehicleProblems = async (requestRow, vehicle) =>
  ((await getRequest(requestRow.id)).vehicleProblems[vehicle.id] ?? []).map(({ type }) => type);

beforeEach(async () => {
  await syncTestDatabase();
  vehicleCount = 0;
  fx = await seed();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 18 — Vehicle Status", () => {
  describe("US-18.1 — See vehicle status on the vehicle list", () => {
    it("Vehicle list displays in-depth status of each vehicle", async () => {
      const available = await makeVehicle();
      const retired = await makeVehicle({ status: "retired" });
      const broken = await makeVehicle();
      await need(broken);

      const response = await request(app).get("/api/vehicles").set(fx.admin.headers);

      expect(response.status).toBe(200);
      const byId = Object.fromEntries(response.body.map((vehicle) => [vehicle.id, vehicle]));
      expect(byId[available.id].condition).toMatchObject({ status: "available", reasons: [] });
      expect(byId[retired.id].condition).toMatchObject({ status: "retired", reasons: [{ status: "retired" }] });
      expect(byId[broken.id].condition).toMatchObject({
        status: "out_of_service",
        reasons: [{ status: "out_of_service", message: "Out of service: Brakes." }],
      });
      expect(byId[available.id].vehicleType).toEqual({ id: fx.van.id, name: "Van" });
      expect(byId[available.id].condition.mileage).toMatchObject({ miles: 0, reading: null });
    });

    it("Vehicle with nothing due shows Available", async () => {
      await serviceType("Oil Change", { days: 180, miles: 5000 });
      const vehicle = await makeVehicle({ licensePlateExpirationDate: day(365) });
      await reading(vehicle, 1000, day(-1));

      expect(await condition(vehicle)).toMatchObject({ status: "available", reasons: [] });
    });

    it("Retired vehicle shows Retired even with an out-of-service maintenance need", async () => {
      const vehicle = await makeVehicle({ status: "retired" });
      await need(vehicle);

      const { status, reasons } = await condition(vehicle);
      expect(status).toBe("retired");
      expect(reasons.map(({ status: reason }) => reason)).toEqual(["retired", "out_of_service"]);
    });

    it("Out of Service outranks Service Overdue", async () => {
      await serviceType("Oil Change", { miles: 5000 });
      const vehicle = await makeVehicle();
      await reading(vehicle, 6000, day(-1));
      await need(vehicle);

      const { status, reasons } = await condition(vehicle);
      expect(status).toBe("out_of_service");
      expect(reasons.map(({ status: reason }) => reason)).toEqual(["out_of_service", "service_overdue"]);
    });

    it("Service Overdue outranks Plate Expired", async () => {
      await serviceType("Oil Change", { miles: 5000 });
      const vehicle = await makeVehicle({ licensePlateExpirationDate: day(-10) });
      await reading(vehicle, 6000, day(-1));

      const { status, reasons } = await condition(vehicle);
      expect(status).toBe("service_overdue");
      expect(reasons.map(({ status: reason }) => reason)).toEqual(["service_overdue", "plate_expired"]);
      expect(reasons[0].message).toBe("Oil Change is overdue by 1,000 mi.");
    });

    it("Plate Expired outranks Service Due Soon", async () => {
      await serviceType("Oil Change", { miles: 5000 });
      const vehicle = await makeVehicle({ licensePlateExpirationDate: day(-10) });
      await reading(vehicle, 4800, day(-1));

      const { status, reasons } = await condition(vehicle);
      expect(status).toBe("plate_expired");
      expect(reasons.map(({ status: reason }) => reason)).toEqual(["plate_expired", "service_due_soon"]);
    });

    it("Plate that expired yesterday shows Plate Expired", async () => {
      const expired = await makeVehicle({ licensePlateExpirationDate: day(-1) });
      const today = await makeVehicle({ licensePlateExpirationDate: day(0) });
      const none = await makeVehicle({ licensePlateExpirationDate: null });

      expect(await statusOf(expired)).toBe("plate_expired");
      // A plate is good through its expiration date (but expiring), and a vehicle without one is never flagged.
      expect(await statusOf(today)).toBe("plate_expiring");
      expect(await statusOf(none)).toBe("available");
    });

    // A plate that runs out within 30 days needs renewing, so it's flagged before it lapses.
    it("Plate expiring within 30 days shows Plate Expiring", async () => {
      const tomorrow = await makeVehicle({ licensePlateExpirationDate: day(1) });
      const at30 = await makeVehicle({ licensePlateExpirationDate: day(30) });
      const at31 = await makeVehicle({ licensePlateExpirationDate: day(31) });

      const { status, reasons } = await condition(tomorrow);
      expect(status).toBe("plate_expiring");
      expect(reasons).toEqual([{ status: "plate_expiring", message: expect.stringMatching(/^License plate expires tomorrow \(.+\)\.$/) }]);
      expect((await condition(at30)).reasons[0].message).toMatch(/^License plate expires in 30 days/);
      expect(await statusOf(at31)).toBe("available");
    });

    it("Service Due Soon outranks Plate Expiring", async () => {
      await serviceType("Oil Change", { miles: 5000 });
      const vehicle = await makeVehicle({ licensePlateExpirationDate: day(3) });
      await reading(vehicle, 4800, day(-1));

      const { status, reasons } = await condition(vehicle);
      expect(status).toBe("service_due_soon");
      expect(reasons.map(({ status: reason }) => reason)).toEqual(["service_due_soon", "plate_expiring"]);
    });

    it("Service within 500 miles shows Service Due Soon", async () => {
      await serviceType("Oil Change", { miles: 5000 });
      const at500 = await makeVehicle();
      await reading(at500, 4500, day(-1));
      const at501 = await makeVehicle();
      await reading(at501, 4499, day(-1));

      expect(await condition(at500)).toMatchObject({
        status: "service_due_soon",
        reasons: [{ status: "service_due_soon", message: "Oil Change is due in 500 mi." }],
      });
      expect(await statusOf(at501)).toBe("available");
    });

    it("Service within 14 days shows Service Due Soon", async () => {
      await serviceType("Inspection", { days: 30 });
      const in14 = await makeVehicle({ purchasedAt: day(-16) });
      const in15 = await makeVehicle({ purchasedAt: day(-15) });

      expect(await condition(in14)).toMatchObject({
        status: "service_due_soon",
        reasons: [{ message: "Inspection is due in 14 days." }],
      });
      expect(await statusOf(in15)).toBe("available");
    });

    it("Service more than 500 miles and 14 days away shows Available", async () => {
      await serviceType("Oil Change", { days: 180, miles: 5000 });
      const vehicle = await makeVehicle({ purchasedAt: day(-100) });
      await reading(vehicle, 4000, day(-1));

      const oil = await serviceNamed(vehicle, "Oil Change");
      expect(oil).toMatchObject({ milesLeft: 1000, daysLeft: 80, state: "ok" });
      expect(await statusOf(vehicle)).toBe("available");
    });

    it("Area admin only sees statuses for their own areas' vehicles", async () => {
      const mine = await makeVehicle();
      const theirs = await makeVehicle({ areaId: fx.music.id });
      await need(theirs);

      const list = await request(app).get("/api/vehicles").set(fx.areaAdmin.headers);
      expect(list.status).toBe(200);
      expect(list.body.map(({ id }) => id)).toEqual([mine.id]);
      expect(list.body[0].condition.status).toBe("available");

      const other = await request(app).get(`/api/vehicles/${theirs.id}`).set(fx.areaAdmin.headers);
      expect(other.status).toBe(403);
      expect(other.body.condition).toBeUndefined();
    });

    it("User without admin, area admin, or maintenance role cannot see vehicle status", async () => {
      const vehicle = await makeVehicle();

      for (const path of ["/api/vehicles", `/api/vehicles/${vehicle.id}`]) {
        const response = await request(app).get(path).set(fx.requester.headers);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Admin or area admin role required." });
      }
    });

    it("Unauthenticated request for vehicle status is rejected", async () => {
      const vehicle = await makeVehicle();

      for (const path of ["/api/vehicles", `/api/vehicles/${vehicle.id}`]) {
        expect((await request(app).get(path)).status).toBe(401);
        expect((await request(app).get(path).set(bearer("not-a-token"))).status).toBe(401);
      }
    });
  });

  describe("US-18.3 — See why a vehicle has its status", () => {
    it("Vehicle page lists open out-of-service maintenance needs only", async () => {
      const vehicle = await makeVehicle();
      const other = await makeVehicle();
      await need(vehicle, { title: "Open OOS" });
      await need(vehicle, { title: "In progress OOS", status: "In Progress" });
      await need(vehicle, { title: "Still drivable", outOfService: false });
      await need(vehicle, { title: "Done", status: "Completed", resolvedAt: day(-1) });
      await need(vehicle, { title: "Dropped", status: "Canceled", resolvedAt: day(-1) });
      await need(other, { title: "Other vehicle" });

      const { outOfServiceNeeds } = await condition(vehicle);
      expect(outOfServiceNeeds.map(({ title }) => title)).toEqual(["Open OOS", "In progress OOS"]);
      expect(outOfServiceNeeds[0]).toMatchObject({ status: "Open", priority: "High" });
    });

    it("Vehicle page lists upcoming trips only", async () => {
      const vehicle = await makeVehicle();
      const other = await makeVehicle();
      const soon = await trip([vehicle], { start: day(5), end: day(6) });
      const underway = await trip([vehicle], { start: day(-2), end: day(2) });
      const pending = await trip([vehicle], { start: day(20), status: "pending" });
      await trip([vehicle], { start: day(-5), end: day(-3) });
      await trip([vehicle], { start: day(7), status: "cancelled" });
      await trip([vehicle], { start: day(8), status: "denied" });
      await trip([vehicle], { start: day(-1), end: day(3), status: "returned" });
      await trip([other], { start: day(4) });

      const { upcomingTrips } = await getVehicle(vehicle);

      expect(upcomingTrips.map(({ id }) => id)).toEqual([underway.id, soon.id, pending.id]);
      expect(upcomingTrips[1]).toEqual({
        id: soon.id,
        purpose: "Trip",
        startAt: day(5),
        endAt: day(6),
        allDay: true,
        status: "reserved",
        area: { id: fx.athletics.id, name: "Athletics" },
      });
    });

    // UI/UX backlog #20: where the vehicle has been, newest first.
    it("Vehicle page lists its recent trips", async () => {
      const vehicle = await makeVehicle();
      const other = await makeVehicle();
      const older = await trip([vehicle], { start: day(-20), end: day(-18) });
      const newer = await trip([vehicle], { start: day(-5), end: day(-3) });
      const returnedEarly = await trip([vehicle], { start: day(-1), end: day(3), status: "returned" });
      await trip([vehicle], { start: day(5), end: day(6) });
      await trip([vehicle], { start: day(-9), end: day(-8), status: "cancelled" });
      await trip([vehicle], { start: day(-9), end: day(-8), status: "pending" });
      await trip([other], { start: day(-4), end: day(-3) });

      const { recentTrips } = await getVehicle(vehicle);

      expect(recentTrips.map(({ id }) => id)).toEqual([returnedEarly.id, newer.id, older.id]);
      expect(recentTrips[1]).toMatchObject({ id: newer.id, status: "reserved", startAt: day(-5), endAt: day(-3) });
    });

    it("Maintenance user cannot create, edit, or delete vehicles", async () => {
      const vehicle = await makeVehicle();
      const { headers } = fx.maintenance;
      const denied = { message: "Admin or area admin role required." };

      const create = await request(app).post("/api/vehicles").set(headers).send({ make: "Ford" });
      const edit = await request(app).put(`/api/vehicles/${vehicle.id}`).set(headers).send({ status: "retired" });
      const remove = await request(app).delete(`/api/vehicles/${vehicle.id}`).set(headers);

      for (const response of [create, edit, remove]) {
        expect(response.status).toBe(403);
        expect(response.body).toEqual(denied);
      }
      expect(await db.vehicle.count()).toBe(1);
      expect((await db.vehicle.findByPk(vehicle.id)).status).toBe("active");

      const read = await request(app).get(`/api/vehicles/${vehicle.id}`).set(headers);
      expect(read.status).toBe(200);
      expect(read.body.condition.status).toBe("available");
    });
  });

  describe("US-18.4 — Vehicles go out of service from maintenance needs", () => {
    const needBody = (vehicle, overrides = {}) => ({
      title: "Brakes",
      vehicleId: vehicle.id,
      assigneeId: null,
      description: null,
      outOfService: true,
      priority: "High",
      status: "Open",
      resolvedAt: null,
      ...overrides,
    });
    const postNeed = (vehicle, overrides) =>
      request(app).post("/api/maintenance-needs").set(fx.maintenance.headers).send(needBody(vehicle, overrides));
    const putNeed = (id, vehicle, overrides) =>
      request(app).put(`/api/maintenance-needs/${id}`).set(fx.maintenance.headers).send(needBody(vehicle, overrides));

    it("Maintenance needs take vehicle out of service", async () => {
      const vehicle = await makeVehicle();
      const created = await postNeed(vehicle);
      expect(created.status).toBe(201);

      expect(await condition(vehicle)).toMatchObject({
        status: "out_of_service",
        outOfServiceNeeds: [{ id: created.body.id, title: "Brakes" }],
      });
    });

    it("In-progress out-of-service maintenance need keeps the vehicle out of service", async () => {
      const vehicle = await makeVehicle();
      const created = await postNeed(vehicle);

      expect((await putNeed(created.body.id, vehicle, { status: "In Progress" })).status).toBe(200);

      expect(await statusOf(vehicle)).toBe("out_of_service");
    });

    it("Completing a vehicle's only out-of-service maintenance need makes it available again", async () => {
      const vehicle = await makeVehicle();
      const created = await postNeed(vehicle);

      expect((await putNeed(created.body.id, vehicle, { status: "Completed" })).status).toBe(200);

      expect(await condition(vehicle)).toMatchObject({ status: "available", outOfServiceNeeds: [] });
    });

    it("Canceling a vehicle's only out-of-service maintenance need makes it available again", async () => {
      const vehicle = await makeVehicle();
      const created = await postNeed(vehicle);

      expect((await putNeed(created.body.id, vehicle, { status: "Canceled" })).status).toBe(200);

      expect(await statusOf(vehicle)).toBe("available");
    });

    it("Vehicle stays out of service while another out-of-service need is open", async () => {
      const vehicle = await makeVehicle();
      const brakes = await postNeed(vehicle);
      await postNeed(vehicle, { title: "Tires" });

      await putNeed(brakes.body.id, vehicle, { status: "Completed" });

      expect(await condition(vehicle)).toMatchObject({
        status: "out_of_service",
        outOfServiceNeeds: [{ title: "Tires" }],
      });
    });

    it("Open maintenance need not marked out of service leaves the vehicle available", async () => {
      const vehicle = await makeVehicle();
      const created = await postNeed(vehicle, { outOfService: false });
      expect(await statusOf(vehicle)).toBe("available");

      // Switching it on later takes the vehicle out of service.
      await putNeed(created.body.id, vehicle, { outOfService: true });
      expect(await statusOf(vehicle)).toBe("out_of_service");
    });

    it("Issue reports do not change a vehicle's status", async () => {
      const vehicle = await makeVehicle();
      await db.issueReport.create({
        vehicleId: vehicle.id,
        authorId: fx.requester.userId,
        type: "maintenance",
        description: "Brakes squeal",
        status: "pending",
      });

      expect(await statusOf(vehicle)).toBe("available");
    });
  });

  describe("US-18.5 — Track when service is due", () => {
    it("Vehicles show when service is next due", async () => {
      const oil = await serviceType("Oil Change", { days: 180, miles: 5000 });
      const vehicle = await makeVehicle();
      await service(vehicle, oil, 12000, day(-10));

      expect(await serviceNamed(vehicle, "Oil Change")).toEqual({
        serviceType: { id: oil.id, name: "Oil Change", frequencyDays: 180, frequencyMiles: 5000 },
        lastServicedAt: day(-10),
        lastServiceMiles: 12000,
        dueDate: day(170),
        dueMiles: 17000,
        milesLeft: 5000,
        daysLeft: 170,
        state: "ok",
      });
    });

    it("Logging a service resets when that service type is next due", async () => {
      const oil = await serviceType("Oil Change", { miles: 5000 });
      const vehicle = await makeVehicle();
      await reading(vehicle, 20000, day(-1));
      expect(await serviceNamed(vehicle, "Oil Change")).toMatchObject({ dueMiles: 5000, state: "overdue" });

      const logged = await request(app).post("/api/service-logs").set(fx.maintenance.headers).send({
        userId: fx.maintenance.userId,
        vehicleId: vehicle.id,
        serviceTypeId: oil.id,
        miles: 20000,
        servicedAt: day(0),
      });
      expect(logged.status).toBe(201);

      expect(await serviceNamed(vehicle, "Oil Change")).toMatchObject({
        lastServicedAt: day(0),
        dueMiles: 25000,
        milesLeft: 5000,
        state: "ok",
      });
      expect(await statusOf(vehicle)).toBe("available");
    });

    it("Next due uses the most recent service log of that type", async () => {
      const oil = await serviceType("Oil Change", { days: 365, miles: 5000 });
      const vehicle = await makeVehicle();
      await service(vehicle, oil, 9000, day(-10));
      // Entered later (higher id) but serviced earlier.
      await service(vehicle, oil, 5000, day(-100));

      expect(await serviceNamed(vehicle, "Oil Change")).toMatchObject({
        lastServicedAt: day(-10),
        lastServiceMiles: 9000,
        dueMiles: 14000,
        dueDate: day(355),
      });
    });

    it("Service logs of another type do not change a service type's due date", async () => {
      await serviceType("Oil Change", { days: 100, miles: 8000 });
      const tires = await serviceType("Tire Rotation", { miles: 6000 });
      const vehicle = await makeVehicle({ purchasedAt: day(-50) });
      await service(vehicle, tires, 3000, day(-1));

      expect(await serviceNamed(vehicle, "Oil Change")).toMatchObject({
        lastServicedAt: null,
        dueMiles: 8000,
        dueDate: day(50),
      });
      expect(await serviceNamed(vehicle, "Tire Rotation")).toMatchObject({ lastServicedAt: day(-1), dueMiles: 9000 });
    });

    it("Never-serviced vehicle counts from its purchase date and initial mileage", async () => {
      await serviceType("Oil Change", { days: 100, miles: 8000 });
      const vehicle = await makeVehicle({ purchasedAt: day(-50) });

      expect(await serviceNamed(vehicle, "Oil Change")).toMatchObject({
        lastServicedAt: null,
        lastServiceMiles: null,
        dueDate: day(50),
        dueMiles: 8000,
        milesLeft: 8000,
        daysLeft: 50,
        state: "ok",
      });
    });

    it("Service is due at whichever of the mile or day frequency comes first", async () => {
      await serviceType("Oil Change", { days: 30, miles: 10000 });
      const byDays = await makeVehicle({ purchasedAt: day(-40) });
      await reading(byDays, 1000, day(-1));
      const byMiles = await makeVehicle({ purchasedAt: day(-5) });
      await reading(byMiles, 10100, day(-1));

      expect(await serviceNamed(byDays, "Oil Change")).toMatchObject({ daysLeft: -10, milesLeft: 9000, state: "overdue" });
      expect(await serviceNamed(byMiles, "Oil Change")).toMatchObject({ daysLeft: 25, milesLeft: -100, state: "overdue" });
      expect(await statusOf(byDays)).toBe("service_overdue");
      expect(await statusOf(byMiles)).toBe("service_overdue");
    });

    it("Service type with only a day frequency is due by date only", async () => {
      await serviceType("Inspection", { days: 365 });
      const vehicle = await makeVehicle({ purchasedAt: day(-10) });
      await reading(vehicle, 999999, day(-1));

      expect(await serviceNamed(vehicle, "Inspection")).toMatchObject({
        dueMiles: null,
        milesLeft: null,
        dueDate: day(355),
        state: "ok",
      });
    });

    it("Service type with only a mile frequency is due by miles only", async () => {
      await serviceType("Tire Rotation", { miles: 6000 });
      const vehicle = await makeVehicle({ purchasedAt: "2000-01-01" });

      expect(await serviceNamed(vehicle, "Tire Rotation")).toMatchObject({
        dueDate: null,
        daysLeft: null,
        dueMiles: 6000,
        state: "ok",
      });
    });

    it("Service type with no frequencies is never due", async () => {
      await serviceType("Detailing");
      const vehicle = await makeVehicle({ purchasedAt: "2000-01-01" });
      await reading(vehicle, 999999, day(-1));

      expect(await serviceNamed(vehicle, "Detailing")).toMatchObject({ dueDate: null, dueMiles: null, state: "never_due" });
      expect(await statusOf(vehicle)).toBe("available");
    });
  });

  describe("US-18.6 — Only assign available vehicles", () => {
    const awaiting = (overrides = {}) => trip([], { start: day(10), end: day(12), status: "awaiting_vehicle", ...overrides });

    it("Unavailable vehicles cannot be assigned", async () => {
      const broken = await makeVehicle();
      const fine = await makeVehicle();
      await need(broken);
      const requestRow = await awaiting();

      const response = await assign(requestRow.id, [fine, broken]);

      expect(response.status).toBe(400);
      expect(await db.vehicleRequestVehicle.count()).toBe(0);
      expect((await db.vehicleRequest.findByPk(requestRow.id)).status).toBe("awaiting_vehicle");
    });

    it("Assigning an out-of-service vehicle returns 400", async () => {
      const vehicle = await makeVehicle({ universityId: "OOS-1" });
      await need(vehicle, { title: "Brakes", status: "In Progress" });
      const requestRow = await awaiting();

      const response = await assign(requestRow.id, [vehicle]);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Vehicle OOS-1 can't be assigned. Out of service: Brakes." });
    });

    it("Assigning a retired vehicle returns 400", async () => {
      const vehicle = await makeVehicle({ universityId: "OLD-1", status: "retired" });
      const requestRow = await awaiting();

      const response = await assign(requestRow.id, [vehicle], fx.areaAdmin);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Vehicle OLD-1 can't be assigned. Retired." });
    });

    it("Assigning a vehicle booked for an overlapping trip returns 400", async () => {
      const vehicle = await makeVehicle({ universityId: "BUSY-1" });
      await trip([vehicle], { start: day(12), end: day(14) });
      const requestRow = await awaiting();

      const response = await assign(requestRow.id, [vehicle]);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Vehicle BUSY-1 can't be assigned. Booked for another trip at the same time." });
    });

    it("Vehicle on a cancelled or denied overlapping request can be assigned", async () => {
      const vehicle = await makeVehicle();
      await trip([vehicle], { start: day(10), status: "cancelled" });
      await trip([vehicle], { start: day(11), status: "denied" });
      const requestRow = await awaiting();

      const response = await assign(requestRow.id, [vehicle]);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("reserved");
    });

    it("Vehicle booked for a non-overlapping trip can be assigned", async () => {
      const vehicle = await makeVehicle();
      await trip([vehicle], { start: day(8), end: day(9) });
      await trip([vehicle], { start: day(13), end: day(14) });
      const requestRow = await awaiting();

      expect((await assign(requestRow.id, [vehicle])).status).toBe(200);
    });

    it("Vehicles shown as booked in the assign dialog are the ones assignment rejects", async () => {
      const cases = {
        overlapping: { start: day(11) },
        "first-day": { start: day(8), end: day(10) },
        "day-after": { start: day(13) },
        "day-before": { start: day(9) },
        cancelled: { start: day(11), status: "cancelled" },
        pending: { start: day(12), status: "pending" },
      };
      for (const [universityId, when] of Object.entries(cases)) {
        await trip([await makeVehicle({ universityId })], when);
      }
      const requestRow = await awaiting();
      const shown = await options(requestRow.id);

      for (const universityId of Object.keys(cases)) {
        const booked = problemTypes(shown[universityId]).includes("booked");
        expect(booked).toBe(shown[universityId].conflictingRequestIds.length > 0);

        const response = await assign(requestRow.id, [shown[universityId].vehicle]);
        expect({ universityId, rejected: response.status === 400 }).toEqual({ universityId, rejected: booked });
        await assign(requestRow.id, []);
      }

      expect(Object.keys(cases).filter((id) => problemTypes(shown[id]).includes("booked")).sort()).toEqual([
        "first-day",
        "overlapping",
        "pending",
      ]);
    });

    it("Vehicle already on the request is not rejected after it becomes unavailable", async () => {
      const kept = await makeVehicle();
      const added = await makeVehicle();
      const requestRow = await awaiting();
      expect((await assign(requestRow.id, [kept])).status).toBe(200);
      await need(kept);
      await kept.update({ status: "retired" });

      const response = await assign(requestRow.id, [kept, added]);

      expect(response.status).toBe(200);
      expect(response.body.vehicles.map(({ id }) => id).sort()).toEqual([kept.id, added.id].sort());
    });
  });

  describe("US-18.7 — Warn when service will be due during a trip", () => {
    const upcoming = (estimatedMiles = 400) =>
      trip([], { start: day(3), end: day(6), status: "awaiting_vehicle", estimatedMiles });

    it("Vehicles that will have service due during a request show a warning", async () => {
      await serviceType("Inspection", { days: 30 });
      await makeVehicle({ universityId: "DUE", purchasedAt: day(-25) });
      await makeVehicle({ universityId: "FINE", purchasedAt: day(-1) });
      const requestRow = await upcoming();

      const shown = await options(requestRow.id);

      expect(shown.DUE.problems).toEqual([
        {
          type: "service_due",
          blocking: false,
          service: "Inspection",
          due: "date",
          dueDate: day(5),
          message: expect.stringMatching(/^Inspection is due .+, before the trip ends\.$/),
        },
      ]);
      expect(shown.DUE.nextService).toEqual({ milesLeft: null, dueDate: day(5) });
      expect(shown.FINE.problems).toEqual([]);
    });

    it("Service coming due by date before the trip ends is flagged", async () => {
      await serviceType("Inspection", { days: 30 });
      await makeVehicle({ universityId: "LAST-DAY", purchasedAt: day(-24) });
      await makeVehicle({ universityId: "AFTER", purchasedAt: day(-23) });
      const requestRow = await upcoming();

      const shown = await options(requestRow.id);

      expect(problemTypes(shown["LAST-DAY"])).toEqual(["service_due"]);
      expect(problemTypes(shown.AFTER)).toEqual([]);
    });

    it("Service coming due by miles during the trip is flagged", async () => {
      await serviceType("Oil Change", { miles: 10000 });
      await reading(await makeVehicle({ universityId: "SHORT" }), 9700, day(-1));
      await reading(await makeVehicle({ universityId: "EXACT" }), 9600, day(-1));
      const requestRow = await upcoming(400);

      const shown = await options(requestRow.id);

      expect(shown.SHORT.problems).toEqual([
        {
          type: "service_due",
          blocking: false,
          service: "Oil Change",
          due: "miles",
          milesLeft: 300,
          tripMiles: 400,
          message: "Oil Change is due in 300 mi, and this trip is about 400 mi.",
        },
      ]);
      // Arriving exactly at the due mileage doesn't pass it.
      expect(problemTypes(shown.EXACT)).toEqual([]);
    });

    it("Service due after the trip is not flagged", async () => {
      await serviceType("Oil Change", { days: 60, miles: 10000 });
      await reading(await makeVehicle({ universityId: "LATER", purchasedAt: day(-1) }), 5000, day(-1));
      const requestRow = await upcoming(400);

      expect((await options(requestRow.id)).LATER.problems).toEqual([]);
    });

    it("Trip with unknown mileage is only checked by date", async () => {
      await serviceType("Oil Change", { miles: 10000 });
      await serviceType("Inspection", { days: 30 });
      await reading(await makeVehicle({ universityId: "MILES", purchasedAt: day(-1) }), 9900, day(-1));
      await makeVehicle({ universityId: "DATE", purchasedAt: day(-25) });
      const requestRow = await upcoming(null);

      const shown = await options(requestRow.id);

      expect(shown.MILES.problems).toEqual([]);
      expect(problemTypes(shown.DATE)).toEqual(["service_due"]);
    });

    it("Vehicle with service due during the trip can still be assigned", async () => {
      await serviceType("Inspection", { days: 30 });
      const vehicle = await makeVehicle({ purchasedAt: day(-40) });
      const requestRow = await upcoming();

      const response = await assign(requestRow.id, [vehicle]);

      expect(response.status).toBe(200);
      expect(response.body.vehicleProblems[vehicle.id].map(({ type }) => type)).toEqual(["service_due"]);
    });
  });

  describe("US-18.8 — Warn when a license plate expires before a trip ends", () => {
    const upcoming = () => trip([], { start: day(3), end: day(6), status: "awaiting_vehicle" });

    it("License plate expiring before end of trip gives warning", async () => {
      await makeVehicle({ universityId: "PLATE", licensePlate: "ABC123", licensePlateExpirationDate: day(4) });
      const requestRow = await upcoming();

      expect((await options(requestRow.id)).PLATE.problems).toEqual([
        { type: "plate_expires", blocking: false, message: expect.stringMatching(/^License plate expires .+, before the trip ends\.$/) },
      ]);
    });

    it("Plate expiring the day before the trip ends is flagged", async () => {
      await makeVehicle({ universityId: "DAY-BEFORE", licensePlateExpirationDate: day(5) });
      await makeVehicle({ universityId: "LAST-DAY", licensePlateExpirationDate: day(6) });
      const requestRow = await upcoming();

      const shown = await options(requestRow.id);

      expect(problemTypes(shown["DAY-BEFORE"])).toEqual(["plate_expires"]);
      expect(problemTypes(shown["LAST-DAY"])).toEqual([]);
    });

    it("Already-expired plate is flagged", async () => {
      await makeVehicle({ universityId: "EXPIRED", licensePlateExpirationDate: day(-3) });
      const requestRow = await upcoming();

      expect((await options(requestRow.id)).EXPIRED.problems).toEqual([
        { type: "plate_expires", blocking: false, message: expect.stringMatching(/^License plate expired .+\.$/) },
      ]);
    });

    it("Plate expiring after the trip ends is not flagged", async () => {
      await makeVehicle({ universityId: "LATER", licensePlateExpirationDate: day(7) });
      await makeVehicle({ universityId: "NONE", licensePlateExpirationDate: null });
      const requestRow = await upcoming();

      const shown = await options(requestRow.id);
      expect(shown.LATER.problems).toEqual([]);
      expect(shown.NONE.problems).toEqual([]);
    });

    it("Vehicle with an expiring plate can still be assigned", async () => {
      const vehicle = await makeVehicle({ licensePlateExpirationDate: day(4) });
      const requestRow = await upcoming();

      const response = await assign(requestRow.id, [vehicle]);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("reserved");
    });
  });

  describe("US-18.9 — See problems with vehicles already assigned to a request", () => {
    it("Vehicles that have new problems arise after a request has been created handled get surfaced", async () => {
      const vehicle = await makeVehicle();
      const requestRow = await trip([vehicle], { start: day(10), end: day(12) });
      expect((await getRequest(requestRow.id)).vehicleProblems).toEqual({});

      await vehicle.update({ licensePlateExpirationDate: day(11) });
      await need(vehicle);

      const { vehicleProblems, driverProblems } = await getRequest(requestRow.id);
      expect(vehicleProblems[vehicle.id].map(({ type, blocking }) => [type, blocking])).toEqual([
        ["out_of_service", true],
        ["plate_expires", false],
      ]);
      expect(driverProblems).toEqual({});
    });

    it("Marking an assigned vehicle out of service flags it on the request", async () => {
      const vehicle = await makeVehicle();
      const requestRow = await trip([vehicle], { start: day(10) });

      const created = await request(app).post("/api/maintenance-needs").set(fx.maintenance.headers).send({
        title: "Engine light",
        vehicleId: vehicle.id,
        outOfService: true,
        priority: "High",
        status: "Open",
      });
      expect(created.status).toBe(201);

      expect((await getRequest(requestRow.id)).vehicleProblems[vehicle.id]).toEqual([
        { type: "out_of_service", blocking: true, message: "Out of service: Engine light." },
      ]);
    });

    it("Retiring an assigned vehicle flags it on the request", async () => {
      const vehicle = await makeVehicle();
      const requestRow = await trip([vehicle], { start: day(10) });

      await request(app).put(`/api/vehicles/${vehicle.id}`).set(fx.admin.headers).send({ status: "retired" });

      expect(await vehicleProblems(requestRow, vehicle)).toEqual(["retired"]);
    });

    it("Moving a request's dates onto another trip with the same vehicle flags the vehicle", async () => {
      const vehicle = await makeVehicle();
      const moving = await trip([vehicle], { start: day(10), end: day(12) });
      const other = await trip([vehicle], { start: day(20), end: day(22) });
      expect(await vehicleProblems(moving, vehicle)).toEqual([]);

      const moved = await request(app)
        .put(`/api/requests/${moving.id}`)
        .set(fx.admin.headers)
        .send({ startAt: day(21), endAt: day(23), allDay: true });
      expect(moved.status).toBe(200);
      expect(moved.body.vehicleProblems[vehicle.id].map(({ type }) => type)).toEqual(["booked"]);

      expect(await vehicleProblems(other, vehicle)).toEqual(["booked"]);
    });

    it("Moving a request's end date past a service due date flags the vehicle", async () => {
      await serviceType("Inspection", { days: 45 });
      const vehicle = await makeVehicle({ purchasedAt: day(-30) });
      const requestRow = await trip([vehicle], { start: day(10), end: day(12) });
      expect(await vehicleProblems(requestRow, vehicle)).toEqual([]);

      await request(app).put(`/api/requests/${requestRow.id}`).set(fx.admin.headers).send({ endAt: day(16), allDay: true });

      expect(await vehicleProblems(requestRow, vehicle)).toEqual(["service_due"]);
    });

    it("Changing a request's destinations so the trip passes the next due mileage flags the vehicle", async () => {
      await serviceType("Oil Change", { miles: 5000 });
      const vehicle = await makeVehicle();
      await reading(vehicle, 4850, day(-1));
      const requestRow = await trip([vehicle], { start: day(10), estimatedMiles: 20, stop: fx.near });
      expect(await vehicleProblems(requestRow, vehicle)).toEqual([]);

      const changed = await request(app)
        .put(`/api/requests/${requestRow.id}`)
        .set(fx.admin.headers)
        .send({ destinations: [{ id: fx.far.id }] });
      expect(changed.body.estimatedMiles).toBe(200);

      expect(await vehicleProblems(requestRow, vehicle)).toEqual(["service_due"]);
    });

    it("Requester viewing their own request does not get vehicle problems", async () => {
      const vehicle = await makeVehicle({ status: "retired" });
      const requestRow = await trip([vehicle], { start: day(10) });

      const own = await request(app).get(`/api/requests/${requestRow.id}`).set(fx.requester.headers);
      const mine = await request(app).get("/api/me/requests").set(fx.requester.headers);

      expect(own.status).toBe(200);
      expect(own.body).not.toHaveProperty("vehicleProblems");
      expect(own.body).not.toHaveProperty("driverProblems");
      expect(mine.body[0]).not.toHaveProperty("vehicleProblems");
      expect(await vehicleProblems(requestRow, vehicle)).toEqual(["retired"]);
    });

    it("Driver whose license expires before the trip ends is flagged on the request", async () => {
      const expiring = await db.driver.create({
        firstName: "Eli",
        lastName: "Expiring",
        email: "eli@example.com",
        phoneNumber: "405-555-0101",
        licenseState: "OK",
        licenseExpirationDate: day(11),
        status: "approved",
      });
      const lastDay = await db.driver.create({
        firstName: "Lu",
        lastName: "Lastday",
        email: "lu@example.com",
        phoneNumber: "405-555-0102",
        licenseState: "OK",
        licenseExpirationDate: day(12),
        status: "approved",
      });
      const flagged = await trip([], { start: day(10), end: day(12), driver: expiring });
      const fine = await trip([], { start: day(10), end: day(12), driver: lastDay });
      const past = await trip([], { start: day(-20), end: day(-18), driver: expiring, status: "reserved" });
      await expiring.update({ licenseExpirationDate: day(-19) });

      expect((await getRequest(flagged.id)).driverProblems).toEqual({
        [expiring.id]: [{ type: "license_expires", blocking: false, message: expect.stringMatching(/^License expired /) }],
      });
      expect((await getRequest(fine.id)).driverProblems).toEqual({});
      expect((await getRequest(past.id)).driverProblems).toEqual({});
      const requesterView = await request(app).get(`/api/requests/${flagged.id}`).set(fx.requester.headers);
      expect(requesterView.body).not.toHaveProperty("driverProblems");
    });
  });

  describe("US-18.10 — Find requests whose vehicles have problems", () => {
    const listed = async (user = fx.admin) => {
      const response = await request(app).get("/api/requests").set(user.headers);
      expect(response.status).toBe(200);
      return Object.fromEntries(response.body.map((row) => [row.id, row.vehicleProblems]));
    };

    it("Vehicle Request list shows requests with problematic vehicles", async () => {
      const broken = await makeVehicle();
      const fine = await makeVehicle();
      await need(broken);
      const flagged = await trip([broken, fine], { start: day(10) });
      const clean = await trip([fine], { start: day(20) });

      const rows = await listed();

      expect(Object.keys(rows[flagged.id]).map(Number)).toEqual([broken.id]);
      expect(rows[flagged.id][broken.id][0]).toMatchObject({ type: "out_of_service", blocking: true });
      expect(rows[clean.id]).toEqual({});
    });

    it("Past, cancelled, denied, and returned requests are not flagged", async () => {
      const vehicle = await makeVehicle({ status: "retired" });
      const past = await trip([vehicle], { start: day(-10), end: day(-8) });
      const cancelled = await trip([vehicle], { start: day(10), status: "cancelled" });
      const denied = await trip([vehicle], { start: day(10), status: "denied" });
      const returned = await trip([vehicle], { start: day(-1), end: day(2), status: "returned" });
      const upcoming = await trip([vehicle], { start: day(30), status: "pending" });

      const rows = await listed();

      for (const quiet of [past, cancelled, denied, returned]) {
        expect(rows[quiet.id]).toEqual({});
      }
      expect(rows[upcoming.id][vehicle.id].map(({ type }) => type)).toEqual(["retired"]);
    });

    it("Area admin only sees vehicle problem flags for their own areas", async () => {
      const mine = await makeVehicle({ status: "retired" });
      const theirs = await makeVehicle({ areaId: fx.music.id, status: "retired" });
      const ours = await trip([mine], { start: day(10) });
      const other = await trip([theirs], { start: day(10), areaId: fx.music.id });

      const rows = await listed(fx.areaAdmin);

      expect(Object.keys(rows).map(Number)).toEqual([ours.id]);
      expect(Object.keys(rows[ours.id]).map(Number)).toEqual([mine.id]);
      const hidden = await request(app).get(`/api/requests/${other.id}`).set(fx.areaAdmin.headers);
      expect(hidden.status).toBe(404);
      expect(hidden.body).not.toHaveProperty("vehicleProblems");
    });
  });

  describe("US-18.11 — Warn when taking a booked vehicle out of service", () => {
    it("Maintenance user can see a vehicle's upcoming trips", async () => {
      const vehicle = await makeVehicle({ areaId: fx.music.id });
      const upcoming = await trip([vehicle], { start: day(4), areaId: fx.music.id });

      const response = await request(app).get(`/api/vehicles/${vehicle.id}`).set(fx.maintenance.headers);

      expect(response.status).toBe(200);
      expect(response.body.upcomingTrips.map(({ id, area }) => [id, area.name])).toEqual([[upcoming.id, "Music"]]);

      const options = await request(app).get("/api/maintenance-needs/options").set(fx.maintenance.headers);
      expect(options.body.vehicles.find(({ id }) => id === vehicle.id).condition.status).toBe("available");
    });
  });

  describe("US-18.12 — Warn before retiring a booked vehicle", () => {
    it("Retiring a vehicle assigned to upcoming trips still succeeds", async () => {
      const vehicle = await makeVehicle();
      await trip([vehicle], { start: day(4) });

      const response = await request(app).put(`/api/vehicles/${vehicle.id}`).set(fx.areaAdmin.headers).send({ status: "retired" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("retired");
      expect((await getVehicle(vehicle)).upcomingTrips).toHaveLength(1);
    });
  });

  describe("US-18.14 — Estimate current mileage from trips", () => {
    it("Vehicle Current Mileage calculated from trip estimates", async () => {
      const vehicle = await makeVehicle();
      await reading(vehicle, 12000, day(-10));
      await trip([vehicle], { start: day(-5), end: day(-4), estimatedMiles: 150 });

      expect((await condition(vehicle)).mileage).toEqual({
        miles: 12150,
        reading: { odometerReading: 12000, recordedAt: day(-10) },
        tripMiles: 150,
        tripCount: 1,
        unknownTripCount: 0,
      });
    });

    it("Latest reading is the most recent by recorded date", async () => {
      const vehicle = await makeVehicle();
      await reading(vehicle, 15000, day(-3));
      await reading(vehicle, 12000, day(-20));

      expect((await condition(vehicle)).mileage.reading).toEqual({ odometerReading: 15000, recordedAt: day(-3) });
    });

    it("Trips before the latest reading are not added", async () => {
      const vehicle = await makeVehicle();
      await trip([vehicle], { start: day(-15), end: day(-14), estimatedMiles: 100 });
      await trip([vehicle], { start: day(-10), end: day(-9), estimatedMiles: 70 });
      await reading(vehicle, 12000, day(-10));
      await trip([vehicle], { start: day(-5), end: day(-4), estimatedMiles: 50 });

      expect((await condition(vehicle)).mileage).toMatchObject({ miles: 12050, tripCount: 1 });
    });

    it("Trips with unknown miles add 0", async () => {
      const vehicle = await makeVehicle();
      await reading(vehicle, 12000, day(-10));
      await trip([vehicle], { start: day(-6), end: day(-5), estimatedMiles: null });
      await trip([vehicle], { start: day(-4), end: day(-3), estimatedMiles: 40 });

      expect((await condition(vehicle)).mileage).toMatchObject({ miles: 12040, tripCount: 2, unknownTripCount: 1 });
    });

    it("Cancelled, denied, and upcoming trips are not added", async () => {
      const vehicle = await makeVehicle();
      await reading(vehicle, 12000, day(-10));
      await trip([vehicle], { start: day(-6), end: day(-5), estimatedMiles: 100, status: "cancelled" });
      await trip([vehicle], { start: day(-6), end: day(-5), estimatedMiles: 100, status: "denied" });
      await trip([vehicle], { start: day(5), estimatedMiles: 100 });
      await trip([vehicle], { start: day(-1), end: day(1), estimatedMiles: 100 });
      await trip([vehicle], { start: day(-4), end: day(-3), estimatedMiles: 30, status: "returned" });
      await trip([vehicle], { start: day(-8), end: day(-7), estimatedMiles: 5, status: "reserved" });

      expect((await condition(vehicle)).mileage).toMatchObject({ miles: 12035, tripMiles: 35, tripCount: 2 });
    });

    it("Vehicle with no mileage logs starts from its initial mileage", async () => {
      const vehicle = await makeVehicle();
      await trip([vehicle], { start: day(-6), end: day(-5), estimatedMiles: 80 });

      expect((await condition(vehicle)).mileage).toEqual({
        miles: 80,
        reading: null,
        tripMiles: 80,
        tripCount: 1,
        unknownTripCount: 0,
      });
    });
  });
});
