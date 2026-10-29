/**
 * Feature 4 — Vehicle Type Management
 * Spec: features/feature-4-vehicle-types.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import vehicleTypeServices from "../src/services/vehicleTypeServices.js";
import { signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/vehicleTypeServices.js", () => ({
  default: {
    getVehicleTypes: vi.fn(),
    getVehicleTypeById: vi.fn(),
    createVehicleType: vi.fn(),
    updateVehicleType: vi.fn(),
    removeVehicleType: vi.fn(),
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

const bus = { id: 1, name: "Bus", identifier: "VIN" };
const golfCart = { id: 2, name: "Golf Cart", identifier: "Serial" };
const tooLong = "a".repeat(256);

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

const navLabels = () =>
  [...document.body.querySelectorAll('[aria-label="Main navigation"] a')].map((link) => link.textContent.trim());

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const textField = (label) => field("VTextField", label);
const selectField = (label) => field("VSelect", label);

const openNewVehicleType = async () => {
  namedButton("+ New Vehicle Type").click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("New vehicle type");
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

const editButton = (name) => {
  const card = [...document.body.querySelectorAll(".v-card")].find((el) => el.textContent.includes(name));
  return card?.querySelector('[aria-label="Edit vehicle type"]');
};

const openEdit = async (name) => {
  await waitFor(() => expect(editButton(name)).toBeTruthy());
  editButton(name).click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("Edit vehicle type");
  });
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
  vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [] });
  vehicleTypeServices.createVehicleType.mockResolvedValue({ status: 201, data: bus });
  vehicleTypeServices.updateVehicleType.mockResolvedValue({ status: 200, data: bus });
  vehicleTypeServices.removeVehicleType.mockResolvedValue({
    status: 200,
    data: { message: "Vehicle type deleted successfully." },
  });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 4 — Vehicle Type Management", () => {
  describe("US-4.1 — Create vehicle types", () => {
    it("Admin user creates a vehicle type", async () => {
      signIn();
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();

      expect(await textField("Name")).toBeDefined();
      expect(await selectField("Identifier")).toBeDefined();
    });

    it("Admin user saves vehicle type", async () => {
      signIn();
      const saved = { status: 201, data: bus };
      vehicleTypeServices.createVehicleType.mockResolvedValue(saved);
      vehicleTypeServices.getVehicleTypes.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();
      await (await textField("Name")).setValue("Bus");
      await (await selectField("Identifier")).setValue("VIN");
      await clickNamed("Create");

      await waitFor(() => expect(vehicleTypeServices.createVehicleType).toHaveBeenCalledTimes(1));
      expect(vehicleTypeServices.createVehicleType).toHaveBeenCalledWith({ name: "Bus", identifier: "VIN" });
      expect(saved.status).toBe(201);
      await waitFor(() => expect(wrapper.text()).toContain("Bus"));
    });

    it("Admin user creates vehicle type with missing name", async () => {
      signIn();
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();
      await (await selectField("Identifier")).setValue("VIN");
      await clickNamed("Create");

      expect(vehicleTypeServices.createVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates vehicle type with missing identifier", async () => {
      signIn();
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();
      await (await textField("Name")).setValue("Bus");
      await clickNamed("Create");

      expect(vehicleTypeServices.createVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates vehicle type with a whitespace-only name", async () => {
      signIn();
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();
      await (await textField("Name")).setValue(" ");
      await (await selectField("Identifier")).setValue("VIN");
      await clickNamed("Create");

      expect(vehicleTypeServices.createVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates vehicle type with name longer than 255 characters", async () => {
      signIn();
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();
      await (await textField("Name")).setValue(tooLong);
      await (await selectField("Identifier")).setValue("VIN");
      await clickNamed("Create");

      expect(vehicleTypeServices.createVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name too long.");
    });

    it("Admin user creates a vehicle type with a non-unique name", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();
      await (await textField("Name")).setValue("Bus");
      await (await selectField("Identifier")).setValue("VIN");
      await clickNamed("Create");

      expect(vehicleTypeServices.createVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("Admin user creates a vehicle type with a non-unique name that is not case-sensitive", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openNewVehicleType();
      await (await textField("Name")).setValue("bus");
      await (await selectField("Identifier")).setValue("VIN");
      await clickNamed("Create");

      expect(vehicleTypeServices.createVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });
  });

  describe("US-4.2 — View vehicle types", () => {
    it("Vehicle types view lists vehicle types", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus, golfCart] });
      await mountAppAt("/vehicle-types");

      await waitFor(() => {
        expect(wrapper.text()).toContain("Bus");
        expect(wrapper.text()).toContain("Golf Cart");
      });
    });

    it("Vehicle types empty state", async () => {
      signIn();
      await mountAppAt("/vehicle-types");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No vehicle types yet. Create your first vehicle type.");
      });
    });
  });

  describe("US-4.3 — Manage vehicle type rows", () => {
    it("Vehicle type rows have edit and delete actions", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit vehicle type"]')).toBeTruthy());
      expect(document.body.querySelector('[aria-label="Delete vehicle type"]')).toBeTruthy();
    });
  });

  describe("US-4.4 — Edit and delete vehicle types", () => {
    it("Admin user edits a vehicle type name", async () => {
      signIn();
      const updated = { status: 200, data: { ...bus, name: "Golf Cart" } };
      vehicleTypeServices.updateVehicleType.mockResolvedValue(updated);
      vehicleTypeServices.getVehicleTypes
        .mockResolvedValueOnce({ data: [bus] })
        .mockResolvedValueOnce({ data: [updated.data] });
      await mountAppAt("/vehicle-types");

      await openEdit("Bus");
      await (await textField("Name")).setValue("Golf Cart");
      await clickNamed("Save");

      await waitFor(() => expect(vehicleTypeServices.updateVehicleType).toHaveBeenCalledTimes(1));
      expect(vehicleTypeServices.updateVehicleType).toHaveBeenCalledWith(1, { name: "Golf Cart", identifier: "VIN" });
      expect(updated.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("Golf Cart"));
    });

    it("Admin user edits a vehicle type identifier", async () => {
      signIn();
      const updated = { status: 200, data: { ...bus, identifier: "Serial" } };
      vehicleTypeServices.updateVehicleType.mockResolvedValue(updated);
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openEdit("Bus");
      await (await selectField("Identifier")).setValue("Serial");
      await clickNamed("Save");

      await waitFor(() => expect(vehicleTypeServices.updateVehicleType).toHaveBeenCalledTimes(1));
      expect(vehicleTypeServices.updateVehicleType).toHaveBeenCalledWith(1, { name: "Bus", identifier: "Serial" });
      expect(updated.status).toBe(200);
      expect(updated.data.identifier).toBe("Serial");
    });

    it("Admin user edits a vehicle type to have a missing name", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openEdit("Bus");
      await (await textField("Name")).setValue("");
      await clickNamed("Save");

      expect(vehicleTypeServices.updateVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a vehicle type to have a missing identifier", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openEdit("Bus");
      await (await selectField("Identifier")).setValue(null);
      await clickNamed("Save");

      expect(vehicleTypeServices.updateVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a vehicle type to have a whitespace-only name", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openEdit("Bus");
      await (await textField("Name")).setValue(" ");
      await clickNamed("Save");

      expect(vehicleTypeServices.updateVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user edits a vehicle type to have a name longer than 255 characters", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus] });
      await mountAppAt("/vehicle-types");

      await openEdit("Bus");
      await (await textField("Name")).setValue(tooLong);
      await clickNamed("Save");

      expect(vehicleTypeServices.updateVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name too long.");
    });

    it("Admin user updates a vehicle type to have a non-unique name", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus, golfCart] });
      await mountAppAt("/vehicle-types");

      await openEdit("Golf Cart");
      await (await textField("Name")).setValue("Bus");
      await clickNamed("Save");

      expect(vehicleTypeServices.updateVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("Admin user edits a vehicle type to have a non-unique name that is not case-sensitive", async () => {
      signIn();
      vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [bus, golfCart] });
      await mountAppAt("/vehicle-types");

      await openEdit("Golf Cart");
      await (await textField("Name")).setValue("bus");
      await clickNamed("Save");

      expect(vehicleTypeServices.updateVehicleType).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("Admin user deletes a vehicle type", async () => {
      signIn();
      const removed = { status: 200, data: { message: "Vehicle type deleted successfully." } };
      vehicleTypeServices.removeVehicleType.mockResolvedValue(removed);
      vehicleTypeServices.getVehicleTypes.mockResolvedValueOnce({ data: [bus] }).mockResolvedValueOnce({ data: [] });
      await mountAppAt("/vehicle-types");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete vehicle type"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete vehicle type"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(vehicleTypeServices.removeVehicleType).toHaveBeenCalledWith(1));
      expect(removed.status).toBe(200);
      await waitFor(() => {
        expect(document.body.textContent).toContain("No vehicle types yet. Create your first vehicle type.");
      });
    });
  });

  describe("US-4.5: Signed-in admin user access only", () => {
    it("Signed-in admin user sees nav link", async () => {
      signIn();
      await mountAppAt("/");

      await waitFor(() => expect(navLabels()).toContain("Vehicle Types"));
    });

    it("Signed-in admin user clicks on nav link", async () => {
      signIn();
      await mountAppAt("/");

      const item = await waitFor(() => {
        const match = wrapper
          .findAllComponents({ name: "VListItem" })
          .find((component) => component.props("title") === "Vehicle Types");
        expect(match).toBeDefined();
        return match;
      });
      await item.trigger("click");
      await waitFor(() => expect(router.currentRoute.value.path).toBe("/vehicle-types"));
    });

    it("Signed-in user without admin role does not see nav link", async () => {
      signIn([{ id: 2, role: "maintenance", areaId: null, area: null }]);
      await mountAppAt("/");

      await waitFor(() => expect(navLabels()).not.toContain("Vehicle Types"));
    });

    it("Un-signed-in user accesses vehicle types page", async () => {
      await mountAppAt("/vehicle-types");

      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin role accesses vehicle types page", async () => {
      signIn([{ id: 2, role: "maintenance", areaId: null, area: null }]);
      await mountAppAt("/vehicle-types");

      expect(router.currentRoute.value.path).toBe("/");
    });
  });
});
