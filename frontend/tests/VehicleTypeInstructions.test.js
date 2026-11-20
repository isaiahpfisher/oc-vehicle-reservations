/**
 * Feature 15 — Vehicle Type Instructions
 * Spec: features/feature-15-vehicle-type-instructions.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import vehicleTypeServices from "../src/services/vehicleTypeServices.js";
import vehicleTypeInstructionServices from "../src/services/vehicleTypeInstructionServices.js";
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

vi.mock("../src/services/vehicleTypeInstructionServices.js", () => ({
  default: {
    getVehicleTypeInstructions: vi.fn(),
    getVehicleTypeInstructionById: vi.fn(),
    createVehicleTypeInstruction: vi.fn(),
    updateVehicleTypeInstruction: vi.fn(),
    removeVehicleTypeInstruction: vi.fn(),
  },
}));

const van = { id: 1, name: "Van" };
const athletics = { id: 1, name: "Athletics" };
const defaultMessage = "Keys are in the office. On return, fill with gas, clean up, and put the keys back.";
const athleticsMessage = "Park in the Athletics lot. Keys are in the Athletics office.";
const lotMessage = "Park in the Athletics lot.";

const defaultInstruction = {
  id: 1,
  vehicleTypeId: 1,
  areaId: null,
  content: "Keys are in the office.",
  vehicleType: van,
  area: null,
};

const athleticsInstruction = {
  id: 2,
  vehicleTypeId: 1,
  areaId: 1,
  content: lotMessage,
  vehicleType: van,
  area: athletics,
};

const adminUser = {
  userId: 2,
  email: "jane@oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  roles: [{ id: 1, role: "admin", areaId: null, area: null }],
  token: "admin-token",
};

const areaAdminUser = {
  ...adminUser,
  roles: [{ id: 3, role: "area_admin", areaId: 1, area: athletics }],
};

let roles = adminUser.roles;
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

const signIn = (user = adminUser) => {
  roles = user.roles;
  signInAs(user);
};

const namedButton = (text) =>
  [...document.body.querySelectorAll("button, a")].find((el) => el.textContent.trim() === text);

const field = async (name, label) =>
  waitFor(() => {
    const match = wrapper.findAllComponents({ name }).find((component) => component.props("label") === label);
    expect(match).toBeDefined();
    return match;
  });

const textArea = (label) => field("VTextarea", label);
const selectField = (label) => field("VSelect", label);

const openNewInstruction = async () => {
  namedButton("+ New Instruction").click();
  await settle();
  await waitFor(() => expect(document.body.textContent).toContain("Vehicle type"));
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

beforeEach(async () => {
  roles = adminUser.roles;
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockImplementation(async (url) => {
    if (String(url).startsWith("users/")) {
      return { data: { roles } };
    }
    if (url === "areas") {
      return { data: [athletics, { id: 2, name: "Music" }] };
    }
    return { data: [] };
  });
  vehicleTypeServices.getVehicleTypes.mockResolvedValue({ data: [van] });
  vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: [] });
  vehicleTypeInstructionServices.createVehicleTypeInstruction.mockResolvedValue({
    status: 201,
    data: { ...defaultInstruction, content: defaultMessage },
  });
  vehicleTypeInstructionServices.updateVehicleTypeInstruction.mockResolvedValue({ status: 200, data: defaultInstruction });
  vehicleTypeInstructionServices.removeVehicleTypeInstruction.mockResolvedValue({
    status: 200,
    data: { message: "Vehicle type instruction deleted successfully." },
  });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 15 — Vehicle Type Instructions", () => {
  describe("US-15.1 — Create vehicle type instructions", () => {
    it("Admin user creates a vehicle type instruction", async () => {
      signIn();
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();

      expect(await selectField("Vehicle type")).toBeDefined();
      expect(await selectField("Area")).toBeDefined();
      const message = await textArea("Instruction message");
      expect(message.props("modelValue")).toBe(`Pickup the vehicle from the lot behind Garvey.
You will be driving ___.
Pickup the keys from Support Central during office hours.
On return, fill with gas, clean up, and put the keys in the drop box outside support.
Contact the area admin if there is an issue.`);
      await message.setValue("Keys are in the lockbox.");
      expect(message.props("modelValue")).toBe("Keys are in the lockbox.");
    });

    it("Area admin user creates a vehicle type instruction", async () => {
      signIn(areaAdminUser);
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();

      expect(await selectField("Vehicle type")).toBeDefined();
      expect(await selectField("Area")).toBeDefined();
      expect(await textArea("Instruction message")).toBeDefined();
    });

    it("Admin user saves a default vehicle type instruction", async () => {
      signIn();
      const saved = {
        id: 1,
        vehicleTypeId: 1,
        areaId: null,
        content: defaultMessage,
        vehicleType: van,
        area: null,
      };
      vehicleTypeInstructionServices.createVehicleTypeInstruction.mockResolvedValue({ status: 201, data: saved });
      vehicleTypeInstructionServices.getVehicleTypeInstructions
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [saved] });
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();
      await (await selectField("Vehicle type")).setValue(1);
      await (await textArea("Instruction message")).setValue(defaultMessage);
      await clickNamed("Create");

      await waitFor(() => expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledTimes(1));
      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledWith({
        vehicleTypeId: 1,
        areaId: null,
        content: defaultMessage,
      });
      await waitFor(() => {
        expect(document.body.textContent).toContain("Van");
        expect(document.body.textContent).toContain("Default");
        expect(document.body.textContent).toContain(defaultMessage);
      });
    });

    it("Area admin user saves an area vehicle type instruction", async () => {
      signIn(areaAdminUser);
      const saved = {
        id: 2,
        vehicleTypeId: 1,
        areaId: 1,
        content: athleticsMessage,
        vehicleType: van,
        area: athletics,
      };
      vehicleTypeInstructionServices.createVehicleTypeInstruction.mockResolvedValue({ status: 201, data: saved });
      vehicleTypeInstructionServices.getVehicleTypeInstructions
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [saved] });
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();
      await (await selectField("Vehicle type")).setValue(1);
      await (await selectField("Area")).setValue(1);
      await (await textArea("Instruction message")).setValue(athleticsMessage);
      await clickNamed("Create");

      await waitFor(() => expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledTimes(1));
      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledWith({
        vehicleTypeId: 1,
        areaId: 1,
        content: athleticsMessage,
      });
      await waitFor(() => {
        expect(document.body.textContent).toContain("Van");
        expect(document.body.textContent).toContain("Athletics");
        expect(document.body.textContent).toContain(athleticsMessage);
      });
    });

    it("Admin user saves an area vehicle type instruction", async () => {
      signIn();
      const saved = {
        id: 3,
        vehicleTypeId: 1,
        areaId: 1,
        content: lotMessage,
        vehicleType: van,
        area: athletics,
      };
      vehicleTypeInstructionServices.createVehicleTypeInstruction.mockResolvedValue({ status: 201, data: saved });
      vehicleTypeInstructionServices.getVehicleTypeInstructions
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [saved] });
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();
      await (await selectField("Vehicle type")).setValue(1);
      await (await selectField("Area")).setValue(1);
      await (await textArea("Instruction message")).setValue(lotMessage);
      await clickNamed("Create");

      await waitFor(() => expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledWith({
        vehicleTypeId: 1,
        areaId: 1,
        content: lotMessage,
      }));
      await waitFor(() => {
        expect(document.body.textContent).toContain("Van");
        expect(document.body.textContent).toContain("Athletics");
      });
    });

    it("Admin user creates a vehicle type instruction with a missing vehicle type", async () => {
      signIn();
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();
      await (await textArea("Instruction message")).setValue(defaultMessage);
      await clickNamed("Create");

      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates a vehicle type instruction with a missing instruction message", async () => {
      signIn();
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();
      await (await selectField("Vehicle type")).setValue(1);
      await (await textArea("Instruction message")).setValue("");
      await clickNamed("Create");

      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin user creates a vehicle type instruction with a whitespace-only instruction message", async () => {
      signIn();
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();
      await (await selectField("Vehicle type")).setValue(1);
      await (await textArea("Instruction message")).setValue(" ");
      await clickNamed("Create");

      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Area admin user creates a vehicle type instruction with a missing area", async () => {
      signIn(areaAdminUser);
      await mountAppAt("/vehicle-type-instructions");

      await openNewInstruction();
      await (await selectField("Vehicle type")).setValue(1);
      await (await textArea("Instruction message")).setValue(athleticsMessage);
      await clickNamed("Create");

      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });
  });

  describe("US-15.2 — View vehicle type instructions", () => {
    it("Admin vehicle type instructions view lists every instruction", async () => {
      signIn();
      vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({
        data: [defaultInstruction, athleticsInstruction],
      });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => {
        expect(document.body.textContent).toContain("Van");
        expect(document.body.textContent).toContain("Default");
        expect(document.body.textContent).toContain("Keys are in the office.");
        expect(document.body.textContent).toContain("Athletics");
        expect(document.body.textContent).toContain(lotMessage);
      });
    });

    it("Area admin vehicle type instructions view lists instructions for their areas", async () => {
      signIn(areaAdminUser);
      vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: [athleticsInstruction] });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => {
        expect(document.body.textContent).toContain("Van");
        expect(document.body.textContent).toContain("Athletics");
        expect(document.body.textContent).toContain(lotMessage);
      });
      expect(document.body.textContent).not.toContain("Default");
      expect(document.body.textContent).not.toContain("Music");
    });

    it("Admin vehicle type instructions empty state", async () => {
      signIn();
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => {
        expect(document.body.textContent).toContain(
          "No vehicle type instructions yet. Create your first vehicle type instruction.",
        );
      });
    });
  });

  describe("US-15.3 — Manage vehicle type instruction rows", () => {
    it("Admin vehicle type instruction rows have edit and delete actions", async () => {
      signIn();
      vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: [defaultInstruction] });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit vehicle type instruction"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete vehicle type instruction"]')).toBeTruthy();
      });
    });

    it("Area admin vehicle type instruction rows have edit and delete actions", async () => {
      signIn(areaAdminUser);
      vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: [athleticsInstruction] });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit vehicle type instruction"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete vehicle type instruction"]')).toBeTruthy();
      });
    });
  });

  describe("US-15.4 — Edit and delete vehicle type instructions", () => {
    it("Admin edits a vehicle type instruction message", async () => {
      signIn();
      const updated = { ...defaultInstruction, content: "Keys are in the lockbox." };
      vehicleTypeInstructionServices.getVehicleTypeInstructions
        .mockResolvedValueOnce({ data: [defaultInstruction] })
        .mockResolvedValueOnce({ data: [updated] });
      vehicleTypeInstructionServices.updateVehicleTypeInstruction.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit vehicle type instruction"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit vehicle type instruction"]').click();
      await settle();
      await (await textArea("Instruction message")).setValue("Keys are in the lockbox.");
      await clickNamed("Save");

      await waitFor(() => expect(vehicleTypeInstructionServices.updateVehicleTypeInstruction).toHaveBeenCalledWith(1, {
        vehicleTypeId: 1,
        areaId: null,
        content: "Keys are in the lockbox.",
      }));
      await waitFor(() => expect(document.body.textContent).toContain("Keys are in the lockbox."));
    });

    it("Area admin edits a vehicle type instruction in their area", async () => {
      signIn(areaAdminUser);
      const updated = { ...athleticsInstruction, content: lotMessage };
      vehicleTypeInstructionServices.getVehicleTypeInstructions
        .mockResolvedValueOnce({ data: [{ ...athleticsInstruction, content: "Old message." }] })
        .mockResolvedValueOnce({ data: [updated] });
      vehicleTypeInstructionServices.updateVehicleTypeInstruction.mockResolvedValue({ status: 200, data: updated });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit vehicle type instruction"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit vehicle type instruction"]').click();
      await settle();
      await (await textArea("Instruction message")).setValue(lotMessage);
      await clickNamed("Save");

      await waitFor(() => expect(vehicleTypeInstructionServices.updateVehicleTypeInstruction).toHaveBeenCalled());
      await waitFor(() => expect(document.body.textContent).toContain(lotMessage));
    });

    it("Admin edits a vehicle type instruction to have a missing instruction message", async () => {
      signIn();
      vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: [defaultInstruction] });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Edit vehicle type instruction"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Edit vehicle type instruction"]').click();
      await settle();
      await (await textArea("Instruction message")).setValue("");
      await clickNamed("Save");

      expect(vehicleTypeInstructionServices.updateVehicleTypeInstruction).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("Admin deletes a vehicle type instruction", async () => {
      signIn();
      vehicleTypeInstructionServices.getVehicleTypeInstructions
        .mockResolvedValueOnce({ data: [defaultInstruction] })
        .mockResolvedValueOnce({ data: [] });
      await mountAppAt("/vehicle-type-instructions");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete vehicle type instruction"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete vehicle type instruction"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(vehicleTypeInstructionServices.removeVehicleTypeInstruction).toHaveBeenCalledWith(1));
      await waitFor(() => {
        expect(document.body.textContent).toContain(
          "No vehicle type instructions yet. Create your first vehicle type instruction.",
        );
      });
    });
  });

  describe("US-15.5 — Signed-in admin or area admin access only", () => {
    it("Un-signed-in user accesses vehicle type instructions page", async () => {
      await mountAppAt("/vehicle-type-instructions");

      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin or area admin role accesses vehicle type instructions page", async () => {
      signIn({
        ...adminUser,
        roles: [{ id: 4, role: "maintenance", areaId: null, area: null }],
      });
      await mountAppAt("/vehicle-type-instructions");

      // Feature 8's home route is `/`, named `home`.
      expect(router.currentRoute.value.name).toBe("home");
      expect(router.currentRoute.value.path).toBe("/");
    });
  });
});
