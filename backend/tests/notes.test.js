/**
 * Feature 14 — Notes
 * Spec: features/feature-14-notes.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createArea, createUserWithRoles, registerUser, syncTestDatabase } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** Two areas, a vehicle in each, and one of every note parent per area. */
const seedWorld = async () => {
  const athletics = await createArea("Athletics");
  const music = await createArea("Music");

  const admin = (await createUserWithRoles(["admin"], { email: "admin@oc.edu", firstName: "Ada" })).body;
  const areaAdmin = (await createUserWithRoles([{ role: "area_admin", areaId: athletics.id }], { email: "aa@oc.edu", firstName: "Art" })).body;
  const otherAreaAdmin = (await createUserWithRoles([{ role: "area_admin", areaId: music.id }], { email: "ma@oc.edu", firstName: "Mo" })).body;
  const maintenance = (await createUserWithRoles(["maintenance"], { email: "fix@oc.edu", firstName: "Max" })).body;
  const requester = (await registerUser({ email: "req@oc.edu", firstName: "Rae", lastName: "Quest" })).body;
  const otherRequester = (await registerUser({ email: "other@oc.edu", firstName: "Oli" })).body;

  const type = await db.vehicleType.create({ name: "Van", identifier: "VIN" });
  const vehicle = (areaId, n) =>
    db.vehicle.create({
      areaId,
      vehicleTypeId: type.id,
      universityId: `V-${n}`,
      make: "Ford",
      model: "Transit",
      year: 2020,
      identifier: `VIN-${n}`,
      purchasedAt: "2020-01-01",
      color: "White",
      passengerCapacity: 12,
      status: "active",
    });
  const athleticsVan = await vehicle(athletics.id, 1);
  const musicVan = await vehicle(music.id, 2);

  const trip = (userId, areaId) =>
    db.vehicleRequest.create({
      userId,
      areaId,
      purpose: "Away game",
      startAt: new Date("2030-01-01T00:00:00Z"),
      endAt: new Date("2030-01-02T00:00:00Z"),
      allDay: true,
      numberOfPeople: 4,
    });
  const ownRequest = await trip(requester.userId, athletics.id);
  const musicRequest = await trip(otherRequester.userId, music.id);

  const report = (vehicleId, authorId) =>
    db.issueReport.create({ vehicleId, authorId, type: "dirty", description: "Muddy floor.", status: "pending" });
  const ownReport = await report(athleticsVan.id, requester.userId);
  const musicReport = await report(musicVan.id, otherRequester.userId);

  const need = (vehicleId) =>
    db.maintenanceNeed.create({
      authorId: maintenance.userId,
      vehicleId,
      title: "Oil change",
      outOfService: false,
      priority: "Low",
      status: "Open",
    });
  const athleticsNeed = await need(athleticsVan.id);
  const musicNeed = await need(musicVan.id);

  return {
    admin,
    areaAdmin,
    otherAreaAdmin,
    maintenance,
    requester,
    otherRequester,
    ownRequest,
    musicRequest,
    ownReport,
    musicReport,
    athleticsNeed,
    musicNeed,
  };
};

const addNote = (fields) => db.note.create({ content: "Seed note.", isVisible: true, ...fields });

const postNote = (token, body) => request(app).post("/api/notes").set(bearer(token)).send(body);

let world;

beforeEach(async () => {
  await syncTestDatabase();
  world = await seedWorld();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 14 — Notes", () => {
  describe("US-14.1 — Add notes to entities", () => {
    it("Unauthenticated user cannot create notes", async () => {
      const missing = await request(app).post("/api/notes").send({ vehicleRequestId: world.ownRequest.id, content: "Hi" });
      expect(missing.status).toBe(401);
      expect(missing.body).toEqual({ message: "Unauthorized! No token provided." });

      const invalid = await postNote("not-a-token", { vehicleRequestId: world.ownRequest.id, content: "Hi" });
      expect(invalid.status).toBe(401);

      for (const path of [
        `/api/requests/${world.ownRequest.id}/notes`,
        `/api/issue-reports/${world.ownReport.id}/notes`,
        `/api/maintenance-needs/${world.athleticsNeed.id}/notes`,
        "/api/notes/1",
      ]) {
        expect((await request(app).get(path)).status).toBe(401);
      }
      expect((await request(app).delete("/api/notes/1")).status).toBe(401);
      expect(await db.note.count()).toBe(0);
    });

    it("Unauthorized standard user cannot create notes on requests they don't have access to", async () => {
      const { requester } = world;
      for (const body of [
        { vehicleRequestId: world.musicRequest.id },
        { issueReportId: world.musicReport.id },
        // Standard users can't read any maintenance need (Feature 11).
        { maintenanceNeedId: world.athleticsNeed.id },
      ]) {
        const response = await postNote(requester.token, { ...body, content: "Can I come?" });
        expect(response.status).toBe(403);
        expect(response.body.message).toEqual(expect.any(String));
      }

      // Nor read the notes on them.
      await addNote({ vehicleRequestId: world.musicRequest.id, authorId: world.otherRequester.userId });
      const list = await request(app).get(`/api/requests/${world.musicRequest.id}/notes`).set(bearer(requester.token));
      expect(list.status).toBe(403);
      const one = await request(app).get("/api/notes/1").set(bearer(requester.token));
      expect(one.status).toBe(403);
      expect(await db.note.count()).toBe(1);
    });

    it("Unauthorized area_admin user cannot create notes on requests they don't have access to", async () => {
      const { otherAreaAdmin } = world;
      for (const body of [
        { vehicleRequestId: world.ownRequest.id },
        { issueReportId: world.ownReport.id },
        { maintenanceNeedId: world.athleticsNeed.id },
      ]) {
        const response = await postNote(otherAreaAdmin.token, { ...body, content: "Checking in." });
        expect(response.status).toBe(403);
      }
      expect(await db.note.count()).toBe(0);
    });

    it("Standard user can create notes", async () => {
      const { requester } = world;
      const response = await postNote(requester.token, {
        vehicleRequestId: world.ownRequest.id,
        content: "  Can we pick up the van at 7am instead?  ",
        authorId: world.admin.userId,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 1,
        vehicleRequestId: world.ownRequest.id,
        issueReportId: null,
        maintenanceNeedId: null,
        authorId: requester.userId,
        author: { id: requester.userId, firstName: "Rae", lastName: "Quest" },
        content: "Can we pick up the van at 7am instead?",
        isVisible: true,
        includeInEmail: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Their own issue report too.
      const onReport = await postNote(requester.token, { issueReportId: world.ownReport.id, content: "Photos attached." });
      expect(onReport.status).toBe(201);
      expect(onReport.body.issueReportId).toBe(world.ownReport.id);
    });

    it("Area admin and maintenance users can create notes", async () => {
      const { areaAdmin, maintenance } = world;
      for (const body of [
        { vehicleRequestId: world.ownRequest.id },
        { issueReportId: world.ownReport.id },
        { maintenanceNeedId: world.athleticsNeed.id },
      ]) {
        const response = await postNote(areaAdmin.token, { ...body, content: "Approved on my end." });
        expect(response.status).toBe(201);
        expect(response.body.authorId).toBe(areaAdmin.userId);
      }

      // Maintenance users read every maintenance need (Feature 11), in any area.
      for (const need of [world.athleticsNeed, world.musicNeed]) {
        const response = await postNote(maintenance.token, { maintenanceNeedId: need.id, content: "Parts ordered." });
        expect(response.status).toBe(201);
        expect(response.body.maintenanceNeedId).toBe(need.id);
      }
    });

    it("Admin user can create notes", async () => {
      const { admin } = world;
      for (const body of [
        { vehicleRequestId: world.musicRequest.id },
        { issueReportId: world.musicReport.id },
        { maintenanceNeedId: world.musicNeed.id },
      ]) {
        const response = await postNote(admin.token, { ...body, content: "Noted.", includeInEmail: true });
        expect(response.status).toBe(201);
        expect(response.body.includeInEmail).toBe(true);
      }
      expect(await db.note.count()).toBe(3);
    });

    it("rejects bad note bodies", async () => {
      const { admin } = world;
      const cases = [
        [{ content: "No parent" }, 400, "Exactly one of vehicleRequestId, issueReportId, or maintenanceNeedId is required."],
        [
          { vehicleRequestId: world.ownRequest.id, issueReportId: world.ownReport.id, content: "Two parents" },
          400,
          "Exactly one of vehicleRequestId, issueReportId, or maintenanceNeedId is required.",
        ],
        [{ vehicleRequestId: "abc", content: "Bad id" }, 400, "Invalid request id."],
        [{ issueReportId: "1.5", content: "Bad id" }, 400, "Invalid issue report id."],
        [{ maintenanceNeedId: -1, content: "Bad id" }, 400, "Invalid maintenance need id."],
        [{ vehicleRequestId: world.ownRequest.id }, 400, "Note content is required."],
        [{ vehicleRequestId: world.ownRequest.id, content: "   \n\t " }, 400, "Note content is required."],
        [{ vehicleRequestId: world.ownRequest.id, content: "<b></b>" }, 400, "Note content is required."],
        [{ vehicleRequestId: world.ownRequest.id, content: 42 }, 400, "Note content is required."],
        [{ vehicleRequestId: world.ownRequest.id, content: "Hi", isVisible: "no" }, 400, "isVisible must be true or false."],
        [{ vehicleRequestId: world.ownRequest.id, content: "Hi", includeInEmail: 1 }, 400, "includeInEmail must be true or false."],
        [{ vehicleRequestId: 999, content: "Missing" }, 404, "Vehicle request with id=999 not found."],
        [{ issueReportId: 999, content: "Missing" }, 404, "Issue report with id=999 not found."],
        [{ maintenanceNeedId: 999, content: "Missing" }, 404, "Maintenance need with id=999 not found."],
      ];

      for (const [body, status, message] of cases) {
        const response = await postNote(admin.token, body);
        expect({ body, status: response.status, message: response.body.message }).toEqual({ body, status, message });
      }
      expect(await db.note.count()).toBe(0);
    });

    it("sanitizes note content before saving", async () => {
      const response = await postNote(world.requester.token, {
        vehicleRequestId: world.ownRequest.id,
        content: '<script>alert("x")</script>Need a <b>bigger</b> van\u0000 for 3 < 5 > 2 people.\r\nThanks!',
      });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('alert("x")Need a bigger van for 3 < 5 > 2 people.\nThanks!');
      expect((await db.note.findByPk(response.body.id)).content).toBe(response.body.content);
    });
  });

  describe("US-14.2 — View notes on entities", () => {
    it("Users can view notes on requests, issue reports, maintenance needs", async () => {
      const { requester, areaAdmin, maintenance, admin } = world;
      await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId, content: "Second" });
      await addNote({ vehicleRequestId: world.ownRequest.id, authorId: requester.userId, content: "First" });
      // Make the later row older: lists follow createdAt, oldest first.
      await db.note.update({ createdAt: new Date("2026-01-01T00:00:00Z") }, { where: { content: "First" } });
      await addNote({ vehicleRequestId: world.musicRequest.id, authorId: admin.userId, content: "Elsewhere" });
      await addNote({ issueReportId: world.ownReport.id, authorId: areaAdmin.userId, content: "On the report" });
      await addNote({ maintenanceNeedId: world.athleticsNeed.id, authorId: maintenance.userId, content: "On the need" });

      const requestNotes = await request(app).get(`/api/requests/${world.ownRequest.id}/notes`).set(bearer(requester.token));
      expect(requestNotes.status).toBe(200);
      expect(requestNotes.body.map(({ content }) => content)).toEqual(["First", "Second"]);
      expect(requestNotes.body[1].author).toEqual({ id: areaAdmin.userId, firstName: "Art", lastName: "Doe" });

      const reportNotes = await request(app).get(`/api/issue-reports/${world.ownReport.id}/notes`).set(bearer(requester.token));
      expect(reportNotes.body.map(({ content }) => content)).toEqual(["On the report"]);

      const needNotes = await request(app)
        .get(`/api/maintenance-needs/${world.athleticsNeed.id}/notes`)
        .set(bearer(areaAdmin.token));
      expect(needNotes.body.map(({ content }) => content)).toEqual(["On the need"]);

      const one = await request(app).get(`/api/notes/${requestNotes.body[0].id}`).set(bearer(requester.token));
      expect(one.status).toBe(200);
      expect(one.body).toEqual(requestNotes.body[0]);

      // The area admin of another area can't read them.
      const blocked = await request(app).get(`/api/requests/${world.ownRequest.id}/notes`).set(bearer(world.otherAreaAdmin.token));
      expect(blocked.status).toBe(403);
    });

    it("rejects bad ids and missing records", async () => {
      const { admin } = world;
      const cases = [
        ["/api/requests/abc/notes", 400, "Invalid request id."],
        ["/api/issue-reports/abc/notes", 400, "Invalid issue report id."],
        ["/api/maintenance-needs/abc/notes", 400, "Invalid maintenance need id."],
        ["/api/notes/abc", 400, "Invalid note id."],
        ["/api/requests/999/notes", 404, "Vehicle request with id=999 not found."],
        ["/api/issue-reports/999/notes", 404, "Issue report with id=999 not found."],
        ["/api/maintenance-needs/999/notes", 404, "Maintenance need with id=999 not found."],
        ["/api/notes/999", 404, "Note with id=999 not found."],
      ];

      for (const [path, status, message] of cases) {
        const response = await request(app).get(path).set(bearer(admin.token));
        expect({ path, status: response.status, body: response.body }).toEqual({ path, status, body: { message } });
      }
    });

    it("deletes notes with their parent", async () => {
      await addNote({ issueReportId: world.ownReport.id, authorId: world.requester.userId });
      await addNote({ maintenanceNeedId: world.athleticsNeed.id, authorId: world.maintenance.userId });

      await world.ownReport.destroy();
      await world.athleticsNeed.destroy();

      expect(await db.note.count()).toBe(0);
    });
  });

  describe("US-14.3 — Toggle visibility", () => {
    it("Admin, area_admins, maintenance users can toggle visibility", async () => {
      const posts = [
        [world.admin, { vehicleRequestId: world.ownRequest.id }],
        [world.areaAdmin, { vehicleRequestId: world.ownRequest.id }],
        [world.maintenance, { maintenanceNeedId: world.athleticsNeed.id }],
      ];
      for (const [user, body] of posts) {
        const response = await postNote(user.token, { ...body, content: `Private from ${user.firstName}`, isVisible: false });
        expect(response.status).toBe(201);
        expect(response.body.isVisible).toBe(false);
      }

      // Other staff with access to the request see the hidden notes.
      for (const user of [world.admin, world.areaAdmin]) {
        const list = await request(app).get(`/api/requests/${world.ownRequest.id}/notes`).set(bearer(user.token));
        expect(list.body.map(({ isVisible }) => isVisible)).toEqual([false, false]);
      }
      const needList = await request(app)
        .get(`/api/maintenance-needs/${world.athleticsNeed.id}/notes`)
        .set(bearer(world.areaAdmin.token));
      expect(needList.body).toHaveLength(1);
      expect((await request(app).get("/api/notes/3").set(bearer(world.areaAdmin.token))).status).toBe(200);

      // Staff without access to the parent still don't.
      const outside = await request(app).get(`/api/requests/${world.ownRequest.id}/notes`).set(bearer(world.otherAreaAdmin.token));
      expect(outside.status).toBe(403);
    });

    it("Standard user cannot toggle note visibility", async () => {
      const response = await postNote(world.requester.token, {
        vehicleRequestId: world.ownRequest.id,
        content: "Just for admins",
        isVisible: false,
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Only admins, area admins, and maintenance users can post hidden notes.");
      expect(await db.note.count()).toBe(0);

      // Sending isVisible: true is allowed.
      const visible = await postNote(world.requester.token, {
        vehicleRequestId: world.ownRequest.id,
        content: "For everyone",
        isVisible: true,
      });
      expect(visible.status).toBe(201);
    });

    it("Standard user cannot see notes with isVisible set to false", async () => {
      const { requester, areaAdmin } = world;
      await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId, content: "Shared" });
      const hidden = await addNote({
        vehicleRequestId: world.ownRequest.id,
        authorId: areaAdmin.userId,
        content: "Staff only",
        isVisible: false,
      });
      await addNote({ issueReportId: world.ownReport.id, authorId: areaAdmin.userId, content: "Report staff only", isVisible: false });

      const list = await request(app).get(`/api/requests/${world.ownRequest.id}/notes`).set(bearer(requester.token));
      expect(list.status).toBe(200);
      expect(list.body.map(({ content }) => content)).toEqual(["Shared"]);

      const reportList = await request(app).get(`/api/issue-reports/${world.ownReport.id}/notes`).set(bearer(requester.token));
      expect(reportList.body).toEqual([]);

      const byId = await request(app).get(`/api/notes/${hidden.id}`).set(bearer(requester.token));
      expect(byId.status).toBe(404);
      expect(byId.body).toEqual({ message: `Note with id=${hidden.id} not found.` });

      const deleted = await request(app).delete(`/api/notes/${hidden.id}`).set(bearer(requester.token));
      expect(deleted.status).toBe(404);
      expect(await db.note.findByPk(hidden.id)).not.toBeNull();
    });
  });

  describe("US-14.4 — Admin can delete notes", () => {
    it("Admin can delete all notes", async () => {
      const { admin, requester, areaAdmin, maintenance } = world;
      const answered = await addNote({ vehicleRequestId: world.ownRequest.id, authorId: requester.userId });
      await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId, isVisible: false });
      const need = await addNote({ maintenanceNeedId: world.musicNeed.id, authorId: maintenance.userId });

      for (const note of [answered, need]) {
        const response = await request(app).delete(`/api/notes/${note.id}`).set(bearer(admin.token));
        expect(response.status).toBe(204);
        expect(response.body).toEqual({});
      }
      expect((await request(app).delete("/api/notes/2").set(bearer(admin.token))).status).toBe(204);
      expect(await db.note.count()).toBe(0);

      expect((await request(app).delete("/api/notes/2").set(bearer(admin.token))).status).toBe(404);
      expect((await request(app).delete("/api/notes/abc").set(bearer(admin.token))).body).toEqual({ message: "Invalid note id." });
    });

    it("keeps note authors from being deleted", async () => {
      await addNote({ vehicleRequestId: world.musicRequest.id, authorId: world.maintenance.userId });

      const response = await request(app).delete(`/api/users/${world.maintenance.userId}`).set(bearer(world.admin.token));
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "User has notes and can't be deleted." });
    });
  });

  describe("US-14.5 — Users can delete their own notes if no one has responded", () => {
    it("All sign-in users can delete their own notes if no one has responded", async () => {
      const { requester, areaAdmin, maintenance } = world;
      const remove = (user, id) => request(app).delete(`/api/notes/${id}`).set(bearer(user.token));

      // The newest note: its author can delete it.
      const latest = await addNote({ vehicleRequestId: world.ownRequest.id, authorId: requester.userId });
      expect((await remove(requester, latest.id)).status).toBe(204);

      // Someone else's note → 403, for staff too.
      const theirs = await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId });
      const forbidden = await remove(requester, theirs.id);
      expect(forbidden.status).toBe(403);
      expect(forbidden.body).toEqual({ message: "You can only delete your own notes." });

      // A note with a reply from someone else → 400.
      const mine = await addNote({ vehicleRequestId: world.ownRequest.id, authorId: requester.userId });
      await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId });
      const replied = await remove(requester, mine.id);
      expect(replied.status).toBe(400);
      expect(replied.body).toEqual({ message: "Notes can only be deleted before someone replies." });
      expect((await remove(areaAdmin, mine.id)).status).toBe(403);

      // The author's own follow-ups aren't replies, and notes on other parents don't count.
      const first = await addNote({ maintenanceNeedId: world.athleticsNeed.id, authorId: maintenance.userId });
      await addNote({ maintenanceNeedId: world.athleticsNeed.id, authorId: maintenance.userId });
      await addNote({ maintenanceNeedId: world.musicNeed.id, authorId: areaAdmin.userId });
      expect((await remove(maintenance, first.id)).status).toBe(204);

      // An earlier note by someone else isn't a reply either.
      expect((await remove(areaAdmin, theirs.id)).status).toBe(400);
      const last = await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId });
      expect((await remove(areaAdmin, last.id)).status).toBe(204);
    });
  });
});

// UI/UX backlog #73: list rows say how many notes a record has (that the viewer may read) and when the latest came.
describe("UI/UX backlog #73 — Note counts on lists", () => {
  const list = (user, path, query = {}) => request(app).get(path).query(query).set(bearer(user.token));
  const byId = (rows, id) => rows.find((row) => row.id === id);

  it("counts a request's notes, leaving hidden notes out for the requester", async () => {
    const { requester, areaAdmin } = world;
    await addNote({ vehicleRequestId: world.ownRequest.id, authorId: requester.userId, createdAt: new Date("2026-10-01T12:00:00Z") });
    await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId, createdAt: new Date("2026-10-03T12:00:00Z") });
    await addNote({ vehicleRequestId: world.ownRequest.id, authorId: areaAdmin.userId, isVisible: false });

    const mine = await list(requester, "/api/me/requests");
    expect(mine.status).toBe(200);
    expect(byId(mine.body, world.ownRequest.id)).toMatchObject({ noteCount: 2, lastNoteAt: "2026-10-03T12:00:00.000Z" });

    const managed = await list(areaAdmin, "/api/requests");
    expect(byId(managed.body, world.ownRequest.id).noteCount).toBe(3);
  });

  it("counts issue report and maintenance need notes, and is zero with none", async () => {
    const { requester, admin, maintenance } = world;
    await addNote({ issueReportId: world.ownReport.id, authorId: requester.userId });
    await addNote({ maintenanceNeedId: world.athleticsNeed.id, authorId: maintenance.userId });
    await addNote({ maintenanceNeedId: world.athleticsNeed.id, authorId: admin.userId, isVisible: false });

    const reports = await list(admin, "/api/issue-reports");
    expect(byId(reports.body, world.ownReport.id).noteCount).toBe(1);
    expect(byId(reports.body, world.musicReport.id)).toMatchObject({ noteCount: 0, lastNoteAt: null });

    const needs = await list(maintenance, "/api/maintenance-needs");
    expect(needs.status).toBe(200);
    expect(byId(needs.body, world.athleticsNeed.id).noteCount).toBe(2);
    expect(byId(needs.body, world.musicNeed.id).noteCount).toBe(0);
  });
});
