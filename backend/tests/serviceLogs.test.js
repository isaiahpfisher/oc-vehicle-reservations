/**
 * Feature 13 — Maintenance Log Management
 * Spec: features/feature-13-service-log.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles, registerUser } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const unauthorized = { message: "Unauthorized! No token provided." };
const forbidden = { message: "One of these roles is required: admin, area_admin, maintenance." };
const wrongArea = { message: "Not authorized for the specified area." };
const futureDate = { message: "Serviced date can't be in the future." };

const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
  return { headers: bearer(body.token), user: body };
};

const seedFleet = async () => {
  const athletics = await db.area.create({ name: "Athletics", logo: "" });
  const music = await db.area.create({ name: "Music", logo: "" });
  const type = await db.vehicleType.create({ name: "Car", identifier: "VIN" });
  const base = {
    vehicleTypeId: type.id,
    make: "Toyota",
    model: "Sienna",
    year: 2015,
    purchasedAt: "2018-01-01",
    color: "gray",
    passengerCapacity: 8,
    status: "active",
  };
  const athleticsVehicle = await db.vehicle.create({
    ...base,
    areaId: athletics.id,
    universityId: "V-100",
    identifier: "ID-1",
  });
  const musicVehicle = await db.vehicle.create({
    ...base,
    areaId: music.id,
    universityId: "V-200",
    identifier: "ID-2",
  });
  const oil = await db.serviceType.create({ name: "Oil Change", service_frequency_miles: 5000 });
  const tires = await db.serviceType.create({ name: "Tire Rotation", service_frequency_miles: 6000 });

  return { athletics, music, athleticsVehicle, musicVehicle, oil, tires };
};

const createNeed = (vehicleId, authorId, title) =>
  db.maintenanceNeed.create({
    authorId,
    vehicleId,
    title,
    outOfService: false,
    priority: "None",
    status: "Open",
  });

const bodyFor = (fleet, userId, overrides = {}) => ({
  userId,
  vehicleId: fleet.athleticsVehicle.id,
  serviceTypeId: fleet.oil.id,
  miles: 12050,
  servicedAt: "2026-07-02",
  ...overrides,
});

const dateText = (value) => {
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
};

const createLog = async (fleet, headers, userId, overrides = {}) => {
  const response = await request(app).post("/api/service-logs").set(headers).send(bodyFor(fleet, userId, overrides));
  expect(response.status).toBe(201);
  return response.body;
};

let worker;

beforeEach(async () => {
  await syncTestDatabase();
  const created = await createUserWithRoles(["maintenance"], {
    email: "worker@example.com",
    firstName: "Sam",
    lastName: "Tech",
  });
  worker = created.body;
});

describe("Feature 13 — Maintenance Log Management", () => {
  describe("US-13.1 — Create service logs", () => {
    it("Admin user saves service log", async () => {
      const fleet = await seedFleet();
      const sessions = [
        await signIn(["admin"], { email: "admin@example.com", firstName: "Ada", lastName: "Admin" }),
        await signIn([{ role: "area_admin", areaId: fleet.athletics.id }], {
          email: "area@example.com",
          firstName: "Ari",
          lastName: "Area",
        }),
        await signIn(["maintenance"], { email: "maint@example.com", firstName: "Mo", lastName: "Maint" }),
      ];

      const need = await createNeed(fleet.athleticsVehicle.id, worker.userId, "Brake noise");

      for (const { headers, user } of sessions) {
        const response = await request(app)
          .post("/api/service-logs")
          .set(headers)
          .send(bodyFor(fleet, worker.userId, { maintenanceNeedId: need.id }));

        expect(response.status).toBe(201);
        expect(response.body.userId).toBe(worker.userId);
        expect(response.body.vehicleId).toBe(fleet.athleticsVehicle.id);
        expect(response.body.serviceTypeId).toBe(fleet.oil.id);
        expect(response.body.maintenanceNeedId).toBe(need.id);
        expect(response.body.maintenanceNeed).toEqual({ id: need.id, title: "Brake noise" });
        expect(response.body.servicedAt).toBe("2026-07-02");
        expect(response.body.user).toEqual({ id: worker.userId, firstName: "Sam", lastName: "Tech" });
        expect(response.body.vehicle).toEqual({ id: fleet.athleticsVehicle.id, universityId: "V-100" });
        expect(response.body.serviceType).toEqual({ id: fleet.oil.id, name: "Oil Change" });
        expect(response.body.mileageLog.odometerReading).toBe(12050);

        const mileage = await db.mileageLog.findByPk(response.body.mileageLogId);
        expect(mileage.userId).toBe(user.userId);
        expect(mileage.vehicleId).toBe(fleet.athleticsVehicle.id);
        expect(mileage.odometerReading).toBe(12050);
        expect(dateText(mileage.recordedAt)).toBe("2026-07-02");
      }

      const listed = await request(app).get(`/api/service-logs/vehicle/${fleet.athleticsVehicle.id}`).set(sessions[0].headers);
      expect(listed.status).toBe(200);
      expect(listed.body).toHaveLength(3);
    });

    it("User without the maintenance role is rejected", async () => {
      const fleet = await seedFleet();
      const { headers } = await signIn();
      const other = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "Plain" });

      const response = await request(app).post("/api/service-logs").set(headers).send(bodyFor(fleet, other.body.userId));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "User does not have maintenance role." });
    });

    it("Area admin creates a service log for a vehicle outside their area", async () => {
      const fleet = await seedFleet();
      const { headers } = await signIn([{ role: "area_admin", areaId: fleet.athletics.id }], {
        email: "area@example.com",
      });

      const response = await request(app)
        .post("/api/service-logs")
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { vehicleId: fleet.musicVehicle.id }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });
  });

  describe("US-13.4 — Edit and delete service logs", () => {
    it("Admin user edits a service log Service Type", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { serviceTypeId: fleet.tires.id }));

      expect(response.status).toBe(200);
      expect(response.body.serviceTypeId).toBe(fleet.tires.id);
      expect(response.body.serviceType.name).toBe("Tire Rotation");
    });

    it("API update can move a service log to another vehicle", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { vehicleId: fleet.musicVehicle.id }));

      expect(response.status).toBe(200);
      expect(response.body.vehicleId).toBe(fleet.musicVehicle.id);
      expect(response.body.vehicle.universityId).toBe("V-200");
      const mileage = await db.mileageLog.findByPk(log.mileageLogId);
      expect(mileage.vehicleId).toBe(fleet.musicVehicle.id);
    });

    it("Admin user edits a service log mileage_log_id", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { miles: 15000 }));

      expect(response.status).toBe(200);
      expect(response.body.mileageLogId).toBe(log.mileageLogId);
      expect(response.body.mileageLog.odometerReading).toBe(15000);
    });

    it("Admin user edits a service log maintenance_need_id", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const first = await createNeed(fleet.athleticsVehicle.id, user.userId, "Brake noise");
      const second = await createNeed(fleet.athleticsVehicle.id, user.userId, "Worn tires");
      const log = await createLog(fleet, headers, worker.userId, { maintenanceNeedId: first.id });

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { maintenanceNeedId: second.id }));

      expect(response.status).toBe(200);
      expect(response.body.maintenanceNeedId).toBe(second.id);
      expect(response.body.maintenanceNeed).toEqual({ id: second.id, title: "Worn tires" });
    });

    it("Missing maintenance need is rejected", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();

      const response = await request(app)
        .post("/api/service-logs")
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { maintenanceNeedId: 999 }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Maintenance need not found." });
    });

    it("Maintenance need for a different vehicle is rejected", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const need = await createNeed(fleet.musicVehicle.id, user.userId, "Other vehicle");

      const response = await request(app)
        .post("/api/service-logs")
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { maintenanceNeedId: need.id }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Maintenance need is for a different vehicle." });
    });

    it("Maintenance need used by a service log cannot be deleted", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const need = await createNeed(fleet.athleticsVehicle.id, user.userId, "Brake noise");
      await createLog(fleet, headers, worker.userId, { maintenanceNeedId: need.id });

      const response = await request(app).delete(`/api/maintenance-needs/${need.id}`).set(headers);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Maintenance need is used by a service log and can't be deleted." });
      expect(await db.maintenanceNeed.findByPk(need.id)).not.toBeNull();
    });

    it("Admin user edits a service log serviced_at", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { servicedAt: "2026-08-01" }));

      expect(response.status).toBe(200);
      expect(response.body.servicedAt).toBe("2026-08-01");
      const mileage = await db.mileageLog.findByPk(log.mileageLogId);
      expect(dateText(mileage.recordedAt)).toBe("2026-08-01");
    });

    it("Admin user edits a service log serviced_at to after current date", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { servicedAt: "2099-01-01" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(futureDate);
    });

    it("Admin user deletes a service log", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app).delete(`/api/service-logs/${log.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(await db.serviceLog.findByPk(log.id)).toBeNull();
      expect(await db.mileageLog.findByPk(log.mileageLogId)).not.toBeNull();
    });

    it("Admin user deletes a service log that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).delete("/api/service-logs/999").set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Service log with id=999 not found." });
    });

    it("Admin user deletes a service log with an invalid serviceLogId", async () => {
      const { headers } = await signIn();

      const response = await request(app).delete("/api/service-logs/abc").set(headers);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid service log id." });
    });

    it("Area admin updates a service log for a vehicle outside their area", async () => {
      const fleet = await seedFleet();
      const admin = await signIn(["admin"], { email: "admin@example.com" });
      const log = await createLog(fleet, admin.headers, worker.userId, { vehicleId: fleet.musicVehicle.id });
      const area = await signIn([{ role: "area_admin", areaId: fleet.athletics.id }], { email: "area@example.com" });

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(area.headers)
        .send(bodyFor(fleet, worker.userId, { vehicleId: fleet.musicVehicle.id }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });

    it("Mileage log, service type, and user used by a service log cannot be deleted", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const mileage = await request(app).delete(`/api/mileage-logs/${log.mileageLogId}`).set(headers);
      expect(mileage.status).toBe(400);
      expect(mileage.body).toEqual({ message: "Mileage log is used by a service log and can't be deleted." });

      const serviceType = await request(app).delete(`/api/service-types/${fleet.oil.id}`).set(headers);
      expect(serviceType.status).toBe(400);
      expect(serviceType.body).toEqual({ message: "Service type is used by a service log and can't be deleted." });

      const userDelete = await request(app).delete(`/api/users/${worker.userId}`).set(headers);
      expect(userDelete.status).toBe(400);
      expect(userDelete.body).toEqual({ message: "User has service logs and can't be deleted." });

      expect(user.userId).not.toBe(worker.userId);
    });
  });

  describe("US-13.5: Signed-in admin , area admin, or maintenance user access only", () => {
    it("Unauthenticated API request to service logs", async () => {
      const response = await request(app).get("/api/service-logs");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to a particular service log", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);
      expect(log.id).toBe(1);

      const response = await request(app).get("/api/service-logs/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to a particular service log", async () => {
      const fleet = await seedFleet();

      const response = await request(app).get(`/api/service-logs/vehicle/${fleet.athleticsVehicle.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to create a service log", async () => {
      const fleet = await seedFleet();

      const response = await request(app).post("/api/service-logs").send(bodyFor(fleet, 1));

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to update a service log", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app).put(`/api/service-logs/${log.id}`).send(bodyFor(fleet, worker.userId));

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to delete a service log", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, worker.userId);

      const response = await request(app).delete(`/api/service-logs/${log.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    const withoutRole = async (send) => {
      const fleet = await seedFleet();
      const admin = await signIn(["admin"], { email: "admin@example.com" });
      const log = await createLog(fleet, admin.headers, worker.userId);
      const requester = await registerUser({ email: "requester@example.com" });

      const response = await send(bearer(requester.body.token), fleet, log, requester.body.userId);
      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    };

    it("Signed-in user without admin , area admin, or maintenance role API request to service logs", async () => {
      await withoutRole((headers) => request(app).get("/api/service-logs").set(headers));
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to a particular service log", async () => {
      await withoutRole((headers, _fleet, log) => request(app).get(`/api/service-logs/${log.id}`).set(headers));
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to create a service log", async () => {
      await withoutRole((headers, fleet, _log, userId) =>
        request(app).post("/api/service-logs").set(headers).send(bodyFor(fleet, userId)),
      );
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to update a service log", async () => {
      await withoutRole((headers, fleet, log, userId) =>
        request(app).put(`/api/service-logs/${log.id}`).set(headers).send(bodyFor(fleet, userId)),
      );
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to delete a service log", async () => {
      await withoutRole((headers, _fleet, log) => request(app).delete(`/api/service-logs/${log.id}`).set(headers));
    });
  });

  // UI/UX backlog #3: a service visit's reading follows the same rule as any mileage log.
  describe("UI/UX backlog #3 — Odometer readings only go up", () => {
    it("rejects a service log whose mileage is lower than an earlier reading", async () => {
      const fleet = await seedFleet();
      const { headers } = await signIn();
      await createLog(fleet, headers, worker.userId, { miles: 12050, servicedAt: "2026-07-02" });

      const response = await request(app)
        .post("/api/service-logs")
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { miles: 11000, servicedAt: "2026-08-01" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Odometer reading can't be lower than 12,050 mi, recorded Jul 2, 2026." });
      expect(await db.serviceLog.count()).toBe(1);
      expect(await db.mileageLog.count()).toBe(1);
    });

    it("lets a visit log several services at the same reading, and edit one without tripping over its own reading", async () => {
      const fleet = await seedFleet();
      const { headers } = await signIn();
      const first = await createLog(fleet, headers, worker.userId, { miles: 12050 });
      await createLog(fleet, headers, worker.userId, { miles: 12050, serviceTypeId: fleet.tires.id });

      const edited = await request(app)
        .put(`/api/service-logs/${first.id}`)
        .set(headers)
        .send(bodyFor(fleet, worker.userId, { miles: 12060 }));

      expect(edited.status).toBe(200);
    });
  });

  // UI/UX backlog #26: one visit, several services, one odometer reading.
  describe("UI/UX backlog #26 — Several services in one visit", () => {
    it("logs every service type at the same visit, sharing one mileage log", async () => {
      const fleet = await seedFleet();
      const { headers } = await signIn();
      const { serviceTypeId: _single, ...body } = bodyFor(fleet, worker.userId);

      const response = await request(app)
        .post("/api/service-logs")
        .set(headers)
        .send({ ...body, serviceTypeIds: [fleet.oil.id, fleet.tires.id, fleet.oil.id] });

      expect(response.status).toBe(201);
      expect(response.body.map(({ serviceTypeId }) => serviceTypeId)).toEqual([fleet.oil.id, fleet.tires.id]);
      expect(await db.mileageLog.count()).toBe(1);
      const logs = await db.serviceLog.findAll();
      expect(new Set(logs.map(({ mileageLogId }) => mileageLogId)).size).toBe(1);
    });

    it("rejects an empty or invalid list, and an unknown service type, without saving anything", async () => {
      const fleet = await seedFleet();
      const { headers } = await signIn();
      const { serviceTypeId: _single, ...body } = bodyFor(fleet, worker.userId);
      const send = (serviceTypeIds) => request(app).post("/api/service-logs").set(headers).send({ ...body, serviceTypeIds });

      expect((await send([])).body).toEqual({ message: "Missing service type." });
      expect((await send(["oil"])).body).toEqual({ message: "Invalid service type." });
      const unknown = await send([fleet.oil.id, 999]);
      expect(unknown.status).toBe(404);
      expect(unknown.body).toEqual({ message: "Service type not found." });
      expect(await db.serviceLog.count()).toBe(0);
      expect(await db.mileageLog.count()).toBe(0);
    });
  });
});

// UI/UX backlog #54: a visit (the service logs sharing one reading) is edited and deleted as a whole.
describe("UI/UX backlog #54 — Service visits", () => {
  const visitBody = (fleet, overrides = {}) => {
    const { serviceTypeId: _one, ...body } = bodyFor(fleet, worker.userId);
    return { ...body, serviceTypeIds: [fleet.oil.id, fleet.tires.id], ...overrides };
  };
  const logVisit = async (fleet, headers, overrides) => {
    const response = await request(app).post("/api/service-logs").set(headers).send(visitBody(fleet, overrides));
    expect(response.status).toBe(201);
    return response.body[0].mileageLogId;
  };

  it("edits the whole visit: reading, date and person for every service, and adds or removes services", async () => {
    const fleet = await seedFleet();
    const { headers } = await signIn();
    const visitId = await logVisit(fleet, headers);
    const brakes = await db.serviceType.create({ name: "Brake Check", service_frequency_miles: 10000 });
    const need = await createNeed(fleet.athleticsVehicle.id, worker.userId, "Squeaky brakes");

    const response = await request(app)
      .put(`/api/service-logs/visits/${visitId}`)
      .set(headers)
      .send(visitBody(fleet, { serviceTypeIds: [fleet.oil.id, brakes.id], miles: 12100, servicedAt: "2026-07-03", maintenanceNeedId: need.id }));

    expect(response.status).toBe(200);
    expect(response.body.map(({ serviceType }) => serviceType.name)).toEqual(["Oil Change", "Brake Check"]);
    expect(response.body.every((log) => log.mileageLogId === visitId && log.servicedAt === "2026-07-03")).toBe(true);
    expect(response.body.every((log) => log.maintenanceNeedId === need.id)).toBe(true);
    expect(await db.serviceLog.count({ where: { serviceTypeId: fleet.tires.id } })).toBe(0);
    const reading = await db.mileageLog.findByPk(visitId);
    expect(reading.odometerReading).toBe(12100);
    expect(await db.mileageLog.count()).toBe(1);
  });

  it("checks the body like create, keeps the vehicle, and checks the reading against the others", async () => {
    const fleet = await seedFleet();
    const { headers } = await signIn();
    const visitId = await logVisit(fleet, headers);
    await logVisit(fleet, headers, { miles: 15000, servicedAt: "2026-07-10" });
    const put = (overrides) => request(app).put(`/api/service-logs/visits/${visitId}`).set(headers).send(visitBody(fleet, overrides));

    expect((await put({ serviceTypeIds: [] })).body).toEqual({ message: "Missing service type." });
    expect((await put({ serviceTypeIds: undefined })).body).toEqual({ message: "Missing service type." });
    expect((await put({ vehicleId: fleet.musicVehicle.id })).body).toEqual({ message: "Vehicle cannot be changed." });
    const higher = await put({ miles: 16000 });
    expect(higher.status).toBe(400);
    expect(higher.body.message).toMatch(/^Odometer reading can't be higher than 15,000 mi/);
    expect((await request(app).put("/api/service-logs/visits/999").set(headers).send(visitBody(fleet))).status).toBe(404);
    expect((await request(app).put("/api/service-logs/visits/abc").set(headers).send(visitBody(fleet))).body).toEqual({
      message: "Invalid service visit id.",
    });
  });

  it("deletes every service at the visit and keeps the reading", async () => {
    const fleet = await seedFleet();
    const { headers } = await signIn();
    const visitId = await logVisit(fleet, headers);

    const response = await request(app).delete(`/api/service-logs/visits/${visitId}`).set(headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Service visit deleted successfully." });
    expect(await db.serviceLog.count()).toBe(0);
    expect(await db.mileageLog.findByPk(visitId)).not.toBeNull();
  });

  it("limits area admins to their areas' vehicles", async () => {
    const fleet = await seedFleet();
    const { headers } = await signIn();
    const visitId = await logVisit(fleet, headers, { vehicleId: fleet.musicVehicle.id });
    const area = await signIn([{ role: "area_admin", areaId: fleet.athletics.id }], { email: "area@example.com" });

    const edit = await request(app)
      .put(`/api/service-logs/visits/${visitId}`)
      .set(area.headers)
      .send(visitBody(fleet, { vehicleId: fleet.musicVehicle.id }));
    expect(edit.status).toBe(403);
    expect(edit.body).toEqual(wrongArea);
    expect((await request(app).delete(`/api/service-logs/visits/${visitId}`).set(area.headers)).status).toBe(403);
    expect(await db.serviceLog.count()).toBe(2);
  });
});
