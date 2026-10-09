/**
 * Feature 5 — Section Management
 * Spec: features/feature-5-section-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VBtn, VDialog, VListItem, VSelect, VTextField } from "vuetify/components";
import App from "../src/App.vue";
import router from "../src/router.js";
import courseServices from "../src/services/courseServices.js";
import facultyServices from "../src/services/facultyServices.js";
import sectionServices from "../src/services/sectionServices.js";
import semesterServices from "../src/services/semesterServices.js";
import { vuetify } from "./testUtils.js";

vi.mock("../src/services/courseServices.js", () => ({
  default: {
    getCourses: vi.fn(),
    getCourse: vi.fn(),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    removeCourse: vi.fn(),
  },
}));

vi.mock("../src/services/facultyServices.js", () => ({
  default: {
    getFaculty: vi.fn(),
    getFacultyById: vi.fn(),
    createFaculty: vi.fn(),
    updateFaculty: vi.fn(),
    removeFaculty: vi.fn(),
  },
}));

vi.mock("../src/services/sectionServices.js", () => ({
  default: {
    getSections: vi.fn(),
    getSection: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    removeSection: vi.fn(),
  },
}));

vi.mock("../src/services/semesterServices.js", () => ({
  default: { getSemesters: vi.fn() },
}));

const adminUser = {
  userId: 1,
  email: "admin@example.com",
  firstName: "Ada",
  lastName: "Admin",
  role: "admin",
  token: "admin-token",
};
const studentUser = { ...adminUser, userId: 2, email: "sam@example.com", firstName: "Sam", role: "student" };

const faculty = { facultyId: 3, firstName: "David", lastName: "North", department: "Computer Science" };
const semester = { id: 1, name: "Fall 2026" };

const section = (overrides = {}) => ({
  id: 10,
  sectionNumber: "COMP-2100-01",
  semesterId: 1,
  courseId: 1,
  facultyFacultyId: 3,
  daysOfWeek: "M,W,F",
  startTime: "14:30:00",
  endTime: "15:30:00",
  faculty,
  semester,
  ...overrides,
});

const course = (overrides = {}) => ({
  id: 1,
  name: "Programming II",
  number: "COMP-2100",
  description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
  semesters: ["Fall"],
  frequency: "Yearly",
  hours: 3,
  department: "Computer Science",
  sections: [],
  ...overrides,
});

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
      if (Date.now() - start > timeout) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10));
      await flushPromises();
    }
  }
};

let wrapper;

const mountCoursesAs = async (user, courses = []) => {
  localStorage.setItem("user", JSON.stringify(user));
  courseServices.getCourses.mockResolvedValue({ data: courses });
  facultyServices.getFaculty.mockResolvedValue({ data: [faculty] });
  semesterServices.getSemesters.mockResolvedValue({ data: [semester] });
  await router.push("/");
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const pageText = () => document.body.textContent;

const openDialog = () => {
  const dialog = wrapper.findAllComponents(VDialog).find((d) => d.props("modelValue"));
  expect(dialog).toBeDefined();
  return dialog;
};

const buttonIn = (scope, text) => {
  const found = scope.findAllComponents(VBtn).find((b) => b.text().trim() === text);
  expect(found, `button "${text}"`).toBeDefined();
  return found;
};

const cardMenus = () => wrapper.findAll('[aria-label="Course actions"]');

/**
 * Vuetify dialogs teleport to body, and v-list-item may keep aria-label as a Vue attr
 * rather than a CSS-selectable DOM attribute. Find the list items by component attr.
 */
const deleteSectionButtons = () =>
  wrapper
    .findAllComponents(VListItem)
    .filter((item) => item.attributes("aria-label") === "Delete section");

const menuItem = (title) => {
  const found = wrapper.findAllComponents(VListItem).find((item) => item.props("title") === title);
  expect(found, `menu item "${title}"`).toBeDefined();
  return found;
};

const openCardMenu = async (index = 0) => {
  const menu = cardMenus()[index];
  expect(menu, `"Course actions" button #${index}`).toBeDefined();
  await menu.trigger("click");
  await settle();
};

const chooseCardAction = async (index, title) => {
  await openCardMenu(index);
  await waitFor(() => menuItem(title));
  await menuItem(title).trigger("click");
  await settle();
};

const openEditDialog = async (index = 0) => {
  await chooseCardAction(index, "Edit");
  return openDialog();
};

const sectionNumberFields = (dialog) =>
  dialog.findAllComponents(VTextField).filter((f) => /COMP-1234-21/.test(`${f.props("hint") ?? ""}`));

const sectionNumberValues = (dialog) => sectionNumberFields(dialog).map((f) => f.find("input").element.value);

/** `addSection` prepends, so the newest row is first. */
const newestSectionNumberField = (dialog) => {
  const field = sectionNumberFields(dialog).at(0);
  expect(field, "section number field").toBeDefined();
  return field;
};

const sectionField = (dialog, label) => {
  const fields = [VSelect, VTextField].flatMap((type) => dialog.findAllComponents(type));
  const found = fields.find((f) => f.props("label") === label && f.props("label") !== "Number");
  if (label === "Number") {
    return newestSectionNumberField(dialog);
  }
  expect(found, `section field "${label}"`).toBeDefined();
  return found;
};

const fillSection = async (dialog, values) => {
  for (const [label, value] of Object.entries(values)) {
    const field = sectionField(dialog, label);
    if (field.vm.$.type === VSelect) {
      field.vm.$emit("update:modelValue", value);
    } else {
      await field.find("input").setValue(value);
    }
    await settle();
  }
};

/** Focus then blur a section field so Vuetify runs that field's :rules (untouched selects stay silent). */
const touchSectionField = async (dialog, label) => {
  const field = sectionField(dialog, label);
  const input = field.find("input");
  expect(input.exists(), `${label} input`).toBe(true);
  await input.trigger("focus");
  await settle();
  await input.trigger("blur");
  await settle();
};

/** Dialog content teleports to body; blur the Number field's enclosing row so @focusout fires. */
const blurSectionRow = async (dialog) => {
  const field = newestSectionNumberField(dialog);
  const row = field.element.closest(".v-row");
  expect(row, "section row").toBeTruthy();
  row.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  await settle();
};

const completeSection = {
  Number: "COMP-2100-01",
  "Start Time": "14:30:00",
  "End Time": "15:30:00",
  Semester: 1,
  Professor: 3,
  Days: "M,W,F",
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  sectionServices.createSection.mockResolvedValue({ data: section() });
  sectionServices.updateSection.mockResolvedValue({ data: section({ sectionNumber: "CSMC-3012-02" }) });
  sectionServices.removeSection.mockResolvedValue({ data: { message: "section deleted successfully." } });
  courseServices.updateCourse.mockResolvedValue({ data: course() });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 5 — Section Management UI", () => {
  describe("US-5.1 — Create sections", () => {
    it("Admin creates section", async () => {
      await mountCoursesAs(adminUser, [course()]);
      const dialog = await openEditDialog();

      expect(sectionNumberFields(dialog)).toHaveLength(0);
      await buttonIn(dialog, "+ New Section").trigger("click");
      await settle();

      expect(sectionNumberFields(dialog).length).toBeGreaterThan(0);
    });

    it("Admin saves section", async () => {
      const math = section({ id: 11, sectionNumber: "MATH-1100-01" });
      const created = section();
      await mountCoursesAs(adminUser, [course({ sections: [math] })]);
      sectionServices.createSection.mockResolvedValueOnce({ data: created });

      const dialog = await openEditDialog();
      await buttonIn(dialog, "+ New Section").trigger("click");
      await settle();
      await fillSection(dialog, completeSection);
      await blurSectionRow(dialog);

      await waitFor(() => expect(sectionServices.createSection).toHaveBeenCalledTimes(1));
      expect(sectionServices.createSection).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionNumber: "COMP-2100-01",
          semesterId: 1,
          courseId: 1,
          facultyFacultyId: 3,
          daysOfWeek: "M,W,F",
          startTime: "14:30:00",
          endTime: "15:30:00",
        }),
      );
      expect(courseServices.updateCourse).not.toHaveBeenCalled();
      await waitFor(() => expect(sectionNumberValues(dialog)).toContain("COMP-2100-01"));
      const numbers = sectionNumberValues(dialog);
      expect(numbers.indexOf("COMP-2100-01")).toBeLessThan(numbers.indexOf("MATH-1100-01"));
    });

    it("User creates section with missing fields", async () => {
      await mountCoursesAs(adminUser, [course()]);
      const dialog = await openEditDialog();
      await buttonIn(dialog, "+ New Section").trigger("click");
      await settle();
      await fillSection(dialog, {
        Number: "COMP-2100-01",
        "Start Time": "14:30:00",
        "End Time": "15:30:00",
        Professor: 3,
        Days: "M,W,F",
      });
      await touchSectionField(dialog, "Semester");
      await blurSectionRow(dialog);

      await waitFor(() => expect(pageText()).toMatch(/required/i));
      expect(sectionServices.createSection).not.toHaveBeenCalled();
    });

    it("User creates a section with invalid fields", async () => {
      await mountCoursesAs(adminUser, [course()]);
      sectionServices.createSection.mockRejectedValueOnce(
        apiError(400, "Number must be in the format XXXX-####-## (ex. COMP-2100-01)"),
      );

      const dialog = await openEditDialog();
      await buttonIn(dialog, "+ New Section").trigger("click");
      await settle();
      await fillSection(dialog, { ...completeSection, Number: "CS210432" });
      await blurSectionRow(dialog);

      await waitFor(() => expect(pageText()).toContain("XXXX-####-##"));
      expect(pageText()).not.toContain("CS210432");
    });
  });

  describe("US-5.2 — View sections", () => {
    it("Sections view lists sections", async () => {
      await mountCoursesAs(adminUser, [
        course({
          sections: [
            section(),
            section({ id: 11, sectionNumber: "MATH-1100-01", faculty: { ...faculty, firstName: "Glen" } }),
          ],
        }),
      ]);

      const dialog = await openEditDialog();
      expect(sectionNumberValues(dialog)).toEqual(["COMP-2100-01", "MATH-1100-01"]);
      expect(sectionNumberFields(dialog)).toHaveLength(2);
    });

    it("Sections empty state", async () => {
      await mountCoursesAs(adminUser, [course({ sections: [] })]);
      await openEditDialog();

      expect(pageText()).toContain("No sections yet. Create your first section.");
    });
  });

  describe("US-5.3 — Manage section rows", () => {
    it("Section rows are editable and have a delete action for admins", async () => {
      await mountCoursesAs(adminUser, [
        course({ sections: [section(), section({ id: 11, sectionNumber: "MATH-1100-01" })] }),
      ]);
      const dialog = await openEditDialog();

      for (const field of sectionNumberFields(dialog)) {
        expect(field.props("disabled")).toBeFalsy();
      }
      expect(deleteSectionButtons()).toHaveLength(2);
    });

    it("Section rows do not show edit/delete actions for non-admins", async () => {
      await mountCoursesAs(studentUser, [course({ sections: [section()] })]);

      expect(cardMenus()).toHaveLength(0);
      expect(wrapper.findAllComponents(VListItem).some((item) => /^(Edit|Delete)$/.test(item.props("title")))).toBe(
        false,
      );
      expect(pageText()).not.toContain("+ New Section");
      expect(deleteSectionButtons()).toHaveLength(0);
    });
  });

  describe("US-5.4 — Edit and delete sections", () => {
    it("Admin edits a section", async () => {
      const existing = section({ sectionNumber: "CSMC-3012-01" });
      const updated = { ...existing, sectionNumber: "CSMC-3012-02" };
      await mountCoursesAs(adminUser, [course({ sections: [existing] })]);
      sectionServices.updateSection.mockResolvedValueOnce({ data: updated });
      courseServices.getCourses.mockResolvedValue({ data: [course({ sections: [updated] })] });

      const dialog = await openEditDialog();
      expect(sectionField(dialog, "Number").find("input").element.value).toBe("CSMC-3012-01");
      await fillSection(dialog, { Number: "CSMC-3012-02" });
      await blurSectionRow(dialog);

      await waitFor(() => expect(sectionServices.updateSection).toHaveBeenCalledTimes(1));
      expect(sectionServices.updateSection).toHaveBeenCalledWith(
        existing.id,
        expect.objectContaining({ sectionNumber: "CSMC-3012-02" }),
      );
      expect(courseServices.updateCourse).not.toHaveBeenCalled();
      await waitFor(() => expect(sectionNumberValues(dialog)).toContain("CSMC-3012-02"));
      expect(sectionNumberValues(dialog)).not.toContain("CSMC-3012-01");
    });

    it("Admin deletes a section", async () => {
      const existing = section({ sectionNumber: "CSMC-3012-01" });
      await mountCoursesAs(adminUser, [course({ sections: [existing] })]);
      courseServices.getCourses.mockResolvedValue({ data: [course({ sections: [] })] });

      const dialog = await openEditDialog();
      expect(deleteSectionButtons()).toHaveLength(1);
      await deleteSectionButtons().at(0).trigger("click");
      await settle();

      const confirm = [...document.body.querySelectorAll("button")].find((el) =>
        /^delete section$/i.test(el.textContent.trim()),
      );
      expect(confirm).toBeDefined();
      confirm.click();
      await settle();

      await waitFor(() => expect(sectionServices.removeSection).toHaveBeenCalledWith(existing.id));
      await waitFor(() => expect(sectionNumberValues(dialog)).not.toContain("CSMC-3012-01"));
    });
  });
});
