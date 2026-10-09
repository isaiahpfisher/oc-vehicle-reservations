/**
 * Feature 2 — Semester Management
 * Spec: features/feature-2-semester-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import semesterServices from "../src/services/semesterServices.js";
import { vuetify } from "./testUtils.js";

// Students are redirected to the courses view, which loads through the shared API client.
vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/semesterServices.js", () => ({
  default: {
    getSemesters: vi.fn(),
    getSemesterById: vi.fn(),
    createSemester: vi.fn(),
    updateSemester: vi.fn(),
    removeSemester: vi.fn(),
  },
}));

const adminUser = {
  userId: 1,
  email: "admin@example.com",
  firstName: "Ada",
  lastName: "Admin",
  role: "admin",
  token: "admin-token",
};

const studentUser = {
  userId: 2,
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "student",
  token: "student-token",
};

const fall = {
  id: 1,
  name: "Fall 2026",
  startDate: "2026-08-24",
  endDate: "2026-12-18",
};

const spring = {
  id: 2,
  name: "Spring 2027",
  startDate: "2027-01-11",
  endDate: "2027-05-07",
};

const apiError = (status, message) => Object.assign(new Error(message), { response: { status, data: { message } } });

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await flushPromises();
  }
};

const waitFor = async (assertion, timeout = 1500) => {
  const start = Date.now();
  for (;;) {
    try {
      return assertion();
    } catch (error) {
      if (Date.now() - start > timeout) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      await flushPromises();
    }
  }
};

let wrapper;

const mountAppAt = async (path) => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const signIn = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((el) => el.textContent.trim() === text);

const textField = async (label) =>
  waitFor(() => {
    const field = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((component) => component.props("label") === label);
    expect(field).toBeDefined();
    return field;
  });

const openNewSemester = async () => {
  namedButton("+ New Semester").click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("New semester");
  });
};

const fillSemesterForm = async ({ name, startDate, endDate } = {}) => {
  if (name !== undefined) {
    await (await textField("Name")).setValue(name);
  }
  if (startDate !== undefined) {
    await (await textField("Start date")).setValue(startDate);
  }
  if (endDate !== undefined) {
    await (await textField("End date")).setValue(endDate);
  }
  await settle();
};

const clickNamed = async (text) => {
  const button = await waitFor(() => {
    const match = namedButton(text);
    expect(match).toBeDefined();
    return match;
  });
  button.click();
  await settle();
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: [] });
  semesterServices.getSemesters.mockResolvedValue({ data: [] });
  semesterServices.createSemester.mockResolvedValue({ data: fall });
  semesterServices.updateSemester.mockResolvedValue({ data: { ...fall, name: "Fall 2026 Term" } });
  semesterServices.removeSemester.mockResolvedValue({ data: { message: "semester deleted successfully." } });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 2 — Semester Management", () => {
  describe("US-2.1 — Create semesters", () => {
    it("Admin creates semester", async () => {
      signIn(adminUser);
      await mountAppAt("/semesters");

      await openNewSemester();

      expect(await textField("Name")).toBeDefined();
      expect(await textField("Start date")).toBeDefined();
      expect(await textField("End date")).toBeDefined();
    });

    it("Admin saves semester", async () => {
      signIn(adminUser);
      semesterServices.getSemesters.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [fall] });
      await mountAppAt("/semesters");

      await openNewSemester();
      await fillSemesterForm({ name: "Fall 2026", startDate: "2026-08-24", endDate: "2026-12-18" });
      await clickNamed("Create");

      await waitFor(() => expect(semesterServices.createSemester).toHaveBeenCalledTimes(1));
      expect(semesterServices.createSemester).toHaveBeenCalledWith({
        name: "Fall 2026",
        startDate: "2026-08-24",
        endDate: "2026-12-18",
      });
      await waitFor(() => expect(wrapper.text()).toContain("Fall 2026"));
    });

    it("User creates semester with missing fields", async () => {
      signIn(adminUser);
      await mountAppAt("/semesters");

      await openNewSemester();
      await clickNamed("Create");

      expect(semesterServices.createSemester).not.toHaveBeenCalled();
      expect(document.body.textContent.toLowerCase()).toContain("required");
    });

    it("User creates a semester with an end date before the start date", async () => {
      signIn(adminUser);
      semesterServices.createSemester.mockRejectedValue(
        apiError(400, "End date must be on or after the start date."),
      );
      await mountAppAt("/semesters");

      await openNewSemester();
      await fillSemesterForm({ name: "Fall 2026", startDate: "2026-12-18", endDate: "2026-08-24" });
      await clickNamed("Create");

      await waitFor(() => expect(document.body.textContent).toContain("End date must be on or after the start date."));
    });
  });

  describe("US-2.2 — View semesters", () => {
    it("Semesters view lists semesters", async () => {
      signIn(adminUser);
      semesterServices.getSemesters.mockResolvedValue({ data: [fall, spring] });
      await mountAppAt("/semesters");

      await waitFor(() => {
        expect(wrapper.text()).toContain("Fall 2026");
        expect(wrapper.text()).toContain("2026-08-24");
        expect(wrapper.text()).toContain("2026-12-18");
        expect(wrapper.text()).toContain("Spring 2027");
      });
    });

    it("Semesters empty state", async () => {
      signIn(adminUser);
      await mountAppAt("/semesters");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No semesters yet. Create your first semester.");
      });
    });
  });

  describe("US-2.3 — Manage semester rows", () => {
    it("Semester rows have edit and delete actions for admins", async () => {
      signIn(adminUser);
      semesterServices.getSemesters.mockResolvedValue({ data: [fall] });
      await mountAppAt("/semesters");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit semester"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete semester"]')).toBeTruthy();
      });
    });

    it("Semester rows do not show edit or delete actions for non-admins", async () => {
      signIn(studentUser);
      semesterServices.getSemesters.mockResolvedValue({ data: [fall] });
      await mountAppAt("/semesters");

      // The router sends students back to the courses view, so no semester rows or actions render.
      expect(router.currentRoute.value.name).toBe("home");
      expect(wrapper.text()).not.toContain("Fall 2026");
      expect(document.body.querySelector('[aria-label="Edit semester"]')).toBeNull();
      expect(document.body.querySelector('[aria-label="Delete semester"]')).toBeNull();
      expect(namedButton("+ New Semester")).toBeUndefined();
    });
  });

  describe("US-2.4 — Edit and delete semesters", () => {
    it("Admin edits a semester", async () => {
      signIn(adminUser);
      semesterServices.getSemesters
        .mockResolvedValueOnce({ data: [fall] })
        .mockResolvedValueOnce({ data: [{ ...fall, name: "Fall 2026 Term" }] });
      await mountAppAt("/semesters");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit semester"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit semester"]').click();
      await settle();
      await fillSemesterForm({ name: "Fall 2026 Term" });
      await clickNamed("Save");

      await waitFor(() => expect(semesterServices.updateSemester).toHaveBeenCalledTimes(1));
      expect(semesterServices.updateSemester).toHaveBeenCalledWith(1, {
        name: "Fall 2026 Term",
        startDate: "2026-08-24",
        endDate: "2026-12-18",
      });
      await waitFor(() => expect(wrapper.text()).toContain("Fall 2026 Term"));
    });

    it("Admin deletes a semester", async () => {
      signIn(adminUser);
      semesterServices.getSemesters.mockResolvedValueOnce({ data: [fall] }).mockResolvedValueOnce({ data: [] });
      await mountAppAt("/semesters");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete semester"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete semester"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(semesterServices.removeSemester).toHaveBeenCalledWith(1));
      await waitFor(() => {
        expect(document.body.textContent).toContain("No semesters yet. Create your first semester.");
      });
    });
  });
});
