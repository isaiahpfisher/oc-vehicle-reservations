/**
 * Feature 7 — Course Listing
 * Spec: features/feature-7-course-listing.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VSelect } from "vuetify/components";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import { vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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
  email: "sam@example.com",
  firstName: "Sam",
  lastName: "Doe",
  role: "student",
  token: "student-token",
};

const fall = { id: 1, name: "Fall 2026", startDate: "2026-08-24", endDate: "2026-12-11" };
const spring = { id: 2, name: "Spring 2027", startDate: "2027-01-11", endDate: "2027-05-07" };

const listing = (courseNumber, overrides = {}) => ({
  enrollmentId: Number(courseNumber.replace(/\D/g, "")),
  sectionId: `${courseNumber}-01`,
  courseName: courseNumber === "CMSC-1200" ? "Programming I" : "Software Engineering I",
  creditHours: 3,
  frequency: "M,W,F",
  startTime: "14:30:00",
  endTime: "15:30:00",
  ...overrides,
});

const intro = listing("CMSC-1200", { enrollmentId: 1 });
const software = listing("CMSC-1234", { enrollmentId: 2 });

let listingsBySemester = {};

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

const pageText = () => document.body.textContent;

const listingGets = () =>
  apiClient.get.mock.calls.filter(([url]) => String(url).startsWith("course-listings"));

const semesterSelect = () =>
  wrapper.findAllComponents(VSelect).find((component) => component.props("label") === "Semester");

const openSemesterDropdown = async () => {
  const select = await waitFor(() => {
    const field = semesterSelect();
    expect(field).toBeDefined();
    return field;
  });
  const control = select.find(".v-field") || select.find('[role="combobox"]') || select.find("input");
  await control.trigger("click");
  await settle();
  if (typeof select.vm.menu !== "undefined") {
    select.vm.menu = true;
    await settle();
  }
  return select;
};

const selectSemester = async (semesterId) => {
  const select = await waitFor(() => {
    const field = semesterSelect();
    expect(field).toBeDefined();
    return field;
  });
  await select.setValue(semesterId);
  await settle();
};

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

const stubApi = (semesters = [fall, spring]) => {
  apiClient.get.mockImplementation((url) => {
    if (url === "semesters") {
      return Promise.resolve({ data: semesters });
    }
    if (String(url).startsWith("course-listings/")) {
      const semesterId = Number(String(url).split("/")[1]);
      return Promise.resolve({ data: listingsBySemester[semesterId] ?? [] });
    }
    return Promise.resolve({ data: [] });
  });
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  listingsBySemester = {};
  stubApi();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 7 — Course Listing UI", () => {
  describe("US-7.1 — Open the course listing", () => {
    it("Signed-in student user opens the course listing", async () => {
      signIn(studentUser);
      await mountAppAt("/course-listing");

      expect(pageText()).toContain("Semester");
      expect(pageText()).toContain("Select a semester to view courses.");
      expect(semesterSelect().props("modelValue")).toBeNull();
      expect(listingGets()).toHaveLength(0);
    });

    it("Signed-in student user clicks on the **Semester:** dropdown", async () => {
      signIn(studentUser);
      await mountAppAt("/course-listing");

      const select = await openSemesterDropdown();

      await waitFor(() => {
        const names = (select.props("items") ?? []).map((item) => item.name);
        expect(names).toEqual(["Fall 2026", "Spring 2027"]);
      });
    });

    it("No semesters exist", async () => {
      stubApi([]);
      signIn(studentUser);
      await mountAppAt("/course-listing");

      await openSemesterDropdown();

      expect(semesterSelect().props("items")).toEqual([]);
      expect(pageText()).not.toContain("Fall 2026");
      expect(pageText()).not.toContain("Spring 2027");
    });
  });

  describe("US-7.2 — View courses for selected semester", () => {
    it("Signed-in student user selects a semester", async () => {
      listingsBySemester = { 1: [intro, software] };
      signIn(studentUser);
      await mountAppAt("/course-listing");

      await openSemesterDropdown();
      await selectSemester(1);

      await waitFor(() => {
        expect(pageText()).toContain("CMSC-1200");
        expect(pageText()).toContain("CMSC-1234");
      });
      expect(listingGets()).toEqual([["course-listings/1"]]);
    });

    it("Enrollments are filtered by semester", async () => {
      listingsBySemester = { 1: [intro], 2: [software] };
      signIn(studentUser);
      await mountAppAt("/course-listing");

      await selectSemester(1);

      await waitFor(() => expect(pageText()).toContain("CMSC-1200"));
      expect(pageText()).not.toContain("CMSC-1234");
    });

    it("Signed-in student user has no enrollments in selected semester", async () => {
      listingsBySemester = { 1: [] };
      signIn(studentUser);
      await mountAppAt("/course-listing");

      await selectSemester(1);

      await waitFor(() => expect(pageText()).toContain("No enrolled courses."));
      expect(pageText()).not.toContain("CMSC-1200");
      expect(pageText()).not.toContain("CMSC-1234");
    });
  });

  describe("US-7.3 — Change selected semester", () => {
    it("Signed-in student changes selected semester", async () => {
      listingsBySemester = { 1: [intro], 2: [software] };
      signIn(studentUser);
      await mountAppAt("/course-listing");

      await selectSemester(1);
      await waitFor(() => expect(pageText()).toContain("CMSC-1200"));

      await selectSemester(2);

      await waitFor(() => expect(pageText()).toContain("CMSC-1234"));
      expect(pageText()).not.toContain("CMSC-1200");
    });
  });

  describe("US-7.4 — Private courses only", () => {
    it("Enrollments are filtered by student", async () => {
      listingsBySemester = { 1: [intro] };
      signIn(studentUser);
      await mountAppAt("/course-listing");

      await selectSemester(1);

      await waitFor(() => expect(pageText()).toContain("CMSC-1200"));
      expect(pageText()).not.toContain("CMSC-1234");
    });

    it("Unauthenticated user tries to access the course listing view", async () => {
      await mountAppAt("/course-listing");

      expect(router.currentRoute.value.name).toBe("login");
      expect(pageText()).toContain("Sign in");
      expect(listingGets()).toHaveLength(0);
    });

    it("User with admin role cannot open the course listing view", async () => {
      signIn(adminUser);
      await mountAppAt("/course-listing");

      expect(router.currentRoute.value.name).toBe("home");
      expect(pageText()).not.toContain("Course Listing");
      expect(semesterSelect()).toBeUndefined();
      expect(pageText()).not.toContain("CMSC-1200");
    });
  });
});
