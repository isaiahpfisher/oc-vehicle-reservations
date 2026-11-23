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

// UI/UX backlog #9: instructions live on each vehicle type's page (`/vehicle-types/:id`): the default, then only the
// areas with their own, each written in a dialog. The areas that use the default are one line.
const byTest = (name) => document.body.querySelector(`[data-test="${name}"]`);
const openTypePage = async (rows = []) => {
  vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: rows });
  await mountAppAt("/vehicle-types/1");
  await waitFor(() => expect(byTest("instructions")).not.toBeNull());
};
const openDialog = async (button) => {
  await waitFor(() => expect(byTest(button)).not.toBeNull());
  byTest(button).click();
  await settle();
  return waitFor(() => {
    const box = wrapper.findAllComponents({ name: "VTextarea" }).find((component) => component.props("label") === "Instructions");
    expect(box).toBeDefined();
    return box;
  });
};
const chooseArea = async (areaId) => {
  const select = await field("VSelect", "Area");
  await select.setValue(areaId);
  await settle();
};
const openMenuItem = async (menu, item) => {
  await waitFor(() => expect(byTest(menu)).not.toBeNull());
  byTest(menu).click();
  await settle();
  const match = await waitFor(() => {
    const found = [...document.body.querySelectorAll(`.v-overlay--active [data-test="${item}"]`)].pop();
    expect(found).toBeDefined();
    return found;
  });
  match.click();
  await settle();
};
const saveDialog = async () => {
  byTest("instruction-save").click();
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
  vehicleTypeServices.getVehicleTypeById.mockResolvedValue({ data: { ...van, identifier: "VIN" } });
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
  // UI/UX backlog #9: the type and area come from where you click, so "missing vehicle type" / "missing area" can't
  // happen in the UI any more (the API still checks them).
  describe("US-15.1 — Create vehicle type instructions", () => {
    it("Admin user saves a default vehicle type instruction", async () => {
      signIn();
      await openTypePage();

      expect(byTest("instruction-default").textContent).toContain("No default yet.");
      const box = await openDialog("edit-default");
      expect(document.body.textContent).toContain("Default instructions");
      expect(document.body.textContent).toContain("Shown on Van trips in every area that doesn't have its own.");
      // A new default starts from an example to edit, not an empty box, and the example shows off variables.
      expect(box.props("modelValue")).toContain("Pickup: {{pickup_time}}");
      expect(box.props("modelValue")).toContain("pick up {{vehicle}}");
      expect(box.props("modelValue")).toContain("Return: {{return_time}}");
      // An emptied box shows an example too.
      expect(box.props("placeholder")).toContain("{{pickup_time}}");
      await box.setValue(defaultMessage);
      await saveDialog();

      await waitFor(() =>
        expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledWith({
          vehicleTypeId: 1,
          areaId: null,
          content: defaultMessage,
        }),
      );
      expect(vehicleTypeInstructionServices.getVehicleTypeInstructions).toHaveBeenCalledWith({ vehicleTypeId: "1" });
    });

    it("Admin user saves an area vehicle type instruction, starting from the default", async () => {
      signIn();
      await openTypePage([defaultInstruction]);

      expect(byTest("instruction-area-1")).toBeNull();
      expect(byTest("areas-using-default").textContent).toContain("Athletics and Music use the default.");
      // Two areas could get their own, so the dialog asks which.
      const box = await openDialog("add-area-instructions");
      expect(box.props("modelValue")).toBe(defaultInstruction.content);
      await box.setValue(athleticsMessage);
      await saveDialog();
      await waitFor(() => expect(document.body.textContent).toContain("Required field."));
      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).not.toHaveBeenCalled();
      await chooseArea(1);
      await saveDialog();

      await waitFor(() =>
        expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledWith({
          vehicleTypeId: 1,
          areaId: 1,
          content: athleticsMessage,
        }),
      );
    });

    it("An area's own instructions start from the example when there's no default to copy", async () => {
      signIn(areaAdminUser);
      await openTypePage();

      const box = await openDialog("add-area-instructions");
      expect(box.props("modelValue")).toContain("Hi {{driver_first_name}}");
    });

    it("Area admin user saves an area vehicle type instruction", async () => {
      signIn(areaAdminUser);
      await openTypePage([defaultInstruction]);

      // They read the default but can't change it, and see only their own areas.
      expect(byTest("instruction-default").textContent).toContain(defaultInstruction.content);
      expect(byTest("edit-default")).toBeNull();
      expect(byTest("areas-using-default").textContent).toBe("Athletics uses the default.");
      // Their one area is the only choice, so the dialog doesn't ask.
      const box = await openDialog("add-area-instructions");
      expect(wrapper.findAllComponents({ name: "VSelect" }).find((select) => select.props("label") === "Area")).toBeUndefined();
      expect(document.body.textContent).toContain("Athletics instructions");
      await box.setValue(athleticsMessage);
      await saveDialog();

      await waitFor(() =>
        expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).toHaveBeenCalledWith({
          vehicleTypeId: 1,
          areaId: 1,
          content: athleticsMessage,
        }),
      );
    });

    it("Admin user creates a vehicle type instruction with a missing or whitespace-only message", async () => {
      signIn();
      await openTypePage();

      for (const value of ["", "   "]) {
        const box = await openDialog("edit-default");
        await box.setValue(value);
        await saveDialog();
        await waitFor(() => expect(document.body.textContent).toContain("Required field."));
        await clickNamed("Cancel");
        await waitFor(() => expect(document.body.querySelector(".v-dialog.v-overlay--active")).toBeNull());
      }
      expect(vehicleTypeInstructionServices.createVehicleTypeInstruction).not.toHaveBeenCalled();
    });
  });

  describe("US-15.2 — View vehicle type instructions", () => {
    it("Admin sees the default and every area's instructions", async () => {
      signIn();
      await openTypePage([defaultInstruction, athleticsInstruction]);

      expect(byTest("instruction-default").textContent).toContain("Keys are in the office.");
      expect(byTest("instruction-area-1").textContent).toContain(lotMessage);
      expect(byTest("instruction-area-2")).toBeNull();
      expect(byTest("areas-using-default").textContent).toBe("Music uses the default.");
      expect(byTest("default-usage").textContent).toBe("Used by 1 of 2 areas");
    });

    it("Area admin sees the default and their own areas only", async () => {
      signIn(areaAdminUser);
      await openTypePage([defaultInstruction, athleticsInstruction]);

      expect(byTest("instruction-area-1").textContent).toContain(lotMessage);
      expect(byTest("instruction-area-2")).toBeNull();
      expect(byTest("areas-using-default")).toBeNull();
      expect(byTest("add-area-instructions")).toBeNull();
    });

    it("A type with no instructions says what its trips will show", async () => {
      signIn();
      await openTypePage();

      expect(byTest("instruction-default").textContent).toContain("No default yet.");
      expect(byTest("areas-using-default").textContent).toBe("Athletics and Music have none, so their drivers see no instructions.");
    });

    it("The vehicle types list sums up each type's instructions", async () => {
      signIn();
      vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: [defaultInstruction, athleticsInstruction] });
      await mountAppAt("/vehicle-types");

      const card = () => document.body.querySelector('[data-test="type-card"]');
      await waitFor(() => expect(card()?.querySelector('[data-test="type-instructions"]')?.textContent).toContain("Instructions: Default + 1 area"));
      expect(card().querySelector('[data-test="type-instructions"]').classList).not.toContain("text-warning");
    });

    // UI/UX backlog #74: without a default, trips in areas without their own show nothing, so the card warns.
    it("The vehicle types list warns when a type has no default instructions", async () => {
      signIn();
      vehicleTypeInstructionServices.getVehicleTypeInstructions.mockResolvedValue({ data: [athleticsInstruction] });
      await mountAppAt("/vehicle-types");

      const card = () => document.body.querySelector('[data-test="type-card"]');
      await waitFor(() => expect(card()?.querySelector('[data-test="type-instructions"]')?.textContent.trim()).toBe("No default instructions"));
      expect(card().querySelector('[data-test="type-instructions"]').classList).toContain("text-warning");
      expect(card().querySelector('[data-test="type-area-instructions"]').textContent.trim()).toBe("1 area with their own");
    });
  });

  describe("US-15.4 — Edit and delete vehicle type instructions", () => {
    it("Admin edits the default instruction message", async () => {
      signIn();
      await openTypePage([defaultInstruction]);

      const box = await openDialog("edit-default");
      expect(box.props("modelValue")).toBe(defaultInstruction.content);
      await box.setValue(defaultMessage);
      await saveDialog();

      await waitFor(() =>
        expect(vehicleTypeInstructionServices.updateVehicleTypeInstruction).toHaveBeenCalledWith(1, {
          vehicleTypeId: 1,
          areaId: null,
          content: defaultMessage,
        }),
      );
    });

    it("Area admin edits a vehicle type instruction in their area", async () => {
      signIn(areaAdminUser);
      await openTypePage([defaultInstruction, athleticsInstruction]);

      const box = await openDialog("edit-area-1");
      await box.setValue(athleticsMessage);
      await saveDialog();

      await waitFor(() =>
        expect(vehicleTypeInstructionServices.updateVehicleTypeInstruction).toHaveBeenCalledWith(2, {
          vehicleTypeId: 1,
          areaId: 1,
          content: athleticsMessage,
        }),
      );
    });

    it("Admin removes an area's instructions, so its trips go back to the default", async () => {
      signIn();
      await openTypePage([defaultInstruction, athleticsInstruction]);

      await openMenuItem("area-actions-1", "remove-area-1");
      const dialog = await waitFor(() => {
        const match = document.body.querySelector(".v-dialog.v-overlay--active");
        expect(match?.textContent).toContain("Remove the Athletics instructions for Van? Athletics trips will show the default instead.");
        return match;
      });
      [...dialog.querySelectorAll("button")].find((button) => button.textContent.trim() === "Remove").click();
      await settle();

      await waitFor(() => expect(vehicleTypeInstructionServices.removeVehicleTypeInstruction).toHaveBeenCalledWith(2));
    });
  });

  // Variables ({{vehicle}}, …) are filled in from each trip when the instructions go out to drivers.
  describe("Instruction variables", () => {
    const textareaEl = () => document.body.querySelector('.v-overlay--active [data-test="instruction-content"] textarea');
    const insert = async (name) => {
      [...document.body.querySelectorAll(`.v-overlay--active [data-test="insert-${name}"]`)].pop().click();
      await settle();
    };

    it("The page shows variables as labels and says what they are", async () => {
      signIn();
      await openTypePage([{ ...defaultInstruction, content: "Pick up {{vehicle}} by {{pickup_time}}." }]);

      const labels = [...byTest("instruction-default").querySelectorAll('[data-test="instruction-variable"]')];
      expect(labels.map((label) => label.textContent.trim())).toEqual(["Vehicle", "Pickup time"]);
      expect(byTest("instruction-default").textContent).not.toContain("{{");
      expect(byTest("variables-hint").textContent).toContain("are variables: each trip fills in its own details");
    });

    it("Without any variables yet, the page says where to find them", async () => {
      signIn();
      await openTypePage([defaultInstruction]);

      expect(byTest("variables-hint").textContent).toContain("from the Variables list when you edit");
    });

    it("Clicking a variable adds it where the cursor was, or at the end", async () => {
      signIn();
      await openTypePage([defaultInstruction]);
      const box = await openDialog("edit-default");

      // Before the box is clicked, it goes at the end with a space.
      await insert("vehicle");
      expect(box.props("modelValue")).toBe("Keys are in the office. {{vehicle}}");

      // After it, at the cursor.
      await box.setValue("Pick up  by noon.");
      textareaEl().setSelectionRange(8, 8);
      textareaEl().dispatchEvent(new Event("blur"));
      await insert("pickup_time");
      expect(box.props("modelValue")).toBe("Pick up {{pickup_time}} by noon.");

      await saveDialog();
      await waitFor(() =>
        expect(vehicleTypeInstructionServices.updateVehicleTypeInstruction).toHaveBeenCalledWith(1, {
          vehicleTypeId: 1,
          areaId: null,
          content: "Pick up {{pickup_time}} by noon.",
        }),
      );
    });

    it("Preview fills the variables in from a sample trip", async () => {
      signIn();
      await openTypePage([defaultInstruction, { ...athleticsInstruction, content: "Keys for {{vehicle}}. Ask {{area_admins}}." }]);
      await openDialog("edit-area-1");

      [...document.body.querySelectorAll('.v-overlay--active [data-test="instruction-preview"]')].pop().click();
      await settle();

      const preview = await waitFor(() => {
        const match = [...document.body.querySelectorAll('.v-overlay--active [data-test="instruction-preview-text"]')].pop();
        expect(match).toBeDefined();
        return match;
      });
      expect(preview.textContent).toContain("Keys for ATH-V02 · 2022 Ford Transit 350. Ask Taylor Athletics (areaadmin@oc.edu).");
      expect(preview.textContent).not.toContain("{{");

      // A trip with two vehicles of this type: {{vehicle}} lists both, since a driver isn't tied to one.
      [...document.body.querySelectorAll('.v-overlay--active [data-test="preview-two-vehicles"]')].pop().click();
      await settle();
      expect(preview.textContent).toContain("Keys for ATH-V01 · 2021 Ford Transit 350 and ATH-V02 · 2022 Ford Transit 350.");
      expect([...document.body.querySelectorAll('.v-overlay--active [data-test="preview-note"]')].pop().textContent).toContain(
        "each in their own email",
      );
    });

    // The {{ autocomplete was cut; the Variables panel is the way to add one.
    it("Typing {{ doesn't open a list", async () => {
      signIn();
      await openTypePage([defaultInstruction]);
      const box = await openDialog("edit-default");

      await box.setValue("Pick up {{");
      textareaEl().dispatchEvent(new KeyboardEvent("keyup", { key: "{", bubbles: true }));
      await settle();
      expect(document.body.querySelector('[data-test="variable-suggestions"]')).toBeNull();
    });

    it("A name that isn't a variable can't be saved", async () => {
      signIn();
      await openTypePage([defaultInstruction]);
      const box = await openDialog("edit-default");

      await box.setValue("Pick up {{vehical}} at the lot.");
      await saveDialog();

      await waitFor(() => expect(document.body.textContent).toContain("{{vehical}} isn't a variable. Pick one from Variables."));
      expect(vehicleTypeInstructionServices.updateVehicleTypeInstruction).not.toHaveBeenCalled();
    });

    it("The API's message shows if it refuses a variable", async () => {
      signIn();
      vehicleTypeInstructionServices.updateVehicleTypeInstruction.mockRejectedValue({
        response: { status: 400, data: { message: "Unknown variable {{old_name}}." } },
      });
      await openTypePage([defaultInstruction]);
      const box = await openDialog("edit-default");

      await box.setValue("Pick up {{vehicle}}.");
      await saveDialog();

      await waitFor(() => expect(document.body.textContent).toContain("Unknown variable {{old_name}}."));
    });
  });

  describe("US-15.5 — Signed-in admin or area admin access only", () => {
    it("Un-signed-in user accesses a vehicle type page", async () => {
      await mountAppAt("/vehicle-types/1");

      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("Signed-in user without admin or area admin role accesses a vehicle type page", async () => {
      signIn({ ...adminUser, roles: [{ id: 9, role: "maintenance", areaId: null, area: null }] });
      await mountAppAt("/vehicle-types/1");

      expect(router.currentRoute.value.path).toBe("/");
    });

    it("The old instructions page opens Vehicle Types", async () => {
      signIn();
      await mountAppAt("/vehicle-type-instructions");

      expect(router.currentRoute.value.name).toBe("vehicle-types");
    });
  });
});
