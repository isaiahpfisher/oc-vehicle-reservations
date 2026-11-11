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
const futureDate = { message: "serviced_at cannot be after current date." };

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

beforeEach(async () => {
  await syncTestDatabase();
});

describe("Feature 13 — Maintenance Log Management", () => {
  describe("US-13.1 — Create service logs", () => {
    it("Admin user saves service log", async () => {
      const fleet = await seedFleet();
      const recordedFor = await registerUser({
        email: "sam@example.com",
        firstName: "Sam",
        lastName: "Tech",
      });
      const sessions = [
        await signIn(["admin"], { email: "admin@example.com", firstName: "Ada", lastName: "Admin" }),
        await signIn([{ role: "area_admin", areaId: fleet.athletics.id }], {
          email: "area@example.com",
          firstName: "Ari",
          lastName: "Area",
        }),
        await signIn(["maintenance"], { email: "maint@example.com", firstName: "Mo", lastName: "Maint" }),
      ];

      for (const { headers, user } of sessions) {
        const response = await request(app)
          .post("/api/service-logs")
          .set(headers)
          .send(bodyFor(fleet, recordedFor.body.userId, { maintenanceNeedId: 4 }));

        expect(response.status).toBe(201);
        expect(response.body.userId).toBe(recordedFor.body.userId);
        expect(response.body.vehicleId).toBe(fleet.athleticsVehicle.id);
        expect(response.body.serviceTypeId).toBe(fleet.oil.id);
        expect(response.body.maintenanceNeedId).toBe(4);
        expect(response.body.servicedAt).toBe("2026-07-02");
        expect(response.body.user).toEqual({ id: recordedFor.body.userId, firstName: "Sam", lastName: "Tech" });
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

    it("Area admin creates a service log for a vehicle outside their area", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn([{ role: "area_admin", areaId: fleet.athletics.id }], {
        email: "area@example.com",
      });

      const response = await request(app)
        .post("/api/service-logs")
        .set(headers)
        .send(bodyFor(fleet, user.userId, { vehicleId: fleet.musicVehicle.id }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });
  });

  describe("US-13.4 — Edit and delete service logs", () => {
    it("Admin user edits a service log Service Type", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, user.userId, { serviceTypeId: fleet.tires.id }));

      expect(response.status).toBe(200);
      expect(response.body.serviceTypeId).toBe(fleet.tires.id);
      expect(response.body.serviceType.name).toBe("Tire Rotation");
    });

    it("API update can move a service log to another vehicle", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, user.userId, { vehicleId: fleet.musicVehicle.id }));

      expect(response.status).toBe(200);
      expect(response.body.vehicleId).toBe(fleet.musicVehicle.id);
      expect(response.body.vehicle.universityId).toBe("V-200");
      const mileage = await db.mileageLog.findByPk(log.mileageLogId);
      expect(mileage.vehicleId).toBe(fleet.musicVehicle.id);
    });

    it("Admin user edits a service log mileage_log_id", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, user.userId, { miles: 15000 }));

      expect(response.status).toBe(200);
      expect(response.body.mileageLogId).toBe(log.mileageLogId);
      expect(response.body.mileageLog.odometerReading).toBe(15000);
    });

    it("Admin user edits a service log maintenance_need_id", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, user.userId, { maintenanceNeedId: 8 }));

      expect(response.status).toBe(200);
      expect(response.body.maintenanceNeedId).toBe(8);
    });

    it("Admin user edits a service log serviced_at", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, user.userId, { servicedAt: "2026-08-01" }));

      expect(response.status).toBe(200);
      expect(response.body.servicedAt).toBe("2026-08-01");
      const mileage = await db.mileageLog.findByPk(log.mileageLogId);
      expect(dateText(mileage.recordedAt)).toBe("2026-08-01");
    });

    it("Admin user edits a service log serviced_at to after current date", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(headers)
        .send(bodyFor(fleet, user.userId, { servicedAt: "2099-01-01" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(futureDate);
    });

    it("Admin user deletes a service log", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

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
      const log = await createLog(fleet, admin.headers, admin.user.userId, { vehicleId: fleet.musicVehicle.id });
      const area = await signIn([{ role: "area_admin", areaId: fleet.athletics.id }], { email: "area@example.com" });

      const response = await request(app)
        .put(`/api/service-logs/${log.id}`)
        .set(area.headers)
        .send(bodyFor(fleet, area.user.userId, { vehicleId: fleet.musicVehicle.id }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(wrongArea);
    });

    it("Mileage log, service type, and user used by a service log cannot be deleted", async () => {
      const fleet = await seedFleet();
      const recordedFor = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "Tech" });
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, recordedFor.body.userId);

      const mileage = await request(app).delete(`/api/mileage-logs/${log.mileageLogId}`).set(headers);
      expect(mileage.status).toBe(400);
      expect(mileage.body).toEqual({ message: "Mileage log is used by a service log and can't be deleted." });

      const serviceType = await request(app).delete(`/api/service-types/${fleet.oil.id}`).set(headers);
      expect(serviceType.status).toBe(400);
      expect(serviceType.body).toEqual({ message: "Service type is used by a service log and can't be deleted." });

      const userDelete = await request(app).delete(`/api/users/${recordedFor.body.userId}`).set(headers);
      expect(userDelete.status).toBe(400);
      expect(userDelete.body).toEqual({ message: "User has service logs and can't be deleted." });

      expect(user.userId).not.toBe(recordedFor.body.userId);
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
      const log = await createLog(fleet, headers, user.userId);
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
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app).put(`/api/service-logs/${log.id}`).send(bodyFor(fleet, user.userId));

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to delete a service log", async () => {
      const fleet = await seedFleet();
      const { headers, user } = await signIn();
      const log = await createLog(fleet, headers, user.userId);

      const response = await request(app).delete(`/api/service-logs/${log.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    const withoutRole = async (send) => {
      const fleet = await seedFleet();
      const admin = await signIn(["admin"], { email: "admin@example.com" });
      const log = await createLog(fleet, admin.headers, admin.user.userId);
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
});
