import { flushPromises, mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createMemoryHistory, createRouter } from "vue-router";

export const vuetify = createVuetify({ components, directives });

export async function createTestRouter(initialPath = "/") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div>Home</div>" } },
      { path: "/login", name: "login", component: { template: "<div>Login</div>" } },
      { path: "/register", name: "register", component: { template: "<div>Register</div>" } },
    ],
  });

  await router.push(initialPath);
  await router.isReady();

  return router;
}

export async function mountWithPlugins(component, options = {}) {
  const { router: providedRouter, global, ...rest } = options;
  const router = providedRouter ?? (await createTestRouter());

  const wrapper = mount(component, {
    ...rest,
    global: {
      plugins: [vuetify, router],
      ...global,
    },
  });

  return { wrapper, router };
}

/** Let Vuetify validation, API promises, and router navigation finish. */
export const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await flushPromises();
  }
};

/** Retry an assertion until it passes (async validation and navigation settle on timers). */
export const waitFor = async (assertion, timeout = 1500) => {
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

/** Axios-shaped API error. */
export const apiError = (status, message) => Object.assign(new Error(message), { response: { status, data: { message } } });
