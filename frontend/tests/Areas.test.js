/**
 * Feature 2 — Area Management
 * Spec: features/feature-2-area-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import areaServices from "../src/services/areaServices.js";
import { apiError, signInAs, vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/areaServices.js", () => ({
  default: {
    getAreas: vi.fn(),
    getAreaById: vi.fn(),
    createArea: vi.fn(),
    updateArea: vi.fn(),
    removeArea: vi.fn(),
  },
}));

// Managing areas is admin-only since Feature 3 (US-3.6), so Feature 2 scenarios run as an admin.
const signedInUser = {
  userId: 2,
  email: "jane@oc.edu",
  firstName: "Jane",
  lastName: "Doe",
  roles: [{ id: 1, role: "admin", areaId: null, area: null }],
  token: "admin-token",
};

const athletics = {
  id: 1,
  name: "Athletics",
  logo: "https://example.com/logo.png",
};

const supportCentral = {
  id: 2,
  name: "Support Central",
  logo: "",
};

const tooLong = "a".repeat(256);

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

const navLabels = () =>
  [...document.body.querySelectorAll('[aria-label="Main navigation"] a')].map((link) => link.textContent.trim());

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

const openNewArea = async () => {
  namedButton("+ New Area").click();
  await settle();
  await waitFor(() => {
    expect(document.body.textContent).toContain("New area");
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
  return card?.querySelector('[aria-label="Edit area"]');
};

beforeEach(async () => {
  signInAs(null);
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: [] });
  areaServices.getAreas.mockResolvedValue({ data: [] });
  areaServices.createArea.mockResolvedValue({ status: 201, data: { ...athletics, logo: "" } });
  areaServices.updateArea.mockResolvedValue({ status: 200, data: athletics });
  areaServices.removeArea.mockResolvedValue({ status: 200, data: { message: "Area deleted successfully." } });
  await router.push("/login");
  await router.isReady();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 2 — Area Management", () => {
  describe("US-2.1 — Create areas", () => {
    it("User creates area", async () => {
      signIn();
      await mountAppAt("/areas");

      await openNewArea();

      expect(await textField("Name")).toBeDefined();
      expect(await textField("Logo")).toBeDefined();
    });

    it("User saves area", async () => {
      signIn();
      const saved = {
        status: 201,
        data: athletics,
      };
      areaServices.createArea.mockResolvedValue(saved);
      areaServices.getAreas.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [athletics] });
      await mountAppAt("/areas");

      await openNewArea();
      await (await textField("Name")).setValue("Athletics");
      await (await textField("Logo")).setValue("https://example.com/logo.png");
      await clickNamed("Create");

      await waitFor(() => expect(areaServices.createArea).toHaveBeenCalledTimes(1));
      expect(areaServices.createArea).toHaveBeenCalledWith({
        name: "Athletics",
        logo: "https://example.com/logo.png",
      });
      expect(saved.status).toBe(201);
      await waitFor(() => expect(wrapper.text()).toContain("Athletics"));
    });

    it("User creates area with missing name", async () => {
      signIn();
      await mountAppAt("/areas");

      await openNewArea();
      await clickNamed("Create");

      expect(areaServices.createArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User creates area with missing logo", async () => {
      signIn();
      const saved = { status: 201, data: { id: 1, name: "Athletics", logo: "" } };
      areaServices.createArea.mockResolvedValue(saved);
      areaServices.getAreas
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [saved.data] });
      await mountAppAt("/areas");

      await openNewArea();
      await (await textField("Name")).setValue("Athletics");
      await clickNamed("Create");

      await waitFor(() => expect(areaServices.createArea).toHaveBeenCalledTimes(1));
      expect(areaServices.createArea).toHaveBeenCalledWith({ name: "Athletics", logo: "" });
      expect(saved.status).toBe(201);
      expect(saved.data.logo).toBe("");
      await waitFor(() => expect(wrapper.text()).toContain("Athletics"));
    });

    it("User creates area with a whitespace-only name", async () => {
      signIn();
      await mountAppAt("/areas");

      await openNewArea();
      await (await textField("Name")).setValue(" ");
      await clickNamed("Create");

      expect(areaServices.createArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User creates area with name longer than 255 characters", async () => {
      signIn();
      await mountAppAt("/areas");

      await openNewArea();
      await (await textField("Name")).setValue(tooLong);
      await clickNamed("Create");

      expect(areaServices.createArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name too long.");
    });

    it("User creates an area with a non-unique name", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [{ ...athletics, logo: "" }] });
      await mountAppAt("/areas");

      await openNewArea();
      await (await textField("Name")).setValue("Athletics");
      await clickNamed("Create");

      expect(areaServices.createArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("User creates an area with a bad logo URL", async () => {
      signIn();
      await mountAppAt("/areas");

      await openNewArea();
      await (await textField("Name")).setValue("Athletics");
      await (await textField("Logo")).setValue("logo.png");
      await clickNamed("Create");

      expect(areaServices.createArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Invalid logo URL.");
    });
  });

  describe("US-2.2 — View areas", () => {
    it("Areas view lists areas", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics, supportCentral] });
      await mountAppAt("/areas");

      await waitFor(() => {
        expect(wrapper.text()).toContain("Athletics");
        expect(wrapper.text()).toContain("Support Central");
      });
    });

    it("Areas view lists areas with logo corresponding to if the logo exists", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics, supportCentral] });
      await mountAppAt("/areas");

      await waitFor(() => {
        const image = document.body.querySelector('img[src="https://example.com/logo.png"]');
        expect(image).toBeTruthy();
        expect(image.alt).toBe("Athletics logo");
        const support = [...document.body.querySelectorAll(".v-card")].find((card) =>
          card.textContent.includes("Support Central"),
        );
        expect(support).toBeTruthy();
        expect(support.querySelector("img")).toBeNull();
      });
    });

    it("Areas empty state", async () => {
      signIn();
      await mountAppAt("/areas");

      await waitFor(() => {
        expect(document.body.textContent).toContain("No areas yet. Create your first area.");
      });
    });
  });

  describe("US-2.3 — Manage area rows", () => {
    it("Area rows have edit and delete actions", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/areas");

      await waitFor(() => {
        expect(document.body.querySelector('[aria-label="Edit area"]')).toBeTruthy();
        expect(document.body.querySelector('[aria-label="Delete area"]')).toBeTruthy();
      });
    });
  });

  describe("US-2.4 — Edit and delete areas", () => {
    it("User edits an area name", async () => {
      signIn();
      const updated = { status: 200, data: { ...athletics, name: "Athletics A" } };
      areaServices.updateArea.mockResolvedValue(updated);
      areaServices.getAreas
        .mockResolvedValueOnce({ data: [athletics] })
        .mockResolvedValueOnce({ data: [updated.data] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      editButton("Athletics").click();
      await settle();
      await (await textField("Name")).setValue("Athletics A");
      await clickNamed("Save");

      await waitFor(() => expect(areaServices.updateArea).toHaveBeenCalledTimes(1));
      expect(areaServices.updateArea).toHaveBeenCalledWith(1, {
        name: "Athletics A",
        logo: "https://example.com/logo.png",
      });
      expect(updated.status).toBe(200);
      await waitFor(() => expect(wrapper.text()).toContain("Athletics A"));
    });

    it("User edits an area logo", async () => {
      signIn();
      const updated = { status: 200, data: { ...athletics, logo: "https://example.com/logo2.png" } };
      areaServices.updateArea.mockResolvedValue(updated);
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      editButton("Athletics").click();
      await settle();
      await (await textField("Logo")).setValue("https://example.com/logo2.png");
      await clickNamed("Save");

      await waitFor(() => expect(areaServices.updateArea).toHaveBeenCalledTimes(1));
      expect(areaServices.updateArea).toHaveBeenCalledWith(1, {
        name: "Athletics",
        logo: "https://example.com/logo2.png",
      });
      expect(updated.status).toBe(200);
      expect(updated.data.logo).toBe("https://example.com/logo2.png");
      expect(wrapper.text()).toContain("Athletics");
    });

    it("User edits an area to have a missing name", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      editButton("Athletics").click();
      await settle();
      await (await textField("Name")).setValue("");
      await clickNamed("Save");

      expect(areaServices.updateArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User edits an area to have a missing logo", async () => {
      signIn();
      const updated = { status: 200, data: { ...athletics, logo: "" } };
      areaServices.updateArea.mockResolvedValue(updated);
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      editButton("Athletics").click();
      await settle();
      await (await textField("Logo")).setValue("");
      await clickNamed("Save");

      await waitFor(() => expect(areaServices.updateArea).toHaveBeenCalledTimes(1));
      expect(areaServices.updateArea).toHaveBeenCalledWith(1, { name: "Athletics", logo: "" });
      expect(updated.status).toBe(200);
      expect(updated.data.logo).toBe("");
      expect(wrapper.text()).toContain("Athletics");
    });

    it("User edits an area to have a whitespace-only name", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      editButton("Athletics").click();
      await settle();
      await (await textField("Name")).setValue(" ");
      await clickNamed("Save");

      expect(areaServices.updateArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Required field.");
    });

    it("User edits an area to have a name longer than 255 characters", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      editButton("Athletics").click();
      await settle();
      await (await textField("Name")).setValue(tooLong);
      await clickNamed("Save");

      expect(areaServices.updateArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name too long.");
    });

    it("User updates an area to have a non-unique name", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics, supportCentral] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Support Central")).toBeTruthy());
      editButton("Support Central").click();
      await settle();
      await (await textField("Name")).setValue("Athletics");
      await clickNamed("Save");

      expect(areaServices.updateArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Name already taken.");
    });

    it("User updates an area to have a bad logo URL", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/areas");

      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      editButton("Athletics").click();
      await settle();
      await (await textField("Logo")).setValue("logo.png");
      await clickNamed("Save");

      expect(areaServices.updateArea).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Invalid logo URL.");
    });

    it("User deletes an area", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValueOnce({ data: [athletics] }).mockResolvedValueOnce({ data: [] });
      await mountAppAt("/areas");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete area"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete area"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(areaServices.removeArea).toHaveBeenCalledWith(1));
      await waitFor(() => {
        expect(document.body.textContent).toContain("No areas yet. Create your first area.");
      });
    });

    it("Admin user tries to delete an area with a vehicle", async () => {
      signIn();
      const message = "Area has vehicles. Delete vehicles or reassign them to a different area first.";
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      areaServices.removeArea.mockRejectedValue(apiError(400, message));
      await mountAppAt("/areas");

      await waitFor(() => expect(document.body.querySelector('[aria-label="Delete area"]')).toBeTruthy());
      document.body.querySelector('[aria-label="Delete area"]').click();
      await settle();
      await clickNamed("Delete");

      await waitFor(() => expect(document.body.textContent).toContain(message));
      expect(document.body.textContent).toContain("Athletics");
    });
  });

  describe("US-2.5: Signed-in user access only", () => {
    it("Un-signed-in user accesses areas page", async () => {
      await mountAppAt("/areas");

      expect(router.currentRoute.value.path).toBe("/login");
    });
  });
});

describe("Feature 3 — User Role Management", () => {
  describe("US-3.6 — Roles are enforced", () => {
    it("Admins can manage Areas", async () => {
      signIn();
      areaServices.getAreas.mockResolvedValue({ data: [athletics] });
      await mountAppAt("/");

      expect(navLabels()).toContain("Areas");

      await router.push("/areas");
      await settle();
      expect(router.currentRoute.value.name).toBe("areas");
      await waitFor(() => expect(namedButton("+ New Area")).toBeDefined());
      await waitFor(() => expect(editButton("Athletics")).toBeTruthy());
      expect(document.body.querySelector('[aria-label="Delete area"]')).toBeTruthy();
    });

    it("Non-admins cannot manage Areas", async () => {
      const nonAdminRoles = [
        [],
        [{ id: 2, role: "maintenance", areaId: null, area: null }],
        [{ id: 3, role: "area_admin", areaId: 1, area: { id: 1, name: "Athletics" } }],
      ];

      for (const roles of nonAdminRoles) {
        signIn(roles);
        await mountAppAt("/areas");

        expect(router.currentRoute.value.name).toBe("home");
        expect(navLabels()).not.toContain("Areas");
        expect(namedButton("+ New Area")).toBeUndefined();

        wrapper.unmount();
        document.body.innerHTML = "";
        await router.push("/login");
        signInAs(null);
      }
    });
  });
});
