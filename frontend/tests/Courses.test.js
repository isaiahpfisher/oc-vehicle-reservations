/**
 * Feature 3 — Course Management
 * Spec: features/feature-3-course-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VBtn, VDialog, VListItem, VSelect, VTextarea, VTextField } from "vuetify/components";
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
const studentUser = { ...adminUser, userId: 2, email: "sam@example.com", firstName: "Sam", role: "student" };

let nextId = 1;
const course = (overrides = {}) => ({
  id: nextId++,
  name: "Programming II",
  number: "COMP-2100",
  description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
  semesters: ["Fall"],
  frequency: "Yearly",
  hours: 3,
  department: "Computer Science",
  ...overrides,
});

const section = (overrides = {}) => ({
  id: 11,
  sectionNumber: "COMP-2100-01",
  semesterId: 1,
  daysOfWeek: "M,W,F",
  startTime: "14:30:00",
  endTime: "15:30:00",
  faculty: { firstName: "David", lastName: "North" },
  semester: { id: 1, name: "Fall 2026" },
  ...overrides,
});

const apiError = (status, message) => Object.assign(new Error(message), { response: { status, data: { message } } });

let enrollmentState;

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await flushPromises();
  }
};

/** Retry an assertion until it passes (async validation and dialogs settle on timers). */
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

const mountCoursesAs = async (user, courses = [], enrollments = []) => {
  localStorage.setItem("user", JSON.stringify(user));
  enrollmentState = {
    courses,
    enrollments: enrollments.map((row) => ({ ...row })),
    onEnroll(sectionId) {
      this.enrollments = [
        ...this.enrollments,
        { id: this.enrollments.length + 1, studentId: user.userId, sectionId },
      ];
    },
  };
  apiClient.get.mockImplementation((url) => {
    if (url === "enrollments") return Promise.resolve({ data: enrollmentState.enrollments });
    if (url === "courses") return Promise.resolve({ data: enrollmentState.courses });
    return Promise.resolve({ data: [] });
  });
  apiClient.post.mockImplementation((url, body) => {
    if (url === "enrollments") {
      enrollmentState.onEnroll(body.sectionId);
      return Promise.resolve({
        data: { id: 1, studentId: user.userId, sectionId: body.sectionId },
      });
    }
    return Promise.resolve({ data: {} });
  });
  apiClient.delete.mockImplementation((url) => {
    const [resource, id] = String(url).split("/");
    if (resource === "enrollments") {
      enrollmentState.enrollments = enrollmentState.enrollments.filter((row) => row.sectionId !== Number(id));
    }
    return Promise.resolve({ data: {} });
  });
  await router.push("/");
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

/** Dialogs teleport to <body>, so page text is read from the whole document. */
const pageText = () => document.body.textContent;

const openDialog = () => {
  const dialog = wrapper.findAllComponents(VDialog).find((d) => d.props("modelValue"));
  expect(dialog).toBeDefined();
  return dialog;
};

const fieldIn = (dialog, label) => {
  // VSelect renders its own inner VTextField with the same label, so selects must match first.
  const fields = [VSelect, VTextarea, VTextField].flatMap((type) => dialog.findAllComponents(type));
  const found = fields.find((f) => f.props("label") === label);
  expect(found, `field "${label}"`).toBeDefined();
  return found;
};

const setFields = async (dialog, values) => {
  for (const [label, value] of Object.entries(values)) {
    const field = fieldIn(dialog, label);
    if (field.vm.$.type === VSelect) {
      field.vm.$emit("update:modelValue", value);
    } else {
      await field.find(label === "Description" ? "textarea" : "input").setValue(value);
    }
    // CourseForm rebuilds the model from props on every update, so let each change land first.
    await settle();
  }
};

const buttonIn = (scope, text) => {
  const found = scope.findAllComponents(VBtn).find((b) => b.text().trim() === text);
  expect(found, `button "${text}"`).toBeDefined();
  return found;
};

const openAddDialog = async () => {
  await buttonIn(wrapper, "+ New Course").trigger("click");
  await settle();
  return openDialog();
};

const completeCourseForm = {
  Name: "Programming II",
  Number: "COMP-2100",
  "Credit Hours": "3",
  Department: "Computer Science",
  "Semesters Offered": ["Fall"],
  Frequency: "Yearly",
  Description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
};

/** Each course card has an overflow button that opens a menu with Edit / Delete. */
const cardMenus = () => wrapper.findAll('[aria-label="Course actions"]');

/** Menu content teleports to <body>, so items are found by component rather than DOM scope. */
const openCardMenu = async (index = 0) => {
  const menu = cardMenus()[index];
  expect(menu, `"Course actions" button #${index}`).toBeDefined();
  await menu.trigger("click");
  await settle();
};

const menuItem = (title) => {
  const found = wrapper.findAllComponents(VListItem).find((item) => item.props("title") === title);
  expect(found, `menu item "${title}"`).toBeDefined();
  return found;
};

const chooseCardAction = async (index, title) => {
  await openCardMenu(index);
  await waitFor(() => menuItem(title));
  await menuItem(title).trigger("click");
  await settle();
};

const openSections = async () => {
  const title = wrapper.findAll(".v-expansion-panel-title").find((panel) => panel.text().includes("Sections"));
  expect(title, "Sections panel").toBeDefined();
  await title.trigger("click");
  await settle();
};

const sectionButton = (sectionNumber) => {
  const title = wrapper.findAll(".v-card-title").find((node) => node.text().includes(sectionNumber));
  expect(title, sectionNumber).toBeDefined();
  const card = title.element.closest(".v-card");
  const button = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => card.contains(candidate.element) && /^(Enroll|Unenroll)$/.test(candidate.text().trim()));
  expect(button, `enrollment button for ${sectionNumber}`).toBeDefined();
  return button;
};

const deleteSectionButtons = () =>
  wrapper.findAllComponents(VListItem).filter((item) => item.attributes("aria-label") === "Delete section");

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  nextId = 1;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 3 — Course Management UI", () => {
  describe("US-3.1 — Create courses", () => {
    it("Admin user creates a new course", async () => {
      const calculus = course({ name: "Calculus I", number: "MATH-1100" });
      await mountCoursesAs(adminUser, [calculus]);
      const created = course();
      apiClient.post.mockResolvedValueOnce({ data: created });
      apiClient.get.mockResolvedValue({ data: [created, calculus] });

      const dialog = await openAddDialog();
      await setFields(dialog, completeCourseForm);
      await buttonIn(dialog, "Create").trigger("click");

      await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
      expect(apiClient.post).toHaveBeenCalledWith(
        "courses",
        expect.objectContaining({
          name: "Programming II",
          number: "COMP-2100",
          semesters: ["Fall"],
          frequency: "Yearly",
          hours: 3,
          department: "Computer Science",
        }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("COMP-2100"));
      expect(wrapper.text().indexOf("COMP-2100")).toBeLessThan(wrapper.text().indexOf("MATH-1100"));
    });

    it("User creates a course with an empty required field", async () => {
      await mountCoursesAs(adminUser, []);

      const dialog = await openAddDialog();
      await setFields(dialog, { ...completeCourseForm, Name: "   " });
      await buttonIn(dialog, "Create").trigger("click");

      await waitFor(() => expect(pageText()).toMatch(/required/i));
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("User creates a course with invalid formatted fields", async () => {
      await mountCoursesAs(adminUser, []);
      apiClient.post.mockRejectedValueOnce(apiError(400, "Number must be in the form XXXX-#### (ex. COMP-1234)"));

      const dialog = await openAddDialog();
      await setFields(dialog, { ...completeCourseForm, Number: "CS210" });
      await buttonIn(dialog, "Create").trigger("click");

      // Either inline validation or the API's 400 message must surface the expected format.
      await waitFor(() => expect(pageText()).toContain("XXXX-####"));
      expect(wrapper.text()).not.toContain("CS210");
    });
  });

  describe("US-3.2 — View courses", () => {
    it("Courses view loads with existing courses", async () => {
      await mountCoursesAs(adminUser, [
        course({ name: "Programming II", number: "COMP-2100", semesters: ["Fall", "Spring"] }),
        course({ name: "Composition", number: "ENGL-1010", department: "English", frequency: "Odd Years", hours: 4 }),
      ]);

      expect(apiClient.get).toHaveBeenCalledWith("courses");
      expect(wrapper.find("h1, h2, h3").text()).toBe("Courses");

      const text = wrapper.text();
      for (const expected of ["Programming II", "COMP-2100", "Fall", "Spring", "Yearly", "3", "Computer Science"]) {
        expect(text).toContain(expected);
      }
      for (const expected of ["Composition", "ENGL-1010", "Odd Years", "4", "English"]) {
        expect(text).toContain(expected);
      }
      expect(text.indexOf("COMP-2100")).toBeLessThan(text.indexOf("ENGL-1010"));
      expect(text).not.toContain("No courses yet");
    });

    it("User has no courses available", async () => {
      await mountCoursesAs(adminUser, []);

      expect(wrapper.text()).toContain("No courses yet");
      expect(wrapper.text()).toContain("Create your first course to get started.");
    });

    it("Non-admin user views courses", async () => {
      await mountCoursesAs(studentUser, [course()]);

      expect(wrapper.text()).toContain("Programming II");
      expect(wrapper.text()).toContain("COMP-2100");
      expect(wrapper.findAllComponents(VBtn).some((b) => /new course/i.test(b.text()))).toBe(false);
      expect(cardMenus()).toHaveLength(0);
    });
  });

  describe("US-3.3 — Search/filter/paginate courses", () => {
    it("Admin searches for a specific course", async () => {
      await mountCoursesAs(adminUser, [
        course({ name: "Programming II", number: "COMP-2100" }),
        course({ name: "Composition", number: "ENGL-1010", department: "English" }),
        course({ name: "Calculus I", number: "MATH-1100" }),
      ]);

      const search = wrapper
        .findAllComponents(VTextField)
        .find((f) => /search/i.test(`${f.props("label") ?? ""} ${f.props("placeholder") ?? ""}`));
      expect(search).toBeDefined();
      await search.find("input").setValue("COMP-");
      await settle();

      const text = wrapper.text();
      expect(text).toContain("COMP-2100");
      expect(text).not.toContain("ENGL-1010");
      expect(text).not.toContain("MATH-1100");
    });

    it("Admin paginates through courses", async () => {
      const courses = Array.from({ length: 25 }, (_, i) =>
        course({ name: `Course ${i + 1}`, number: `COMP-${String(1001 + i)}` }),
      );
      await mountCoursesAs(adminUser, courses);

      expect(wrapper.text()).toContain("COMP-1001");
      expect(wrapper.text()).toContain("COMP-1020");
      expect(wrapper.text()).not.toContain("COMP-1021");

      await wrapper.find('[aria-label="Next page"]').trigger("click");
      await settle();

      expect(wrapper.text()).toContain("COMP-1021");
      expect(wrapper.text()).toContain("COMP-1025");
      expect(wrapper.text()).not.toContain("COMP-1001");
    });
  });

  describe("US-3.4 — Manage course cards", () => {
    it("Course cards show edit and delete actions for admins", async () => {
      await mountCoursesAs(adminUser, [course(), course({ name: "Calculus I", number: "MATH-1100" })]);

      expect(cardMenus()).toHaveLength(2);

      await openCardMenu(0);
      await waitFor(() => menuItem("Edit"));
      expect(menuItem("Delete")).toBeDefined();
    });

    it("Course cards do not show edit/delete actions for non-admins", async () => {
      await mountCoursesAs(studentUser, [course(), course({ name: "Calculus I", number: "MATH-1100" })]);

      expect(cardMenus()).toHaveLength(0);
      expect(wrapper.findAllComponents(VListItem).some((item) => /^(Edit|Delete)$/.test(item.props("title")))).toBe(
        false,
      );
    });
  });

  describe("US-3.5 — Edit and delete courses", () => {
    it("Admin edits a course", async () => {
      const programming = course({ name: "Programming I", number: "COMP-1100" });
      await mountCoursesAs(adminUser, [programming]);
      const updated = { ...programming, semesters: ["Winter"] };
      apiClient.put.mockResolvedValueOnce({ data: updated });
      apiClient.get.mockResolvedValue({ data: [updated] });

      await chooseCardAction(0, "Edit");
      const dialog = openDialog();
      expect(fieldIn(dialog, "Name").find("input").element.value).toBe("Programming I");
      expect(fieldIn(dialog, "Number").find("input").element.value).toBe("COMP-1100");

      await setFields(dialog, { "Semesters Offered": ["Winter"] });
      await buttonIn(dialog, "Save").trigger("click");

      await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1));
      expect(apiClient.put).toHaveBeenCalledWith(
        `courses/${programming.id}`,
        expect.objectContaining({ name: "Programming I", number: "COMP-1100", semesters: ["Winter"] }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("Winter"));
      expect(wrapper.text()).not.toContain("Fall");
    });

    it("Admin deletes a course", async () => {
      const programming = course();
      await mountCoursesAs(adminUser, [programming]);
      apiClient.delete.mockResolvedValueOnce({ data: { message: "course deleted successfully." } });
      apiClient.get.mockResolvedValue({ data: [] });

      await chooseCardAction(0, "Delete");
      const dialog = openDialog();
      const confirm = dialog.findAllComponents(VBtn).find((b) => /^delete/i.test(b.text().trim()));
      expect(confirm).toBeDefined();
      await confirm.trigger("click");

      await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`courses/${programming.id}`));
      await waitFor(() => expect(wrapper.text()).not.toContain("COMP-2100"));
      expect(wrapper.text()).toContain("No courses yet");
      expect(wrapper.text()).toContain("Create your first course to get started.");
    });
  });
});

describe("Feature 6 — Enrollment Management UI", () => {
  const programmingWith = (sections) => course({ sections });

  describe("US-6.1 — Create Enrollment", () => {
    it("Student enrolls in section", async () => {
      const offered = section();
      await mountCoursesAs(studentUser, [programmingWith([offered])]);
      await openSections();

      expect(sectionButton(offered.sectionNumber).text().trim()).toBe("Enroll");
      await sectionButton(offered.sectionNumber).trigger("click");

      await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("enrollments", { sectionId: offered.id }));
      await waitFor(() => expect(sectionButton(offered.sectionNumber).text().trim()).toBe("Unenroll"));
    });

    it("Student views correct enrollment buttons", async () => {
      const mine = section();
      const other = section({ id: 12, sectionNumber: "COMP-2100-02" });
      await mountCoursesAs(studentUser, [programmingWith([mine, other])], [
        { id: 1, studentId: studentUser.userId, sectionId: mine.id },
      ]);
      await openSections();

      expect(sectionButton(mine.sectionNumber).text().trim()).toBe("Unenroll");
      expect(sectionButton(other.sectionNumber).text().trim()).toBe("Enroll");
    });
  });

  describe("US-6.2 — Delete Enrollment", () => {
    it("Student unenrolls in a section", async () => {
      const offered = section();
      await mountCoursesAs(studentUser, [programmingWith([offered])], [
        { id: 1, studentId: studentUser.userId, sectionId: offered.id },
      ]);
      await openSections();

      expect(sectionButton(offered.sectionNumber).text().trim()).toBe("Unenroll");
      await sectionButton(offered.sectionNumber).trigger("click");

      await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`enrollments/${offered.id}`));
      await waitFor(() => expect(sectionButton(offered.sectionNumber).text().trim()).toBe("Enroll"));
    });
  });

  describe("US-6.3 — One Enrollment per course per semester", () => {
    it("Student enrolls in a second section of the same course and semester", async () => {
      const first = section();
      const second = section({ id: 12, sectionNumber: "COMP-2100-02" });
      await mountCoursesAs(studentUser, [programmingWith([first, second])], [
        { id: 1, studentId: studentUser.userId, sectionId: first.id },
      ]);
      enrollmentState.onEnroll = (sectionId) => {
        enrollmentState.enrollments = [{ id: 2, studentId: studentUser.userId, sectionId }];
      };
      await openSections();

      await sectionButton(second.sectionNumber).trigger("click");

      await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("enrollments", { sectionId: second.id }));
      await waitFor(() => {
        expect(sectionButton(second.sectionNumber).text().trim()).toBe("Unenroll");
        expect(sectionButton(first.sectionNumber).text().trim()).toBe("Enroll");
      });
    });

    it("Student enrolls in the same course in a different semester", async () => {
      const fall = section();
      const spring = section({
        id: 12,
        sectionNumber: "COMP-2100-02",
        semesterId: 2,
        semester: { id: 2, name: "Spring 2027" },
      });
      await mountCoursesAs(studentUser, [programmingWith([fall, spring])], [
        { id: 1, studentId: studentUser.userId, sectionId: fall.id },
      ]);
      await openSections();

      await sectionButton(spring.sectionNumber).trigger("click");

      await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("enrollments", { sectionId: spring.id }));
      await waitFor(() => {
        expect(sectionButton(spring.sectionNumber).text().trim()).toBe("Unenroll");
        expect(sectionButton(fall.sectionNumber).text().trim()).toBe("Unenroll");
      });
    });
  });

  describe("US-6.4 — Admin users", () => {
    it("Admin views sections view", async () => {
      const offered = section();
      await mountCoursesAs(adminUser, [programmingWith([offered])]);
      await openSections();

      expect(wrapper.text()).toContain(offered.sectionNumber);
      expect(wrapper.findAllComponents(VBtn).some((button) => /^(Enroll|Unenroll)$/.test(button.text().trim()))).toBe(
        false,
      );
    });
  });

  describe("US-6.5 — Section is removed", () => {
    it("Admin deletes a section", async () => {
      const removed = section();
      const kept = section({
        id: 12,
        sectionNumber: "COMP-2100-02",
        semesterId: 2,
        semester: { id: 2, name: "Spring 2027" },
      });
      await mountCoursesAs(studentUser, [programmingWith([removed, kept])], [
        { id: 1, studentId: studentUser.userId, sectionId: removed.id },
        { id: 2, studentId: studentUser.userId, sectionId: kept.id },
      ]);
      await openSections();
      expect(sectionButton(removed.sectionNumber).text().trim()).toBe("Unenroll");

      wrapper.unmount();
      document.body.innerHTML = "";
      await mountCoursesAs(adminUser, [programmingWith([removed, kept])]);
      await chooseCardAction(0, "Edit");
      await waitFor(() => expect(deleteSectionButtons().length).toBeGreaterThan(0));
      await deleteSectionButtons().at(0).trigger("click");
      await settle();
      const confirm = [...document.body.querySelectorAll("button")].find((el) =>
        /^delete section$/i.test(el.textContent.trim()),
      );
      expect(confirm).toBeDefined();
      confirm.click();
      await settle();
      await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`sections/${removed.id}`));

      wrapper.unmount();
      document.body.innerHTML = "";
      await mountCoursesAs(studentUser, [programmingWith([kept])], [
        { id: 2, studentId: studentUser.userId, sectionId: kept.id },
      ]);
      await openSections();

      expect(wrapper.text()).not.toContain(removed.sectionNumber);
      expect(sectionButton(kept.sectionNumber).text().trim()).toBe("Unenroll");
    });
  });
});

/**
 * Feature 8 — Section Student Listing
 * Spec: features/feature-8-section-student-listing.md
 */
describe("Feature 8 — Section Student Listing UI", () => {
  const enrollment = (index, user) => ({
    id: index,
    studentId: 100 + index,
    sectionId: 11,
    user: { id: 100 + index, role: "student", ...user },
  });

  const roster = (count) =>
    Array.from({ length: count }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return enrollment(i + 1, { firstName: `First${n}`, lastName: `Last${n}`, email: `student${n}@example.com` });
    });

  /** Answer `sections/:id` with the given result; every other GET keeps the mounted behavior. */
  const stubSectionRequest = (result) => {
    const fallback = apiClient.get.getMockImplementation();
    apiClient.get.mockImplementation((url) => (String(url).startsWith("sections/") ? result() : fallback(url)));
  };

  const mountAdminWithSection = async (offered) => {
    await mountCoursesAs(adminUser, [course({ sections: [offered] })]);
    await openSections();
  };

  const viewStudents = async () => {
    await buttonIn(wrapper, "View Students").trigger("click");
    await settle();
  };

  describe("US-8.1 — See Students in Sections", () => {
    it("Admin Student Sections list loads", async () => {
      const offered = section();
      await mountAdminWithSection(offered);

      // Loading state: hold the request open and expect a progress indicator.
      let resolveSection;
      stubSectionRequest(
        () =>
          new Promise((resolve) => {
            resolveSection = resolve;
          }),
      );
      await viewStudents();

      expect(apiClient.get).toHaveBeenCalledWith(`sections/${offered.id}`);
      expect(document.body.querySelector(".v-skeleton-loader, .v-progress-linear, .v-progress-circular")).not.toBeNull();

      resolveSection({ data: { ...offered, enrollments: roster(25) } });
      await settle();

      // Heading describes the section; rows show first name, last name, and email.
      await waitFor(() => expect(pageText()).toContain("student01@example.com"));
      const dialog = openDialog();
      expect(dialog.props("modelValue")).toBe(true);
      const dialogText = () => document.body.querySelector(".v-overlay__content").textContent;
      expect(dialogText()).toContain("COMP-2100-01: David North");
      for (const expected of ["First Name", "Last Name", "Email", "First01", "Last01", "student01@example.com"]) {
        expect(dialogText()).toContain(expected);
      }
      expect(dialogText()).not.toContain("No students have enrolled in this section yet.");
      expect(document.body.querySelector(".v-alert")).toBeNull();

      // Pagination: more than 20 students are split across pages.
      expect(dialogText()).toContain("student20@example.com");
      expect(dialogText()).not.toContain("student21@example.com");

      await document.body.querySelector('.v-overlay__content [aria-label="Next page"]').click();
      await settle();

      await waitFor(() => expect(dialogText()).toContain("student21@example.com"));
      expect(dialogText()).toContain("student25@example.com");
      expect(dialogText()).not.toContain("student01@example.com");
    });

    it("Admin Student Sections list empty", async () => {
      const offered = section();
      await mountAdminWithSection(offered);
      stubSectionRequest(() => Promise.resolve({ data: { ...offered, enrollments: [] } }));

      await viewStudents();

      expect(apiClient.get).toHaveBeenCalledWith(`sections/${offered.id}`);
      await waitFor(() => expect(pageText()).toContain("No students have enrolled in this section yet."));
      expect(pageText()).toContain("COMP-2100-01: David North");
      expect(document.body.querySelector(".v-alert")).toBeNull();

      // Error state: an API failure surfaces an error alert instead of the roster.
      wrapper.unmount();
      document.body.innerHTML = "";
      await mountAdminWithSection(offered);
      stubSectionRequest(() => Promise.reject(apiError(500, "Could not load section.")));

      await viewStudents();

      await waitFor(() => expect(document.body.querySelector(".v-alert")).not.toBeNull());
      expect(document.body.querySelector(".v-alert").textContent).toContain("Could not load section.");
    });
  });
});
