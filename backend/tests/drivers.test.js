/**
 * Feature 7 — Driver Management
 * Spec: features/feature-7-drivers.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createArea, createUserWithRoles, registerUser, syncTestDatabase } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const forbidden = { message: "Admin or area admin role required." };

const signInAdmin = async () => {
  const { body } = await createUserWithRoles(["admin"], { email: "ada@oc.edu", firstName: "Ada", lastName: "Admin" });
  return bearer(body.token);
};

const validBody = (overrides = {}) => ({
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "405-425-1234",
  licenseState: "OK",
  licenseExpirationDate: "2999-09-01",
  status: "pending",
  ...overrides,
});

const withoutKey = (key) => {
  const body = validBody();
  delete body[key];
  return body;
};

const postDriver = (headers, body) => request(app).post("/api/drivers").set(headers).send(body);
const putDriver = (headers, id, body) => request(app).put(`/api/drivers/${id}`).set(headers).send(body);

const dateString = (daysFromToday) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 7 — Driver Management API", () => {
  describe("US-7.1 — Create drivers", () => {
    it("Linked users are saved for drivers", async () => {
      const admin = await signInAdmin();
      const { body: linked } = await registerUser({ email: "john@oc.edu" });

      const response = await postDriver(admin, validBody({ userId: linked.userId }));

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 1,
        userId: linked.userId,
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "405-425-1234",
        licenseState: "OK",
        licenseExpirationDate: "2999-09-01",
        status: "pending",
        approvedAt: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect((await db.driver.findByPk(1)).userId).toBe(linked.userId);

      // The user is optional, and a blank value means no user.
      for (const blank of [{}, { userId: null }, { userId: "" }]) {
        const unlinked = await postDriver(admin, validBody(blank));
        expect(unlinked.status).toBe(201);
        expect(unlinked.body.userId).toBeNull();
      }

      for (const userId of [999, "abc", -1, 1.5]) {
        const missing = await postDriver(admin, validBody({ userId }));
        expect(missing.status).toBe(400);
        expect(missing.body).toEqual({ message: "User does not exist." });
      }
    });

    it("Request bodies accept snake_case aliases", async () => {
      const admin = await signInAdmin();
      const { body: linked } = await registerUser({ email: "john@oc.edu" });

      const created = await postDriver(admin, {
        user_id: linked.userId,
        first_name: " John ",
        last_name: " Doe ",
        phone_number: " 405-425-1234 ",
        license_state: "OK",
        license_expiration_date: "2999-09-01",
        status: "pending",
      });

      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        userId: linked.userId,
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "405-425-1234",
        licenseState: "OK",
        licenseExpirationDate: "2999-09-01",
      });

      const updated = await putDriver(admin, created.body.id, { first_name: "Johnny", user_id: null });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ firstName: "Johnny", userId: null });
    });

    it("Cannot submit without required fields", async () => {
      const admin = await signInAdmin();

      const cases = [
        [withoutKey("firstName"), "Missing first name."],
        [validBody({ firstName: "   " }), "Missing first name."],
        [validBody({ firstName: "f".repeat(256) }), "First name too long."],
        [withoutKey("lastName"), "Missing last name."],
        [validBody({ lastName: "   " }), "Missing last name."],
        [validBody({ lastName: "l".repeat(256) }), "Last name too long."],
        [withoutKey("phoneNumber"), "Missing phone number."],
        [validBody({ phoneNumber: "   " }), "Missing phone number."],
        [withoutKey("licenseState"), "Missing license state."],
        [validBody({ licenseState: "" }), "Missing license state."],
        [validBody({ licenseState: "ZZ" }), "Invalid license state."],
        [validBody({ licenseState: "ok" }), "Invalid license state."],
        [withoutKey("licenseExpirationDate"), "Missing license expiration date."],
        [validBody({ licenseExpirationDate: "" }), "Missing license expiration date."],
        [validBody({ licenseExpirationDate: "09/01/2027" }), "License expiration date must be in format 'yyyy-mm-dd'."],
        [validBody({ licenseExpirationDate: "2027-02-30" }), "License expiration date must be in format 'yyyy-mm-dd'."],
        [validBody({ licenseExpirationDate: "2027-13-01" }), "License expiration date must be in format 'yyyy-mm-dd'."],
        [validBody({ status: "fired" }), "Invalid status."],
      ];

      for (const [body, message] of cases) {
        const response = await postDriver(admin, body);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message });
      }
      expect(await db.driver.count()).toBe(0);

      const atLimit = await postDriver(admin, validBody({ firstName: `  ${"f".repeat(255)}  `, lastName: "l".repeat(255) }));
      expect(atLimit.status).toBe(201);
      expect(atLimit.body.firstName).toBe("f".repeat(255));

      // FR-013: an empty status is saved as pending.
      for (const status of [undefined, "", "  ", null]) {
        const pending = await postDriver(admin, validBody({ status }));
        expect(pending.status).toBe(201);
        expect(pending.body.status).toBe("pending");
      }
    });

    it("Approved timestamp on create", async () => {
      const admin = await signInAdmin();
      const before = Date.now() - 1000;

      const approved = await postDriver(admin, validBody({ status: "approved" }));

      expect(approved.status).toBe(201);
      const approvedAt = new Date((await db.driver.findByPk(approved.body.id)).approvedAt).getTime();
      expect(approvedAt).toBeGreaterThanOrEqual(before - 1000);
      expect(approvedAt).toBeLessThanOrEqual(Date.now());

      const pending = await postDriver(admin, validBody());
      expect(pending.body.approvedAt).toBeNull();
    });

    it("Invalid phone number is rejected", async () => {
      const admin = await signInAdmin();

      for (const phoneNumber of ["(405)425-1234", "405 425 1234", "405-4251234", "405-425-12345", "40a-425-1234", "4054251234", "1-405-425-1234"]) {
        const response = await postDriver(admin, validBody({ phoneNumber }));
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: "Phone number must be in format 'xxx-xxx-xxxx'." });
      }
      expect(await db.driver.count()).toBe(0);
    });

    it("Duplicate linked user is rejected", async () => {
      const admin = await signInAdmin();
      const { body: linked } = await registerUser({ email: "john@oc.edu" });
      const { body: other } = await registerUser({ email: "other@oc.edu" });
      const first = await postDriver(admin, validBody({ userId: linked.userId }));
      const second = await postDriver(admin, validBody({ userId: other.userId }));

      const duplicate = await postDriver(admin, validBody({ userId: linked.userId }));
      expect(duplicate.status).toBe(400);
      expect(duplicate.body).toEqual({ message: "User is already linked to a driver." });

      const moved = await putDriver(admin, second.body.id, { userId: linked.userId });
      expect(moved.status).toBe(400);
      expect(moved.body).toEqual({ message: "User is already linked to a driver." });

      // Saving a driver with its own user is not a duplicate.
      const same = await putDriver(admin, first.body.id, { userId: linked.userId });
      expect(same.status).toBe(200);

      // The database enforces it too, if two requests race past the pre-check.
      await expect(db.driver.create({ ...validBody(), userId: linked.userId })).rejects.toThrow();

      // Any number of drivers may have no user.
      await postDriver(admin, validBody());
      const unlinked = await postDriver(admin, validBody());
      expect(unlinked.status).toBe(201);
    });

    it("Past license expiration date is accepted", async () => {
      const admin = await signInAdmin();

      const response = await postDriver(admin, validBody({ licenseExpirationDate: "2001-01-01" }));

      expect(response.status).toBe(201);
      expect((await db.driver.findByPk(response.body.id)).licenseExpirationDate).toBe("2001-01-01");
    });
  });

  describe("US-7.4 — Edit and delete drivers", () => {
    it("Driver is deleted", async () => {
      const admin = await signInAdmin();
      const { body: driver } = await postDriver(admin, validBody());

      const response = await request(app).delete(`/api/drivers/${driver.id}`).set(admin);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Driver deleted successfully." });
      expect(await db.driver.findByPk(driver.id)).toBeNull();

      const again = await request(app).delete(`/api/drivers/${driver.id}`).set(admin);
      expect(again.status).toBe(404);
      expect(again.body).toEqual({ message: `Driver with id=${driver.id} not found.` });

      const invalid = await request(app).delete("/api/drivers/1abc").set(admin);
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid driver id." });
    });

    it("Editing a driver validates fields and keeps the ones left out", async () => {
      const admin = await signInAdmin();
      const { body: driver } = await postDriver(admin, validBody());

      const edited = await putDriver(admin, driver.id, { firstName: " Johnny " });
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject({ firstName: "Johnny", lastName: "Doe", phoneNumber: "405-425-1234", status: "pending" });

      for (const [body, message] of [
        [{ firstName: " " }, "Missing first name."],
        [{ phoneNumber: "405" }, "Phone number must be in format 'xxx-xxx-xxxx'."],
        [{ licenseState: "ZZ" }, "Invalid license state."],
        [{ licenseExpirationDate: "soon" }, "License expiration date must be in format 'yyyy-mm-dd'."],
        [{ status: "fired" }, "Invalid status."],
        [{ userId: 999 }, "User does not exist."],
      ]) {
        const response = await putDriver(admin, driver.id, body);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message });
      }
      expect((await db.driver.findByPk(driver.id)).firstName).toBe("Johnny");

      expect((await putDriver(admin, 999, { firstName: "Nobody" })).status).toBe(404);
      expect((await putDriver(admin, "abc", { firstName: "Nobody" })).status).toBe(400);
    });

    it("Former status can be saved", async () => {
      const admin = await signInAdmin();
      const { body: driver } = await postDriver(admin, validBody({ status: "approved" }));

      const response = await putDriver(admin, driver.id, { status: "former" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("former");
      expect((await db.driver.findByPk(driver.id)).status).toBe("former");
    });

    it("Approved timestamp on edit", async () => {
      const admin = await signInAdmin();
      const { body: driver } = await postDriver(admin, validBody());
      expect(driver.approvedAt).toBeNull();

      const response = await putDriver(admin, driver.id, { status: "approved" });

      expect(response.status).toBe(200);
      expect(response.body.approvedAt).not.toBeNull();
      expect((await db.driver.findByPk(driver.id)).approvedAt).not.toBeNull();

      // Saving an already approved driver is not a new approval.
      const earlier = new Date("2020-01-01T00:00:00.000Z");
      await db.driver.update({ approvedAt: earlier }, { where: { id: driver.id } });
      await putDriver(admin, driver.id, { status: "approved", firstName: "Johnny" });
      await putDriver(admin, driver.id, { firstName: "John" });
      expect((await db.driver.findByPk(driver.id)).approvedAt).toEqual(earlier);
    });

    it("Approved timestamp is removed when status leaves approved", async () => {
      const admin = await signInAdmin();

      for (const status of ["pending", "denied", "revoked", "former", ""]) {
        const { body: driver } = await postDriver(admin, validBody({ status: "approved" }));
        expect(driver.approvedAt).not.toBeNull();

        const response = await putDriver(admin, driver.id, { status });

        expect(response.status).toBe(200);
        expect(response.body.approvedAt).toBeNull();
        expect((await db.driver.findByPk(driver.id)).approvedAt).toBeNull();
      }
    });

    it("Re-approval resets approved timestamp", async () => {
      const admin = await signInAdmin();
      const { body: driver } = await postDriver(admin, validBody({ status: "approved" }));
      await putDriver(admin, driver.id, { status: "revoked" });
      const before = Date.now() - 1000;

      const response = await putDriver(admin, driver.id, { status: "approved" });

      expect(response.status).toBe(200);
      expect(new Date(response.body.approvedAt).getTime()).toBeGreaterThanOrEqual(before);
      expect((await db.driver.findByPk(driver.id)).approvedAt).not.toBeNull();
    });

    it("Client-supplied approved timestamp is ignored", async () => {
      const admin = await signInAdmin();
      const supplied = "2001-01-01T00:00:00.000Z";

      const pending = await postDriver(admin, validBody({ approvedAt: supplied, approved_at: supplied }));
      expect(pending.status).toBe(201);
      expect(pending.body.approvedAt).toBeNull();

      const edited = await putDriver(admin, pending.body.id, { approvedAt: supplied, approved_at: supplied });
      expect(edited.status).toBe(200);
      expect((await db.driver.findByPk(pending.body.id)).approvedAt).toBeNull();

      const approved = await postDriver(admin, validBody({ status: "approved", approvedAt: supplied }));
      expect(approved.body.approvedAt).not.toBe(supplied);
      expect(new Date(approved.body.approvedAt).getUTCFullYear()).not.toBe(2001);
    });
  });

  describe("US-7.5 — Signed-in admin or area admin user access only", () => {
    const managerRequests = (driverId) => [
      request(app).get("/api/drivers"),
      request(app).get("/api/drivers/available-users"),
      request(app).get(`/api/drivers/${driverId}`),
      request(app).post("/api/drivers").send(validBody()),
      request(app).put(`/api/drivers/${driverId}`).send({ firstName: "Changed" }),
      request(app).delete(`/api/drivers/${driverId}`),
    ];

    it("Admin or area_admin can access", async () => {
      const admin = await signInAdmin();
      const area = await createArea("Athletics");
      const { body: areaAdmin } = await createUserWithRoles([{ role: "area_admin", areaId: area.id }], { email: "area@oc.edu" });

      for (const headers of [admin, bearer(areaAdmin.token)]) {
        const created = await postDriver(headers, validBody());
        expect(created.status).toBe(201);

        const list = await request(app).get("/api/drivers").set(headers);
        expect(list.status).toBe(200);
        expect(list.body.map(({ id }) => id)).toContain(created.body.id);

        const one = await request(app).get(`/api/drivers/${created.body.id}`).set(headers);
        expect(one.status).toBe(200);
        expect(one.body.firstName).toBe("John");

        const edited = await putDriver(headers, created.body.id, { firstName: "Johnny" });
        expect(edited.status).toBe(200);
        expect(edited.body.firstName).toBe("Johnny");

        const deleted = await request(app).delete(`/api/drivers/${created.body.id}`).set(headers);
        expect(deleted.status).toBe(200);
      }

      const missing = await request(app).get("/api/drivers/999").set(admin);
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: "Driver with id=999 not found." });

      const invalid = await request(app).get("/api/drivers/abc").set(admin);
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid driver id." });
    });

    it("Drivers are listed by last name, then first name", async () => {
      const admin = await signInAdmin();
      await postDriver(admin, validBody({ firstName: "Zoe", lastName: "Young" }));
      await postDriver(admin, validBody({ firstName: "Bea", lastName: "Adams" }));
      await postDriver(admin, validBody({ firstName: "Al", lastName: "Adams" }));

      const { body } = await request(app).get("/api/drivers").set(admin);

      expect(body.map(({ firstName }) => firstName)).toEqual(["Al", "Bea", "Zoe"]);
    });

    it("Non (area) admins cannot access", async () => {
      const admin = await signInAdmin();
      const { body: driver } = await postDriver(admin, validBody());
      const { body: requester } = await registerUser({ email: "requester@oc.edu" });
      const { body: maintenance } = await createUserWithRoles(["maintenance"], { email: "maintenance@oc.edu" });

      for (const { token } of [requester, maintenance]) {
        for (const call of managerRequests(driver.id)) {
          const response = await call.set(bearer(token));
          expect(response.status).toBe(403);
          expect(response.body).toEqual(forbidden);
        }
      }

      for (const call of [...managerRequests(driver.id), request(app).get("/api/drivers/selectable")]) {
        expect((await call).status).toBe(401);
      }

      await db.session.update({ expirationDate: new Date(Date.now() - 1000) }, { where: { token: requester.token } });
      const expired = await request(app).get("/api/drivers/selectable").set(bearer(requester.token));
      expect(expired.status).toBe(401);

      expect((await db.driver.findByPk(driver.id)).firstName).toBe("John");
    });

    it("Signed-in user fetches selectable drivers", async () => {
      const { body: requester } = await registerUser({ email: "requester@oc.edu" });
      const row = (firstName, status, days) =>
        db.driver.create({ ...validBody({ firstName, status }), licenseExpirationDate: dateString(days) });
      await row("Yesterday", "approved", -1);
      await row("Today", "approved", 0);
      await row("Later", "approved", 30);
      for (const status of ["pending", "denied", "revoked", "former"]) {
        await row(status, status, 30);
      }

      const response = await request(app).get("/api/drivers/selectable").set(bearer(requester.token));

      expect(response.status).toBe(200);
      expect(response.body.map(({ firstName }) => firstName)).toEqual(["Later", "Today"]);
      expect(response.body[0]).toEqual({ id: expect.any(Number), firstName: "Later", lastName: "Doe" });
    });

    it("Area admin fetches available users", async () => {
      const area = await createArea("Athletics");
      const { body: areaAdmin } = await createUserWithRoles([{ role: "area_admin", areaId: area.id }], {
        email: "area@oc.edu",
        firstName: "Area",
        lastName: "Admin",
      });
      const headers = bearer(areaAdmin.token);
      const { body: linked } = await registerUser({ email: "linked@oc.edu", firstName: "Linked", lastName: "Baker" });
      const { body: other } = await registerUser({ email: "other@oc.edu", firstName: "Other", lastName: "Cole" });
      const { body: free } = await registerUser({ email: "free@oc.edu", firstName: "Free", lastName: "Dunn" });
      const driver = await db.driver.create({ ...validBody(), userId: linked.userId });
      await db.driver.create({ ...validBody(), userId: other.userId });
      await db.driver.create(validBody());

      const available = await request(app).get("/api/drivers/available-users").set(headers);

      expect(available.status).toBe(200);
      expect(available.body).toEqual([
        { id: areaAdmin.userId, firstName: "Area", lastName: "Admin", email: "area@oc.edu" },
        { id: free.userId, firstName: "Free", lastName: "Dunn", email: "free@oc.edu" },
      ]);

      const editing = await request(app).get(`/api/drivers/available-users?driverId=${driver.id}`).set(headers);

      expect(editing.status).toBe(200);
      expect(editing.body.map(({ email }) => email)).toEqual(["area@oc.edu", "linked@oc.edu", "free@oc.edu"]);

      const invalid = await request(app).get("/api/drivers/available-users?driverId=abc").set(headers);
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid driver id." });
    });
  });
});
