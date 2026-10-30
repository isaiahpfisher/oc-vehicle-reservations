/**
 * Page shell components — UI rule, not a numbered feature
 * Rule: .cursor/rules/ui-style-system.mdc → Page Shells
 */
import { describe, it, expect } from "vitest";
import { h } from "vue";
import PageShell from "../src/components/layout/PageShell.vue";
import SectionCard from "../src/components/layout/SectionCard.vue";
import DetailHeader from "../src/components/layout/DetailHeader.vue";
import DetailLayout from "../src/components/layout/DetailLayout.vue";
import { mountWithPlugins } from "./testUtils.js";

const mountShell = async (component, props = {}, slots = {}) => (await mountWithPlugins(component, { props, slots })).wrapper;

describe("Page shells (ui-style-system.mdc)", () => {
  describe("PageShell", () => {
    it("renders breadcrumbs, an h2 title, subtitle, header actions, and content", async () => {
      const wrapper = await mountShell(
        PageShell,
        { title: "Vehicles", subtitle: "All campus vehicles.", breadcrumbs: [{ title: "Home", to: "/" }, { title: "Vehicles" }] },
        { actions: () => h("button", { class: "cta" }, "+ New Vehicle"), default: () => h("p", { class: "content" }, "Body") },
      );

      expect(wrapper.find(".v-container").exists()).toBe(true);
      expect(wrapper.find(".v-breadcrumbs").text()).toContain("Home");
      expect(wrapper.find("h2").text()).toBe("Vehicles");
      expect(wrapper.text()).toContain("All campus vehicles.");
      expect(wrapper.find(".cta").text()).toBe("+ New Vehicle");
      expect(wrapper.find(".content").exists()).toBe(true);
    });

    it("omits the header and breadcrumbs when not given", async () => {
      const wrapper = await mountShell(PageShell, {}, { default: () => h("p", "Body") });

      expect(wrapper.find("h2").exists()).toBe(false);
      expect(wrapper.find(".v-breadcrumbs").exists()).toBe(false);
    });

    it("shows a skeleton while loading and an alert on error instead of content", async () => {
      const loading = await mountShell(PageShell, { title: "Vehicle", loading: true }, { default: () => h("p", { class: "content" }, "Body") });
      expect(loading.find(".v-skeleton-loader").exists()).toBe(true);
      expect(loading.find(".content").exists()).toBe(false);
      expect(loading.find("h2").text()).toBe("Vehicle");

      const custom = await mountShell(PageShell, { loading: true }, { loading: () => h("p", { class: "custom-skeleton" }) });
      expect(custom.find(".custom-skeleton").exists()).toBe(true);

      const failed = await mountShell(PageShell, { error: "Failed to load vehicle." }, { default: () => h("p", { class: "content" }, "Body") });
      expect(failed.find(".v-alert").text()).toContain("Failed to load vehicle.");
      expect(failed.find(".content").exists()).toBe(false);
    });

    it("limits width for narrow pages", async () => {
      const wrapper = await mountShell(PageShell, { title: "Form", maxWidth: 768 });

      expect(wrapper.find(".v-container").attributes("style")).toContain("max-width: 768px");
    });
  });

  describe("SectionCard", () => {
    it("renders a title, subtitle, header append, body, and actions footer", async () => {
      const wrapper = await mountShell(
        SectionCard,
        { title: "Access", subtitle: "Who can do what." },
        {
          append: () => h("button", { class: "header-cta" }, "Add"),
          default: () => h("p", { class: "body" }, "Body"),
          actions: () => [h("button", "Cancel"), h("button", "Save")],
        },
      );

      expect(wrapper.find(".v-card-title").text()).toBe("Access");
      expect(wrapper.find(".v-card-subtitle").text()).toBe("Who can do what.");
      expect(wrapper.find(".v-card-item .header-cta").exists()).toBe(true);
      expect(wrapper.find(".v-card-text .body").exists()).toBe(true);
      expect(wrapper.find(".v-divider").exists()).toBe(true);
      expect(wrapper.findAll(".v-card-actions button").map((b) => b.text())).toEqual(["Cancel", "Save"]);
    });

    it("leaves out the footer without actions", async () => {
      const wrapper = await mountShell(SectionCard, { title: "Driver" }, { default: () => h("p", "Body") });

      expect(wrapper.find(".v-card-actions").exists()).toBe(false);
      expect(wrapper.find(".v-divider").exists()).toBe(false);
    });
  });

  describe("DetailHeader", () => {
    it("shows initials, title, subtitle, meta, and appended chips", async () => {
      const wrapper = await mountShell(
        DetailHeader,
        { title: "Jane Smith", subtitle: "jane@eagles.oc.edu", meta: "Member since October 2026", initials: "JS" },
        { append: () => h("span", { class: "chip" }, "Admin") },
      );

      expect(wrapper.find(".v-avatar").text()).toBe("JS");
      expect(wrapper.find("h2").text()).toBe("Jane Smith");
      expect(wrapper.text()).toContain("jane@eagles.oc.edu");
      expect(wrapper.text()).toContain("Member since October 2026");
      expect(wrapper.find(".chip").text()).toBe("Admin");
    });

    it("falls back to an icon without initials", async () => {
      const wrapper = await mountShell(DetailHeader, { title: "Van 12", icon: "mdi-van-passenger" });

      expect(wrapper.find(".v-avatar .v-icon").classes()).toContain("mdi-van-passenger");
    });
  });

  describe("DetailLayout", () => {
    it("puts the header on top and the aside beside the main column", async () => {
      const wrapper = await mountShell(DetailLayout, {}, {
        header: () => h("div", { class: "header" }),
        aside: () => h("div", { class: "aside" }),
        default: () => h("div", { class: "main" }),
      });

      const columns = wrapper.findAll(".v-col");
      expect(wrapper.find(".header").exists()).toBe(true);
      expect(columns).toHaveLength(2);
      expect(columns[0].classes()).toContain("v-col--cols-md-4");
      expect(columns[0].find(".aside").exists()).toBe(true);
      expect(columns[1].classes()).toContain("v-col--cols-md-8");
      expect(columns[1].find(".main").exists()).toBe(true);
    });

    it("uses the full width without an aside", async () => {
      const wrapper = await mountShell(DetailLayout, {}, { default: () => h("div", { class: "main" }) });

      const columns = wrapper.findAll(".v-col");
      expect(columns).toHaveLength(1);
      expect(columns[0].classes()).toContain("v-col--cols-md-12");
    });
  });
});
