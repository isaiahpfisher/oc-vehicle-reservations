/**
 * Feature 4 — Faculty Management
 * Spec: features/feature-4-faculty-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import facultyServices from "../src/services/facultyServices.js";
import { vuetify } from "./testUtils.js";

vi.mock("../src/services/facultyServices.js", () => ({
  default: {
    getFaculty: vi.fn(),
    getFacultyById: vi.fn(),
    createFaculty: vi.fn(),
    updateFaculty: vi.fn(),
    removeFaculty: vi.fn(),
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

const david = {
  facultyId: 1,
  firstName: "David",
  lastName: "North",
  department: "Computer Science",
};

const glen = {
  facultyId: 2,
  firstName: "Glen",
  lastName: "Davis",
  department: "Computer Science",
};

const travis = {
  facultyId: 3,
  firstName: "Travis",
  lastName: "Montgomery",
  department: "English",
};

const twentyOneFaculty = Array.from({ length: 21 }, (_, index) => ({
  facultyId: index + 1,
  firstName: index === 20 ? "TwentyFirst" : `Person${index + 1}`,
  lastName: "Faculty",
  department: "Art",
}));

const setSearch = async (value) => {
  const input = await waitFor(() => {
    const field = wrapper.find('input[placeholder="Search faculty..."]');
    expect(field.exists()).toBe(true);
    return field;
  });
  await input.setValue(value);
  await settle();
};

const clickNextPage = async () => {
  const button = await waitFor(() => {
    const next =
      document.body.querySelector('[aria-label="Next page"]') ||
      document.body.querySelector(".v-pagination__next button") ||
      [...document.body.querySelectorAll(".v-pagination button")].find((el) =>
        (el.getAttribute("aria-label") || el.textContent || "").toLowerCase().includes("next"),
      );
    expect(next).toBeTruthy();
    return next;
  });
  button.click();
  await settle();
};

const tooLong = "a".repeat(256);
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

const setDepartment = async (value) => {
  const select = await waitFor(() => {
    const field = wrapper
      .findAllComponents({ name: "VSelect" })
      .find((component) => component.props("label") === "Department");
    expect(field).toBeDefined();
    return field;
  });
  await select.setValue(value);
  await settle();
};

const fillFacultyForm = async ({ firstName, lastName, department } = {}) => {
  if (firstName !== undefined) {
    await (await textField("First Name")).setValue(firstName);
  }
  if (lastName !== undefined) {
    await (await textField("Last Name")).setValue(lastName);
  }
  if (department !== undefined) {
    await setDepartment(department);
  }
  await settle();
};

const submitFacultyForm = async (submitText) => {
  const button = await waitFor(() => {
    const match = namedButton(submitText);
    expect(match).toBeDefined();
    return match;
  });
  button.click();
  await settle();
};

const openNewFaculty = async () => {
  namedButton("+ New Faculty").click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("Add Faculty");
  });
};

const openRowAction = async (fullName, action) => {
  const card = wrapper.findAll(".v-card").find((item) => item.text().includes(fullName));
  await card.find('[aria-label="Faculty actions"]').trigger("click");
  await settle();
  const item = await waitFor(() => {
    const match = [...document.body.querySelectorAll(".v-list-item")].find((el) => el.textContent.trim().includes(action));
    expect(match).toBeDefined();
    return match;
  });
  item.click();
  await settle();
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  facultyServices.getFaculty.mockResolvedValue({ data: [] });
  facultyServices.createFaculty.mockResolvedValue({ data: david });
  facultyServices.updateFaculty.mockResolvedValue({ data: david });
  facultyServices.removeFaculty.mockResolvedValue({ data: { message: "faculty deleted successfully." } });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 4 — Faculty Management UI", () => {
  describe("US-4.1 — Create faculty", () => {
    it("Admin user creates a new faculty", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [david] });
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ firstName: "David", lastName: "North", department: "Computer Science" });
      await submitFacultyForm("Create");

      await waitFor(() => expect(facultyServices.createFaculty).toHaveBeenCalledTimes(1));
      expect(facultyServices.createFaculty).toHaveBeenCalledWith({
        firstName: "David",
        lastName: "North",
        department: "Computer Science",
      });
      await waitFor(() => expect(wrapper.text()).toContain("David North"));
      await waitFor(() => expect(document.body.querySelector(".v-overlay--active")).toBeNull());
    });

    it("Admin user creates a faculty with an empty first name", async () => {
      signIn(adminUser);
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ lastName: "North", department: "Computer Science" });
      await submitFacultyForm("Create");

      await waitFor(() => expect(document.body.textContent).toContain("firstName is required."));
      expect(facultyServices.createFaculty).not.toHaveBeenCalled();
    });

    it("Admin user creates a faculty with an empty last name", async () => {
      signIn(adminUser);
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ firstName: "David", department: "Computer Science" });
      await submitFacultyForm("Create");

      await waitFor(() => expect(document.body.textContent).toContain("lastName is required."));
      expect(facultyServices.createFaculty).not.toHaveBeenCalled();
    });

    it("Admin user creates a faculty with an empty department", async () => {
      signIn(adminUser);
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ firstName: "David", lastName: "North" });
      await submitFacultyForm("Create");

      await waitFor(() => expect(document.body.textContent).toContain("Department is required."));
      expect(facultyServices.createFaculty).not.toHaveBeenCalled();
    });

    it("Admin user creates a faculty with a first name that is too long", async () => {
      signIn(adminUser);
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ firstName: tooLong, lastName: "North", department: "Computer Science" });
      await submitFacultyForm("Create");

      await waitFor(() => expect(document.body.textContent).toContain("First name must be 255 characters or fewer."));
      expect(facultyServices.createFaculty).not.toHaveBeenCalled();
    });

    it("Admin user creates a faculty with a last name that is too long", async () => {
      signIn(adminUser);
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ firstName: "David", lastName: tooLong, department: "Computer Science" });
      await submitFacultyForm("Create");

      await waitFor(() => expect(document.body.textContent).toContain("Last name must be 255 characters or fewer."));
      expect(facultyServices.createFaculty).not.toHaveBeenCalled();
    });

    it("Admin user creates a faculty with a department that is too long", async () => {
      signIn(adminUser);
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ firstName: "David", lastName: "North", department: tooLong });
      await submitFacultyForm("Create");

      await waitFor(() =>
        expect(document.body.textContent).toContain(
          "Department must be one of Computer Science, Engineering, English, Business, Art.",
        ),
      );
      expect(facultyServices.createFaculty).not.toHaveBeenCalled();
    });

    it("Admin user creates a faculty identical to an existing faculty", async () => {
      signIn(adminUser);
      facultyServices.getFaculty
        .mockResolvedValueOnce({ data: [david] })
        .mockResolvedValueOnce({ data: [david, { ...david, facultyId: 3 }] });
      await mountAppAt("/faculty");

      await openNewFaculty();
      await fillFacultyForm({ firstName: "David", lastName: "North", department: "Computer Science" });
      await submitFacultyForm("Create");

      await waitFor(() => expect(facultyServices.createFaculty).toHaveBeenCalledTimes(1));
      await waitFor(() => {
        const matches = wrapper.findAll(".v-card-title").filter((title) => title.text().includes("David North"));
        expect(matches.length).toBe(2);
      });
    });
  });

  describe("US-4.2 — View faculty", () => {
    it("Faculty view loads with existing faculty", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david, glen] });
      await mountAppAt("/faculty");

      const text = wrapper.text();
      expect(text).toContain("David North");
      expect(text).toContain("Glen Davis");
      expect(text.indexOf("David North")).toBeLessThan(text.indexOf("Glen Davis"));
      expect(text).toContain("Computer Science");

      await wrapper.find('[aria-label="Faculty actions"]').trigger("click");
      await waitFor(() => expect(document.body.textContent).toContain("Edit"));
      expect(document.body.textContent).toContain("Delete");
    });

    it("There exist no faculty", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [] });
      await mountAppAt("/faculty");

      expect(wrapper.text()).toContain("No faculty yet");
      expect(wrapper.text()).toContain("Create your first faculty to get started.");
    });
  });

  describe("US-4.3 — Manage faculty rows", () => {
    it("Faculty rows show edit and delete actions", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david] });
      await mountAppAt("/faculty");

      await wrapper.find('[aria-label="Faculty actions"]').trigger("click");
      await waitFor(() => expect(document.body.textContent).toContain("Edit"));
      expect(document.body.textContent).toContain("Delete");
    });
  });

  describe("US-4.4 — Update and delete faculty", () => {
    it("Admin user edits faculty first name", async () => {
      const updated = { ...david, firstName: "Bob" };
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValueOnce({ data: [david] }).mockResolvedValueOnce({ data: [updated] });
      facultyServices.updateFaculty.mockResolvedValue({ data: updated });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await waitFor(() => expect(document.body.textContent).toContain("Edit Faculty"));
      await fillFacultyForm({ firstName: "Bob" });
      await submitFacultyForm("Save");

      await waitFor(() => expect(facultyServices.updateFaculty).toHaveBeenCalledTimes(1));
      expect(facultyServices.updateFaculty).toHaveBeenCalledWith(1, {
        firstName: "Bob",
        lastName: "North",
        department: "Computer Science",
      });
      await waitFor(() => expect(wrapper.text()).toContain("Bob North"));
      expect(wrapper.text()).not.toContain("David North");
    });

    it("Admin user edits faculty last name", async () => {
      const updated = { ...david, lastName: "South" };
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValueOnce({ data: [david] }).mockResolvedValueOnce({ data: [updated] });
      facultyServices.updateFaculty.mockResolvedValue({ data: updated });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await waitFor(() => expect(document.body.textContent).toContain("Edit Faculty"));
      await fillFacultyForm({ lastName: "South" });
      await submitFacultyForm("Save");

      await waitFor(() => expect(facultyServices.updateFaculty).toHaveBeenCalledWith(1, expect.objectContaining({ lastName: "South" })));
      await waitFor(() => expect(wrapper.text()).toContain("David South"));
    });

    it("Admin user edits faculty department", async () => {
      const updated = { ...david, department: "Engineering" };
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValueOnce({ data: [david] }).mockResolvedValueOnce({ data: [updated] });
      facultyServices.updateFaculty.mockResolvedValue({ data: updated });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await waitFor(() => expect(document.body.textContent).toContain("Edit Faculty"));
      await setDepartment("Engineering");
      await submitFacultyForm("Save");

      await waitFor(() =>
        expect(facultyServices.updateFaculty).toHaveBeenCalledWith(1, expect.objectContaining({ department: "Engineering" })),
      );
      await waitFor(() => expect(wrapper.text()).toContain("Engineering"));
      expect(wrapper.text()).toContain("David North");
    });

    it("Admin user updates a faculty to have an empty first name", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david] });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await fillFacultyForm({ firstName: "   " });
      await submitFacultyForm("Save");

      await waitFor(() => expect(document.body.textContent).toContain("firstName is required."));
      expect(facultyServices.updateFaculty).not.toHaveBeenCalled();
    });

    it("Admin user updates a faculty to have an empty last name", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david] });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await fillFacultyForm({ lastName: "   " });
      await submitFacultyForm("Save");

      await waitFor(() => expect(document.body.textContent).toContain("lastName is required."));
      expect(facultyServices.updateFaculty).not.toHaveBeenCalled();
    });

    it("Admin user updates a faculty to have an empty department", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david] });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await setDepartment("");
      await submitFacultyForm("Save");

      await waitFor(() => expect(document.body.textContent).toContain("Department is required."));
      expect(facultyServices.updateFaculty).not.toHaveBeenCalled();
    });

    it("Admin user updates a faculty to have a first name that is too long", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david] });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await fillFacultyForm({ firstName: tooLong });
      await submitFacultyForm("Save");

      await waitFor(() => expect(document.body.textContent).toContain("First name must be 255 characters or fewer."));
      expect(facultyServices.updateFaculty).not.toHaveBeenCalled();
    });

    it("Admin user updates a faculty to have a last name that is too long", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david] });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await fillFacultyForm({ lastName: tooLong });
      await submitFacultyForm("Save");

      await waitFor(() => expect(document.body.textContent).toContain("Last name must be 255 characters or fewer."));
      expect(facultyServices.updateFaculty).not.toHaveBeenCalled();
    });

    it("Admin user updates a faculty to have a department that is too long", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david] });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Edit");
      await setDepartment(tooLong);
      await submitFacultyForm("Save");

      await waitFor(() =>
        expect(document.body.textContent).toContain(
          "Department must be one of Computer Science, Engineering, English, Business, Art.",
        ),
      );
      expect(facultyServices.updateFaculty).not.toHaveBeenCalled();
    });

    it("Admin user deletes a faculty", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValueOnce({ data: [david] }).mockResolvedValueOnce({ data: [] });
      await mountAppAt("/faculty");

      await openRowAction("David North", "Delete");
      await waitFor(() => expect(document.body.textContent).toContain("Delete faculty"));
      namedButton("Delete Faculty").click();
      await settle();

      await waitFor(() => expect(facultyServices.removeFaculty).toHaveBeenCalledWith(1));
      await waitFor(() => expect(wrapper.text()).not.toContain("David North"));
    });
  });

  describe("US-4.5 — Admin-only faculty", () => {
    it("Unauthenticated user tries to access the faculty view", async () => {
      await mountAppAt("/faculty");

      expect(router.currentRoute.value.name).toBe("login");
      expect(wrapper.text()).toContain("Sign in");
      expect(facultyServices.getFaculty).not.toHaveBeenCalled();
    });

    it("User with student role cannot open the faculty view", async () => {
      signIn(studentUser);
      facultyServices.getFaculty.mockRejectedValue(apiError(403, "Admin role required."));
      await mountAppAt("/faculty");

      expect(wrapper.text()).not.toContain("David North");
      expect(namedButton("+ New Faculty")).toBeUndefined();
      expect([...wrapper.findAll("a, button")].some((el) => el.text().trim() === "Faculty")).toBe(false);
    });
  });

  describe("US-4.6 — Search/paginate faculty", () => {
    it("Users can search faculty by last name", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david, glen] });
      await mountAppAt("/faculty");

      await setSearch("North");

      await waitFor(() => expect(wrapper.text()).toContain("David North"));
      expect(wrapper.text()).not.toContain("Glen Davis");
      expect(facultyServices.getFaculty).toHaveBeenCalledTimes(1);
    });

    it("Users can search faculty by first name", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david, glen] });
      await mountAppAt("/faculty");

      await setSearch("Glen");

      await waitFor(() => expect(wrapper.text()).toContain("Glen Davis"));
      expect(wrapper.text()).not.toContain("David North");
      expect(facultyServices.getFaculty).toHaveBeenCalledTimes(1);
    });

    it("Users can search faculty by department", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david, glen, travis] });
      await mountAppAt("/faculty");

      await setSearch("Computer Science");

      await waitFor(() => expect(wrapper.text()).toContain("David North"));
      expect(wrapper.text()).toContain("Glen Davis");
      expect(wrapper.text()).not.toContain("Travis Montgomery");
      expect(facultyServices.getFaculty).toHaveBeenCalledTimes(1);
    });

    it("No matches for search", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: [david, glen] });
      await mountAppAt("/faculty");

      await setSearch("zzzz");

      await waitFor(() => expect(wrapper.text()).toContain("No matches"));
      expect(wrapper.text()).not.toContain("David North");
      expect(wrapper.text()).not.toContain("Glen Davis");
    });

    it("Faculty list paginates", async () => {
      signIn(adminUser);
      facultyServices.getFaculty.mockResolvedValue({ data: twentyOneFaculty });
      await mountAppAt("/faculty");

      expect(wrapper.text()).toContain("Person1 Faculty");
      expect(wrapper.text()).not.toContain("TwentyFirst Faculty");

      await clickNextPage();

      await waitFor(() => expect(wrapper.text()).toContain("TwentyFirst Faculty"));
      expect(wrapper.text()).not.toContain("Person1 Faculty");
    });
  });
});
