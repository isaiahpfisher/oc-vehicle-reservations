/**
 * Feature 6 — Destinations
 * Spec: features/feature-6-destinations.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import destinationServices from "../src/services/destinationServices.js";
import { signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/destinationServices.js", () => ({
  default: {
    getDestinations: vi.fn(),
    getDestinationById: vi.fn(),
    createDestination: vi.fn(),
    updateDestination: vi.fn(),
    removeDestination: vi.fn(),
  },
}));

const signedInUser = {
  userId: 2,
  email: "jane@oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  roles: [{ id: 1, role: "admin", areaId: null, area: null }],
  token: "admin-token",
};

const areaAdminRoles = [{ id: 2, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }];
const maintenanceRoles = [{ id: 3, role: "maintenance", areaId: null, area: null }];

const pops = {
  id: 1,
  name: "Pops",
  address_line_1: "660 OK-66",
  address_line_2: null,
  city: "Arcadia",
  state: "OK",
  zip_code: "73007",
  is_saved: true,
  miles_from_campus: 22,
};

const lake = {
  id: 2,
  name: "Arcadia Lake",
  address_line_1: "100 Lake Dr",
  address_line_2: null,
  city: "Arcadia",
  state: "OK",
  zip_code: null,
  is_saved: false,
  miles_from_campus: null,
};

const tooLong = "a".repeat(256);
const requiredFields = {
  Name: "Pops",
  "Address line 1": "660 OK-66",
  City: "Arcadia",
  State: "OK",
};

let roles = signedInUser.roles;
let wrapper;

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

const mountAppAt = async (path) => {
  await router.push(path);
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

const signIn = (nextRoles = signedInUser.roles) => {
  roles = nextRoles;
  signInAs({ ...signedInUser, roles });
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((el) => el.textContent.trim() === text);

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const textField = (label) => field("VTextField", label);

const fill = async (values) => {
  for (const [label, value] of Object.entries(values)) {
    await (await textField(label)).setValue(value);
  }
};

const openNewDestination = async () => {
  namedButton("+ New Destination").click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("New destination");
  });
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

const rows = () => [...document.body.querySelectorAll(".v-data-table tbody tr")];
const rowFor = (name) => rows().find((row) => row.textContent.includes(name));
const editButton = (name) => rowFor(name)?.querySelector('[aria-label="Edit destination"]');

const openEdit = async (name) => {
  await waitFor(() => expect(editButton(name)).toBeTruthy());
  editButton(name).click();
  await settle();
  await waitFor(() => expect(namedButton("Save")).toBeTruthy());
};

const expectBlocked = (service, message) => {
  expect(service).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain(message);
};

beforeEach(async () => {
  roles = signedInUser.roles;
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockImplementation(async (url) => {
    if (String(url).startsWith("users/")) {
      return { data: { roles } };
    }
    return { data: [] };
  });
  destinationServices.getDestinations.mockResolvedValue({ data: [] });
  destinationServices.createDestination.mockResolvedValue({ status: 201, data: pops });
  destinationServices.updateDestination.mockResolvedValue({ status: 200, data: pops });
  destinationServices.removeDestination.mockResolvedValue({
    status: 200,
    data: { message: "Destination deleted successfully." },
  });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 6 — Destinations", () => {
  describe("US-6.1 — Create destinations", () => {
    it("Admin user creates a destination", async () => {
      signIn();
      await mountAppAt("/destinations");

      await openNewDestination();

      expect(await textField("Name")).toBeDefined();
      expect(await textField("Address line 1")).toBeDefined();
      expect(await textField("Address line 2")).toBeDefined();
      expect(await textField("City")).toBeDefined();
      expect(await textField("State")).toBeDefined();
      expect(await textField("ZIP code")).toBeDefined();
      expect(await textField("Miles from campus")).toBeDefined();
      expect((await field("VSwitch", "Official")).props("modelValue")).toBe(true);
    });

    it("Area admin user creates a destination", async () => {
      signIn(areaAdminRoles);
      await mountAppAt("/destinations");

      await openNewDestination();

      expect((await field("VSwitch", "Official")).props("modelValue")).toBe(true);
      expect(await textField("Name")).toBeDefined();
    });

    it("Admin user saves an official destination", async () => {
      signIn();
      const saved = { status: 201, data: pops };
      destinationServices.createDestination.mockResolvedValue(saved);
      destinationServices.getDestinations.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [pops] });
      await mountAppAt("/destinations");

      await openNewDestination();
      await fill({ ...requiredFields, "ZIP code": "73007", "Miles from campus": "22" });
      await clickNamed("Create");

      await waitFor(() => expect(destinationServices.createDestination).toHaveBeenCalledTimes(1));
      expect(destinationServices.createDestination).toHaveBeenCalledWith({
        name: "Pops",
        address_line_1: "660 OK-66",
        address_line_2: null,
        city: "Arcadia",
        state: "OK",
        zip_code: "73007",
        is_saved: true,
        miles_from_campus: 22,
      });
      expect(saved.status).toBe(201);
      expect(saved.data).not.toHaveProperty("area_id");
      expect(saved.data.is_saved).toBe(true);
      await waitFor(() => {
        expect(rowFor("Pops")?.textContent).toContain("Arcadia");
        expect(rowFor("Pops")?.textContent).toContain("OK");
        expect(rowFor("Pops")?.textContent).toContain("Official");
      });
    });

    it("Area admin user saves an official destination", async () => {
      signIn(areaAdminRoles);
      const saved = {
        status: 201,
        data: { ...pops, zip_code: null, miles_from_campus: null },
      };
      destinationServices.createDestination.mockResolvedValue(saved);
      destinationServices.getDestinations.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [saved.data] });
      await mountAppAt("/destinations");

      await openNewDestination();
      await fill(requiredFields);
      await clickNamed("Create");

      await waitFor(() => expect(destinationServices.createDestination).toHaveBeenCalledTimes(1));
      expect(destinationServices.createDestination.mock.calls[0][0].is_saved).toBe(true);
      expect(saved.status).toBe(201);
      await waitFor(() => expect(rowFor("Pops")?.textContent).toContain("Official"));
    });

    it("Admin user saves a destination with empty optional fields", async () => {
      signIn();
      const saved = {
        status: 201,
        data: { ...pops, address_line_2: null, zip_code: null, miles_from_campus: null },
      };
      destinationServices.createDestination.mockResolvedValue(saved);
      await mountAppAt("/destinations");

      await openNewDestination();
      await fill(requiredFields);
      await clickNamed("Create");

      await waitFor(() => expect(destinationServices.createDestination).toHaveBeenCalledTimes(1));
      expect(destinationServices.createDestination).toHaveBeenCalledWith({
        name: "Pops",
        address_line_1: "660 OK-66",
        address_line_2: null,
        city: "Arcadia",
        state: "OK",
        zip_code: null,
        is_saved: true,
        miles_from_campus: null,
      });
      expect(saved.status).toBe(201);
      expect(saved.data).toMatchObject({ address_line_2: null, zip_code: null, miles_from_campus: null });
    });

    const createValidation = [
      ["Admin user creates a destination with a missing name", { "Address line 1": "660 OK-66", City: "Arcadia", State: "OK" }, "Required field."],
      ["Admin user creates a destination with a missing address line 1", { Name: "Pops", City: "Arcadia", State: "OK" }, "Required field."],
      ["Admin user creates a destination with a missing city", { Name: "Pops", "Address line 1": "660 OK-66", State: "OK" }, "Required field."],
      ["Admin user creates a destination with a missing state", { Name: "Pops", "Address line 1": "660 OK-66", City: "Arcadia" }, "Required field."],
      ["Admin user creates a destination with a whitespace-only name", { ...requiredFields, Name: " " }, "Required field."],
      ["Admin user creates a destination with a whitespace-only address line 1", { ...requiredFields, "Address line 1": " " }, "Required field."],
      ["Admin user creates a destination with a whitespace-only city", { ...requiredFields, City: " " }, "Required field."],
      ["Admin user creates a destination with a whitespace-only state", { ...requiredFields, State: " " }, "Required field."],
      ["Admin user creates a destination with a name longer than 255 characters", { ...requiredFields, Name: tooLong }, "Name too long."],
      [
        "Admin user creates a destination with an address line 1 longer than 255 characters",
        { ...requiredFields, "Address line 1": tooLong },
        "Address line 1 too long.",
      ],
      [
        "Admin user creates a destination with an address line 2 longer than 255 characters",
        { ...requiredFields, "Address line 2": tooLong },
        "Address line 2 too long.",
      ],
      ["Admin user creates a destination with a city longer than 255 characters", { ...requiredFields, City: tooLong }, "City too long."],
      ["Admin user creates a destination with a state longer than 255 characters", { ...requiredFields, State: tooLong }, "State too long."],
      ["Admin user creates a destination with a ZIP code longer than 255 characters", { ...requiredFields, "ZIP code": tooLong }, "ZIP code too long."],
      [
        "Admin user creates a destination with miles from campus less than 0",
        { ...requiredFields, "Miles from campus": "-1" },
        "Miles from campus must be a whole number of 0 or more.",
      ],
      [
        "Admin user creates a destination with a non-integer miles from campus",
        { ...requiredFields, "Miles from campus": "12.5" },
        "Miles from campus must be a whole number of 0 or more.",
      ],
    ];

    for (const [title, values, message] of createValidation) {
      it(title, async () => {
        signIn();
        await mountAppAt("/destinations");
        await openNewDestination();
        await fill(values);
        await clickNamed("Create");
        expectBlocked(destinationServices.createDestination, message);
      });
    }
  });

  describe("US-6.2 — View destinations", () => {
    it("Destinations view lists destinations for admin", async () => {
      signIn();
      destinationServices.getDestinations.mockResolvedValue({ data: [pops] });
      await mountAppAt("/destinations");

      await waitFor(() => {
        expect(rowFor("Pops")?.textContent).toContain("Arcadia");
        expect(rowFor("Pops")?.textContent).toContain("OK");
        expect(rowFor("Pops")?.textContent).toContain("Official");
      });
    });

    it("Destinations view lists unofficial destinations", async () => {
      signIn();
      destinationServices.getDestinations.mockResolvedValue({ data: [lake] });
      await mountAppAt("/destinations");

      await waitFor(() => {
        expect(rowFor("Arcadia Lake")).toBeTruthy();
        expect(rowFor("Arcadia Lake")?.textContent).toContain("Unofficial");
      });
    });

    it("Destinations view lists every destination for area admin", async () => {
      signIn(areaAdminRoles);
      destinationServices.getDestinations.mockResolvedValue({ data: [pops, lake] });
      await mountAppAt("/destinations");

      await waitFor(() => {
        expect(rowFor("Pops")).toBeTruthy();
        expect(rowFor("Arcadia Lake")).toBeTruthy();
      });
    });

    it("Destinations empty state", async () => {
      signIn();
      await mountAppAt("/destinations");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No destinations yet. Create your first destination.");
      });
    });
  });

  describe("US-6.3 — Manage destination rows", () => {
    it("Destination rows have edit and delete actions", async () => {
      signIn();
      destinationServices.getDestinations.mockResolvedValue({ data: [pops] });
      await mountAppAt("/destinations");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit destination"]')).toBeTruthy());
      expect(document.body.querySelector('[aria-label="Delete destination"]')).toBeTruthy();
    });
  });

  describe("US-6.4 — Edit and delete destinations", () => {
    it("Admin user opens the destination edit dialog", async () => {
      signIn();
      destinationServices.getDestinations.mockResolvedValue({ data: [pops] });
      await mountAppAt("/destinations");

      await openEdit("Pops");

      expect((await textField("Name")).props("modelValue")).toBe("Pops");
      expect((await textField("Address line 1")).props("modelValue")).toBe("660 OK-66");
      expect((await textField("Address line 2")).props("modelValue")).toBe("");
      expect((await textField("City")).props("modelValue")).toBe("Arcadia");
      expect((await textField("State")).props("modelValue")).toBe("OK");
      expect((await textField("ZIP code")).props("modelValue")).toBe("73007");
      expect(String((await textField("Miles from campus")).props("modelValue"))).toBe("22");
      expect((await field("VSwitch", "Official")).props("modelValue")).toBe(true);
    });

    it("Admin user edits a destination name", async () => {
      signIn();
      const updated = { status: 200, data: { ...pops, name: "Arcadia Lake" } };
      destinationServices.updateDestination.mockResolvedValue(updated);
      destinationServices.getDestinations
        .mockResolvedValueOnce({ data: [pops] })
        .mockResolvedValueOnce({ data: [updated.data] });
      await mountAppAt("/destinations");

      await openEdit("Pops");
      await (await textField("Name")).setValue("Arcadia Lake");
      await clickNamed("Save");

      await waitFor(() => expect(destinationServices.updateDestination).toHaveBeenCalledTimes(1));
      expect(destinationServices.updateDestination).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Arcadia Lake" }));
      expect(updated.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("Arcadia Lake"));
    });

    it("Admin user makes an unofficial destination official", async () => {
      signIn();
      const unofficial = { ...pops, is_saved: false };
      const updated = { status: 200, data: { ...unofficial, is_saved: true } };
      destinationServices.updateDestination.mockResolvedValue(updated);
      destinationServices.getDestinations
        .mockResolvedValueOnce({ data: [unofficial] })
        .mockResolvedValueOnce({ data: [updated.data] });
      await mountAppAt("/destinations");

      await openEdit("Pops");
      await (await field("VSwitch", "Official")).setValue(true);
      await clickNamed("Save");

      await waitFor(() => expect(destinationServices.updateDestination).toHaveBeenCalledTimes(1));
      expect(destinationServices.updateDestination.mock.calls[0][1].is_saved).toBe(true);
      expect(updated.status).toBe(200);
      await waitFor(() => expect(rowFor("Pops")?.textContent).toContain("Official"));
    });

    it("Area admin user makes an unofficial destination official", async () => {
      signIn(areaAdminRoles);
      const unofficial = { ...pops, is_saved: false };
      const updated = { status: 200, data: { ...unofficial, is_saved: true } };
      destinationServices.updateDestination.mockResolvedValue(updated);
      destinationServices.getDestinations
        .mockResolvedValueOnce({ data: [unofficial] })
        .mockResolvedValueOnce({ data: [updated.data] });
      await mountAppAt("/destinations");

      await openEdit("Pops");
      await (await field("VSwitch", "Official")).setValue(true);
      await clickNamed("Save");

      await waitFor(() => expect(destinationServices.updateDestination).toHaveBeenCalledTimes(1));
      expect(updated.status).toBe(200);
      expect(updated.data.is_saved).toBe(true);
      await waitFor(() => expect(rowFor("Pops")?.textContent).toContain("Official"));
    });

    it("Admin user turns Official off", async () => {
      signIn();
      const updated = { status: 200, data: { ...pops, is_saved: false } };
      destinationServices.updateDestination.mockResolvedValue(updated);
      destinationServices.getDestinations
        .mockResolvedValueOnce({ data: [pops] })
        .mockResolvedValueOnce({ data: [updated.data] });
      await mountAppAt("/destinations");

      await openEdit("Pops");
      await (await field("VSwitch", "Official")).setValue(false);
      await clickNamed("Save");

      await waitFor(() => expect(destinationServices.updateDestination).toHaveBeenCalledTimes(1));
      expect(destinationServices.updateDestination.mock.calls[0][1].is_saved).toBe(false);
      expect(updated.status).toBe(200);
      await waitFor(() => {
        expect(rowFor("Pops")).toBeTruthy();
        expect(rowFor("Pops")?.textContent).toContain("Unofficial");
      });
    });

    const editValidation = [
      ["Admin user edits a destination to have a missing name", "Name", ""],
      ["Admin user edits a destination to have a missing address line 1", "Address line 1", ""],
      ["Admin user edits a destination to have a missing city", "City", ""],
      ["Admin user edits a destination to have a missing state", "State", ""],
    ];

    for (const [title, label, value] of editValidation) {
      it(title, async () => {
        signIn();
        destinationServices.getDestinations.mockResolvedValue({ data: [pops] });
        await mountAppAt("/destinations");
        await openEdit("Pops");
        await (await textField(label)).setValue(value);
        await clickNamed("Save");
        expectBlocked(destinationServices.updateDestination, "Required field.");
      });
    }

    it("Admin user deletes a destination", async () => {
      signIn();
      const removed = { status: 200, data: { message: "Destination deleted successfully." } };
      destinationServices.removeDestination.mockResolvedValue(removed);
      destinationServices.getDestinations.mockResolvedValueOnce({ data: [pops] }).mockResolvedValueOnce({ data: [] });
      await mountAppAt("/destinations");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete destination"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete destination"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(destinationServices.removeDestination).toHaveBeenCalledWith(1));
      expect(removed.status).toBe(200);
      await waitFor(() => {
        expect(document.body.textContent).toContain("No destinations yet. Create your first destination.");
      });
    });

    it("Area admin user deletes a destination", async () => {
      signIn(areaAdminRoles);
      const removed = { status: 200, data: { message: "Destination deleted successfully." } };
      destinationServices.removeDestination.mockResolvedValue(removed);
      destinationServices.getDestinations.mockResolvedValueOnce({ data: [pops] }).mockResolvedValueOnce({ data: [] });
      await mountAppAt("/destinations");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete destination"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete destination"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(destinationServices.removeDestination).toHaveBeenCalledWith(1));
      expect(removed.status).toBe(200);
      await waitFor(() => {
        expect(document.body.textContent).not.toContain("660 OK-66");
        expect(rowFor("Pops")).toBeFalsy();
      });
    });
  });

  describe("US-6.5 — Signed-in admin or area admin access only", () => {
    it("Un-signed-in user accesses destinations page", async () => {
      await mountAppAt("/destinations");

      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin or area admin role accesses destinations page", async () => {
      signIn(maintenanceRoles);
      await mountAppAt("/destinations");

      expect(router.currentRoute.value.path).toBe("/");
    });
  });
});
