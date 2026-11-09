/**
 * Feature 11 — Maintenance Needs
 * Spec: features/feature-11-maintenance-needs.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles, registerUser } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const tomorrowString = () => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const validBody = (overrides = {}) => ({
  title: "Oil Change",
  vehicleId: 1,
  assigneeId: null,
  description: "Change the oil",
  outOfService: false,
  priority: "Medium",
  status: "Open",
  resolvedAt: null,
  ...overrides,
});

const signIn = async (roles = ["admin"], overrides = {}) => {
  await registerUser({ email: `placeholder-${Date.now()}-${Math.random()}@oc.edu`, firstName: "Place", lastName: "Holder" });
  const { body } = await createUserWithRoles(roles, {
    email: `jane-${Date.now()}-${Math.random()}@oc.edu`,
    firstName: "Jane",
    lastName: "Doe",
    ...overrides,
  });
  return { headers: bearer(body.token), user: body };
};

const seedFleet = async ({ firstArea = "athletics" } = {}) => {
  const athletics = await db.area.create({ name: "Athletics", logo: "" });
  const music = await db.area.create({ name: "Music", logo: "" });
  const type = await db.vehicleType.create({ name: "Car", identifier: "VIN" });
  const base = {
    vehicleTypeId: type.id,
    make: "Toyota",
    model: "Sienna",
    year: 2015,
    purchasedAt: "2018-01-01",
    color: "Black",
    passengerCapacity: 8,
    status: "active",
  };

  const first = await db.vehicle.create({
    ...base,
    areaId: firstArea === "music" ? music.id : athletics.id,
    universityId: "V-001",
    identifier: "ID-1",
    licensePlate: "ABC-123",
  });
  const second = await db.vehicle.create({
    ...base,
    areaId: athletics.id,
    universityId: "V-002",
    identifier: "ID-2",
    licensePlate: "ABC-124",
  });

  return { athletics, music, first, second };
};

const createNeed = (overrides = {}) =>
  db.maintenanceNeed.create({
    authorId: 2,
    vehicleId: 1,
    title: "Oil Change",
    outOfService: false,
    priority: "Medium",
    status: "Open",
    ...overrides,
  });

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 11 — Maintenance Needs", () => {
  describe("US-11.1 — Create maintenance need from maintenance needs page", () => {
    it("Admin user requests to create a maintenance need", async () => {
      await seedFleet();
      const { headers, user } = await signIn();

      const response = await request(app).post("/api/maintenance-needs").set(headers).send(validBody());

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ title: "Oil Change", authorId: user.userId, vehicleId: 1 });

      const listed = await request(app).get("/api/maintenance-needs").set(headers);
      expect(listed.body.map((need) => need.id)).toContain(response.body.id);
    });

    const rejected = [
      ["Admin user requests to create a maintenance need with a missing title", { title: "" }, "Missing title."],
      ["Admin user requests to create a maintenance need with a whitespace-only title", { title: " " }, "Missing title."],
      [
        "Admin user requests to create a maintenance need with a title longer than 50 characters",
        { title: "x".repeat(51) },
        "Title cannot be longer than 50 characters.",
      ],
      ["Admin user requests to create a maintenance need with a missing vehicle id", { vehicleId: null }, "Missing vehicle id."],
      ["Admin user requests to create a maintenance need with a vehicle id that does not exist", { vehicleId: 45 }, "Vehicle does not exist."],
      ["Admin user requests to create a maintenance need with an assignee id that does not exist", { assigneeId: 45 }, "User does not exist."],
      ["Admin user requests to create a maintenance need with a missing out-of-service value", { outOfService: null }, "Out of service boolean is required."],
      [
        "Admin user requests to create a maintenance need with a non-boolean out-of-service value",
        { outOfService: "Yes" },
        "Out of service boolean must be a boolean.",
      ],
      ["Admin user requests to create a maintenance need with a missing priority", { priority: null }, "Priority is required."],
      ["Admin user requests to create a maintenance need with an invalid priority", { priority: "Urgent" }, "Priority must be Low, Medium, High, or None."],
      ["Admin user requests to create a maintenance need with a missing status", { status: null }, "Status is required."],
      [
        "Admin user requests to create a maintenance need with an invalid status",
        { status: "Postponed" },
        "Status must be Open, In Progress, Completed, or Canceled.",
      ],
      [
        "Admin user requests to create a maintenance need with a resolved date before 1950",
        { resolvedAt: "1949-01-01" },
        "Resolved at date must be between 1950 and today.",
      ],
      [
        "Admin user requests to create a maintenance need with a resolved date after today",
        { resolvedAt: tomorrowString() },
        "Resolved at date must be between 1950 and today.",
      ],
      [
        "Admin user requests to create a maintenance need with a resolved date that is not yyyy-mm-dd",
        { resolvedAt: "2026/01/01" },
        "Resolved at date must be in format yyyy-mm-dd.",
      ],
      [
        "Admin user requests to create a maintenance need with an issue report id that does not exist",
        { issueReportId: 45 },
        "Issue report id does not exist.",
      ],
    ];

    it.each(rejected)("%s", async (_title, override, message) => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app).post("/api/maintenance-needs").set(headers).send(validBody(override));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message });
    });

    it("Admin user requests to create a maintenance need with a missing author id", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      expect(user.userId).toBe(2);

      const response = await request(app).post("/api/maintenance-needs").set(headers).send(validBody({ authorId: null }));

      expect(response.status).toBe(201);
      expect(response.body.authorId).toBe(2);
    });

    it("Admin user requests to create a maintenance need with an author id that is not their own", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      expect(user.userId).toBe(2);

      const response = await request(app).post("/api/maintenance-needs").set(headers).send(validBody({ authorId: 45 }));

      expect(response.status).toBe(201);
      expect(response.body.authorId).toBe(2);

      const listed = await request(app).get("/api/maintenance-needs").set(headers);
      expect(listed.body.map((need) => need.id)).toContain(response.body.id);
    });

    it("Admin user requests to create a maintenance need with an assignee who is not a maintenance user", async () => {
      await seedFleet();
      const { headers } = await signIn();
      await db.user.create({ id: 45, firstName: "Pat", lastName: "Lee", email: "pat@oc.edu" });

      const response = await request(app).post("/api/maintenance-needs").set(headers).send(validBody({ assigneeId: 45 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "User does not have maintenance role." });
    });

    it("Admin user requests to create a maintenance need with a resolved date while status is Open", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/maintenance-needs")
        .set(headers)
        .send(validBody({ status: "Open", resolvedAt: "2026-11-03" }));

      expect(response.status).toBe(201);
      expect(response.body.resolvedAt).toBeNull();
    });

    it("Admin user requests to create a maintenance need with a resolved date while status is In Progress", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/maintenance-needs")
        .set(headers)
        .send(validBody({ status: "In Progress", resolvedAt: "2026-11-03" }));

      expect(response.status).toBe(201);
      expect(response.body.resolvedAt).toBeNull();
    });

    it("Admin user requests to create a maintenance need with status Completed and no resolved date", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/maintenance-needs")
        .set(headers)
        .send(validBody({ status: "Completed", resolvedAt: null }));

      expect(response.status).toBe(201);
      expect(response.body.resolvedAt).toBe(todayString());
    });

    it("Admin user requests to create a maintenance need with status Canceled and no resolved date", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/maintenance-needs")
        .set(headers)
        .send(validBody({ status: "Canceled", resolvedAt: null }));

      expect(response.status).toBe(201);
      expect(response.body.resolvedAt).toBe(todayString());
    });

    it("Admin user requests to create a maintenance need with an issue report id that is already used", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await db.issueReport.create({
        id: 45,
        vehicleId: 1,
        authorId: user.userId,
        type: "maintenance",
        description: "Already linked.",
        status: "pending",
      });
      await createNeed({ authorId: user.userId, issueReportId: 45, title: "Existing" });

      const response = await request(app).post("/api/maintenance-needs").set(headers).send(validBody({ issueReportId: 45 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Issue report already belongs to a maintenance need." });
    });

    it("Area admin user requests to create a maintenance need for a vehicle outside their area", async () => {
      const { athletics } = await seedFleet({ firstArea: "music" });
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }]);
      expect(athletics.id).toBe(1);

      const response = await request(app).post("/api/maintenance-needs").set(headers).send(validBody({ vehicleId: 1 }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Unauthorized for this area." });
    });
  });

  describe("US-11.2 — Create maintenance need from issue report", () => {
    it("Admin user requests to create a maintenance need from an issue report", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      const mechanic = await createUserWithRoles(["maintenance"], {
        email: "alex@oc.edu",
        firstName: "Alex",
        lastName: "Kim",
      });
      const report = await db.issueReport.create({
        vehicleId: 1,
        authorId: user.userId,
        assigneeId: mechanic.body.userId,
        type: "maintenance",
        description: "Oil change needed.",
        status: "pending",
      });

      const response = await request(app)
        .post("/api/maintenance-needs")
        .set(headers)
        .send(validBody({ issueReportId: report.id, title: "Something else", outOfService: false, priority: "High" }));

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Maintenance Needed",
        vehicleId: report.vehicleId,
        assigneeId: report.assigneeId,
        description: report.description,
        outOfService: true,
        priority: "None",
        status: "Open",
        resolvedAt: null,
        issueReportId: report.id,
      });

      const listed = await request(app).get("/api/maintenance-needs").set(headers);
      expect(listed.body.map((need) => need.id)).toContain(response.body.id);
    });
  });

  describe("US-11.5 — Edit and delete maintenance needs", () => {
    const rejected = [
      ["Admin user requests to edit a maintenance need with a missing title", { title: "" }, "Missing title."],
      ["Admin user requests to edit a maintenance need with a whitespace-only title", { title: " " }, "Missing title."],
      [
        "Admin user requests to edit a maintenance need with a title longer than 50 characters",
        { title: "x".repeat(51) },
        "Title cannot be longer than 50 characters.",
      ],
      ["Admin user requests to edit a maintenance need with a missing vehicle id", { vehicleId: null }, "Missing vehicle id."],
      ["Admin user requests to edit a maintenance need with a vehicle id that does not exist", { vehicleId: 45 }, "Vehicle does not exist."],
      ["Admin user requests to edit a maintenance need with an assignee id that does not exist", { assigneeId: 45 }, "User does not exist."],
      ["Admin user requests to edit a maintenance need with a missing out-of-service value", { outOfService: null }, "Out of service boolean is required."],
      [
        "Admin user requests to edit a maintenance need with a non-boolean out-of-service value",
        { outOfService: "Yes" },
        "Out of service boolean must be a boolean.",
      ],
      ["Admin user requests to edit a maintenance need with a missing priority", { priority: null }, "Priority is required."],
      ["Admin user requests to edit a maintenance need with an invalid priority", { priority: "Urgent" }, "Priority must be Low, Medium, High, or None."],
      ["Admin user requests to edit a maintenance need with a missing status", { status: null }, "Status is required."],
      [
        "Admin user requests to edit a maintenance need with an invalid status",
        { status: "Postponed" },
        "Status must be Open, In Progress, Completed, or Canceled.",
      ],
      [
        "Admin user requests to edit a maintenance need with a resolved date before 1950",
        { resolvedAt: "1949-01-01" },
        "Resolved at date must be between 1950 and today.",
      ],
      [
        "Admin user requests to edit a maintenance need with a resolved date after today",
        { resolvedAt: tomorrowString() },
        "Resolved at date must be between 1950 and today.",
      ],
      [
        "Admin user requests to edit a maintenance need with a resolved date that is not yyyy-mm-dd",
        { resolvedAt: "2026/01/01" },
        "Resolved at date must be in format yyyy-mm-dd.",
      ],
    ];

    it.each(rejected)("%s", async (_title, override, message) => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createNeed({ authorId: user.userId });

      const response = await request(app).put("/api/maintenance-needs/1").set(headers).send(validBody(override));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message });
    });

    it("Admin user requests to edit a maintenance need with an assignee who is not a maintenance user", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createNeed({ authorId: user.userId });
      await db.user.create({ id: 45, firstName: "Pat", lastName: "Lee", email: "pat@oc.edu" });

      const response = await request(app).put("/api/maintenance-needs/1").set(headers).send(validBody({ assigneeId: 45 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "User does not have maintenance role." });
    });

    it("Admin user requests to edit a maintenance need with a resolved date while status is Open", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createNeed({ authorId: user.userId });

      const response = await request(app)
        .put("/api/maintenance-needs/1")
        .set(headers)
        .send(validBody({ status: "Open", resolvedAt: "2026-11-03" }));

      expect(response.status).toBe(200);
      expect(response.body.resolvedAt).toBeNull();
    });

    it("Admin user requests to edit a maintenance need with a resolved date while status is In Progress", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createNeed({ authorId: user.userId });

      const response = await request(app)
        .put("/api/maintenance-needs/1")
        .set(headers)
        .send(validBody({ status: "In Progress", resolvedAt: "2026-11-03" }));

      expect(response.status).toBe(200);
      expect(response.body.resolvedAt).toBeNull();
    });

    it("Admin user requests to edit a maintenance need with status Completed and no resolved date", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createNeed({ authorId: user.userId });

      const response = await request(app)
        .put("/api/maintenance-needs/1")
        .set(headers)
        .send(validBody({ status: "Completed", resolvedAt: null }));

      expect(response.status).toBe(200);
      expect(response.body.resolvedAt).toBe(todayString());
    });

    it("Admin user requests to edit a maintenance need with status Canceled and no resolved date", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createNeed({ authorId: user.userId });

      const response = await request(app)
        .put("/api/maintenance-needs/1")
        .set(headers)
        .send(validBody({ status: "Canceled", resolvedAt: null }));

      expect(response.status).toBe(200);
      expect(response.body.resolvedAt).toBe(todayString());
    });

    it("Area admin user requests to edit a maintenance need outside their area", async () => {
      const { athletics } = await seedFleet({ firstArea: "music" });
      const { headers, user } = await signIn([{ role: "area_admin", areaId: athletics.id }]);
      await createNeed({ authorId: user.userId, vehicleId: 1 });

      const response = await request(app).put("/api/maintenance-needs/1").set(headers).send(validBody());

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Unauthorized for this area." });
    });

    it("Area admin user requests to delete a maintenance need outside their area", async () => {
      const { athletics } = await seedFleet({ firstArea: "music" });
      const { headers, user } = await signIn([{ role: "area_admin", areaId: athletics.id }]);
      await createNeed({ authorId: user.userId, vehicleId: 1 });

      const response = await request(app).delete("/api/maintenance-needs/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Unauthorized for this area." });
    });

    it("Admin user requests to edit a maintenance need that does not exist", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app).put("/api/maintenance-needs/45").set(headers).send(validBody());

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Maintenance need does not exist." });
    });

    it("Admin user requests to delete a maintenance need that does not exist", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app).delete("/api/maintenance-needs/45").set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Maintenance need does not exist." });
    });

    it("Admin user requests to delete a maintenance need", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createNeed({ authorId: user.userId });

      const response = await request(app).delete("/api/maintenance-needs/1").set(headers);

      expect(response.status).toBe(200);
      expect(await db.maintenanceNeed.findByPk(1)).toBeNull();
    });
  });

  describe("US-11.6 — Signed-in admin, area admin, or maintenance user access only", () => {
    const open = [
      ["Unauthenticated API request to maintenance needs", "get", "/api/maintenance-needs"],
      ["Unauthenticated API request to a particular maintenance need", "get", "/api/maintenance-needs/1"],
      ["Unauthenticated API request to create a maintenance need", "post", "/api/maintenance-needs"],
      ["Unauthenticated API request to update a maintenance need", "put", "/api/maintenance-needs/1"],
      ["Unauthenticated API request to delete a maintenance need", "delete", "/api/maintenance-needs/1"],
    ];

    it.each(open)("%s", async (_title, method, url) => {
      await seedFleet();
      await registerUser({ email: "author@oc.edu", firstName: "Ann", lastName: "Author" });
      await createNeed({ authorId: 1 });

      const response = await request(app)[method](url).send(validBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    const forbidden = [
      ["Signed-in user without admin, area admin, or maintenance role API request to maintenance needs", "get", "/api/maintenance-needs"],
      [
        "Signed-in user without admin, area admin, or maintenance role API request to a particular maintenance need",
        "get",
        "/api/maintenance-needs/1",
      ],
      [
        "Signed-in user without admin, area admin, or maintenance role API request to create a maintenance need",
        "post",
        "/api/maintenance-needs",
      ],
      [
        "Signed-in user without admin, area admin, or maintenance role API request to update a maintenance need",
        "put",
        "/api/maintenance-needs/1",
      ],
      [
        "Signed-in user without admin, area admin, or maintenance role API request to delete a maintenance need",
        "delete",
        "/api/maintenance-needs/1",
      ],
    ];

    it.each(forbidden)("%s", async (_title, method, url) => {
      await seedFleet();
      const { headers, user } = await signIn([]);
      await createNeed({ authorId: user.userId });

      const response = await request(app)[method](url).set(headers).send(validBody());

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "One of these roles is required: admin, area_admin, maintenance." });
    });
  });
});
