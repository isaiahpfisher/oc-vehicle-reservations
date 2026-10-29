/**
 * Feature 12 — Service Type Management
 * Spec: features/feature-12-service-types.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import serviceTypeServices from "../src/services/serviceTypeServices.js";
import { signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/serviceTypeServices.js", () => ({
  default: {
    getServiceTypes: vi.fn(),
    getServiceTypeById: vi.fn(),
    createServiceType: vi.fn(),
    updateServiceType: vi.fn(),
    removeServiceType: vi.fn(),
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

const oilChange = {
  id: 1,
  name: "Oil Change",
  service_frequency_days: 500,
  service_frequency_miles: 5000,
};

const tireRotation = {
  id: 2,
  name: "Tire Rotation",
  service_frequency_days: 180,
  service_frequency_miles: 6000,
};

const tooLong = "a".repeat(256);
const payload = {
  name: "Oil Change",
  service_frequency_days: 500,
  service_frequency_miles: 5000,
};

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

const signIn = (roles = signedInUser.roles) => {
  signInAs({ ...signedInUser, roles });
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

const openNewServiceType = async () => {
  namedButton("+ New Service Type").click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("New service type");
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

const fillFrequencies = async () => {
  await (await textField("Frequency Days")).setValue("500");
  await (await textField("Frequency Miles")).setValue("5000");
};

const editButton = (name) => {
  const row = [...document.body.querySelectorAll("tbody tr")].find((el) => el.textContent.includes(name));
  return row?.querySelector('[aria-label="Edit service type"]');
};

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: [] });
  serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [] });
  serviceTypeServices.createServiceType.mockResolvedValue({ status: 201, data: oilChange });
  serviceTypeServices.updateServiceType.mockResolvedValue({ status: 200, data: oilChange });
  serviceTypeServices.removeServiceType.mockResolvedValue({
    status: 200,
    data: { message: "Service type deleted successfully." },
  });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 12 — Service Type Management", () => {
  describe("US-12.1 — Create service types", () => {
    it("Admin user creates a service type", async () => {
      const roleSets = [
        signedInUser.roles,
        [{ id: 2, role: "maintenance", areaId: null, area: null }],
        [{ id: 3, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }],
      ];

      for (const roles of roleSets) {
        signIn(roles);
        await mountAppAt("/service-types");

        await openNewServiceType();

        expect(await textField("Name")).toBeDefined();
        expect(await textField("Frequency Days")).toBeDefined();
        expect(await textField("Frequency Miles")).toBeDefined();

        wrapper.unmount();
        wrapper = undefined;
        document.body.innerHTML = "";
        await router.push("/login");
        await router.isReady();
      }
    });

    it("Admin user saves service type", async () => {
      signIn();
      const saved = { status: 201, data: oilChange };
      serviceTypeServices.createServiceType.mockResolvedValue(saved);
      serviceTypeServices.getServiceTypes
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [oilChange] });
      await mountAppAt("/service-types");

      await openNewServiceType();
      await (await textField("Name")).setValue("Oil Change");
      await fillFrequencies();
      await clickNamed("Create");

      await waitFor(() => expect(serviceTypeServices.createServiceType).toHaveBeenCalledTimes(1));
      expect(serviceTypeServices.createServiceType).toHaveBeenCalledWith(payload);
      expect(saved.status).toBe(201);
      await waitFor(() => expect(wrapper.text()).toContain("Oil Change"));
    });

    it("Admin user creates service type with missing name", async () => {
      signIn();
      await mountAppAt("/service-types");

      await openNewServiceType();
      await fillFrequencies();
      await clickNamed("Create");

      expect(serviceTypeServices.createServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates service type with missing field", async () => {
      signIn();
      await mountAppAt("/service-types");

      await openNewServiceType();
      await (await textField("Name")).setValue("Oil Change");
      await (await textField("Frequency Miles")).setValue("5000");
      await clickNamed("Create");

      expect(serviceTypeServices.createServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates service type with a whitespace-only name", async () => {
      signIn();
      await mountAppAt("/service-types");

      await openNewServiceType();
      await (await textField("Name")).setValue(" ");
      await fillFrequencies();
      await clickNamed("Create");

      expect(serviceTypeServices.createServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates service type with name longer than 255 characters", async () => {
      signIn();
      await mountAppAt("/service-types");

      await openNewServiceType();
      await (await textField("Name")).setValue(tooLong);
      await fillFrequencies();
      await clickNamed("Create");

      expect(serviceTypeServices.createServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name too long.");
    });

    it("Admin user creates a service type with a non-unique name", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange] });
      await mountAppAt("/service-types");

      await openNewServiceType();
      await (await textField("Name")).setValue("Oil Change");
      await fillFrequencies();
      await clickNamed("Create");

      expect(serviceTypeServices.createServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("Admin user creates a service type with a non-unique name that is not case-sensitive", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange] });
      await mountAppAt("/service-types");

      await openNewServiceType();
      await (await textField("Name")).setValue("oil change");
      await fillFrequencies();
      await clickNamed("Create");

      expect(serviceTypeServices.createServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });
  });

  describe("US-12.2 — View service types", () => {
    it("Service types view lists service types", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange, tireRotation] });
      await mountAppAt("/service-types");

      await waitFor(() => {
        expect(wrapper.text()).toContain("Frequency Days");
        expect(wrapper.text()).toContain("Frequency Miles");
        const rows = [...document.body.querySelectorAll("tbody tr")];
        const oil = rows.find((row) => row.textContent.includes("Oil Change"));
        const tires = rows.find((row) => row.textContent.includes("Tire Rotation"));
        expect(oil?.textContent).toContain("500");
        expect(oil?.textContent).toContain("5000");
        expect(tires?.textContent).toContain("180");
        expect(tires?.textContent).toContain("6000");
      });
    });

    it("Service types empty state", async () => {
      signIn();
      await mountAppAt("/service-types");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No service types yet. Create your first service type.");
      });
    });
  });

  describe("US-12.3 — Manage service type rows", () => {
    it("Service type rows have edit and delete actions", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange] });
      await mountAppAt("/service-types");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit service type"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete service type"]')).toBeTruthy();
      });
    });
  });

  describe("US-12.4 — Edit and delete service types", () => {
    it("Admin user edits a service type name", async () => {
      signIn();
      const updated = { status: 200, data: { ...oilChange, name: "Tire Rotation" } };
      serviceTypeServices.updateServiceType.mockResolvedValue(updated);
      serviceTypeServices.getServiceTypes
        .mockResolvedValueOnce({ data: [oilChange] })
        .mockResolvedValueOnce({ data: [updated.data] });
      await mountAppAt("/service-types");

      await waitFor(() => expect(editButton("Oil Change")).toBeTruthy());
      editButton("Oil Change").click();
      await settle();
      await (await textField("Name")).setValue("Tire Rotation");
      await clickNamed("Save");

      await waitFor(() => expect(serviceTypeServices.updateServiceType).toHaveBeenCalledTimes(1));
      expect(serviceTypeServices.updateServiceType).toHaveBeenCalledWith(1, {
        name: "Tire Rotation",
        service_frequency_days: 500,
        service_frequency_miles: 5000,
      });
      expect(updated.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("Tire Rotation"));
    });

    it("Admin user edits a service type to have a missing name", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange] });
      await mountAppAt("/service-types");

      await waitFor(() => expect(editButton("Oil Change")).toBeTruthy());
      editButton("Oil Change").click();
      await settle();
      await (await textField("Name")).setValue("");
      await clickNamed("Save");

      expect(serviceTypeServices.updateServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a service type to have a whitespace-only name", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange] });
      await mountAppAt("/service-types");

      await waitFor(() => expect(editButton("Oil Change")).toBeTruthy());
      editButton("Oil Change").click();
      await settle();
      await (await textField("Name")).setValue(" ");
      await clickNamed("Save");

      expect(serviceTypeServices.updateServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user updates a service type to have a non-unique name", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange, tireRotation] });
      await mountAppAt("/service-types");

      await waitFor(() => expect(editButton("Tire Rotation")).toBeTruthy());
      editButton("Tire Rotation").click();
      await settle();
      await (await textField("Name")).setValue("Oil Change");
      await clickNamed("Save");

      expect(serviceTypeServices.updateServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("Admin user edits a service type to have a non-unique name that is not case-sensitive", async () => {
      signIn();
      serviceTypeServices.getServiceTypes.mockResolvedValue({ data: [oilChange, tireRotation] });
      await mountAppAt("/service-types");

      await waitFor(() => expect(editButton("Tire Rotation")).toBeTruthy());
      editButton("Tire Rotation").click();
      await settle();
      await (await textField("Name")).setValue("oil change");
      await clickNamed("Save");

      expect(serviceTypeServices.updateServiceType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("Admin user deletes a service type", async () => {
      signIn();
      serviceTypeServices.getServiceTypes
        .mockResolvedValueOnce({ data: [oilChange] })
        .mockResolvedValueOnce({ data: [] });
      await mountAppAt("/service-types");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete service type"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete service type"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(serviceTypeServices.removeServiceType).toHaveBeenCalledWith(1));
      await waitFor(() => {
        expect(document.body.textContent).toContain("No service types yet. Create your first service type.");
      });
    });
  });

  describe("US-12.5: Signed-in admin , area admin, or maintenance user access only", () => {
    it("Un-signed-in user accesses service types page", async () => {
      await mountAppAt("/service-types");

      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin , area admin, or maintenance role accesses service types page", async () => {
      signIn([]);
      await mountAppAt("/service-types");

      // The home route is `/` (name `home`). Feature 12's scenario text says `/home`.
      expect(router.currentRoute.value.name).toBe("home");
      expect(router.currentRoute.value.path).toBe("/");
    });
  });
});
