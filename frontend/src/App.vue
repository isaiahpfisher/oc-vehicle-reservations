<script setup>
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ConfirmProvider from "./components/common/ConfirmProvider.vue";
import MenuBar from "./components/MenuBar.vue";
import Sidebar from "./components/Sidebar.vue";
import { useRoles } from "./composables/useRoles.js";
import { useNoticeStore } from "./stores/notice.js";

const route = useRoute();
const { user } = useRoles();

// ui-style-system.mdc: no chrome on login; Sidebar for users with roles, MenuBar for requesters.
// `route.matched` is empty until the first navigation resolves (it awaits the role refresh),
// so checking it keeps the chrome from flashing on page load before a redirect to login.
const showChrome = computed(() => route.matched.length > 0 && route.name !== "login" && !!user.value);
const showSidebar = computed(() => showChrome.value && (user.value?.roles?.length ?? 0) > 0);

// UI/UX backlog #17: when the router sends someone home from a page they can't open (or that doesn't exist), say so,
// then drop the `?notice=` so a reload doesn't show it again.
const NOTICES = {
  "no-access": "You don't have access to that page.",
  "not-found": "That page doesn't exist.",
};
const router = useRouter();
// UI/UX backlog #48: one toast for the whole app (stores/notice.js); redirect notices use it too.
const notices = useNoticeStore();
watch(
  () => route.query.notice,
  (key) => {
    if (typeof key !== "string" || !NOTICES[key]) return;
    notices.notify(NOTICES[key], { tone: "info" });
    const { notice: _shown, ...query } = route.query;
    router.replace({ path: route.path, query, hash: route.hash });
  },
  { immediate: true },
);
</script>

<template>
  <v-app>
    <Sidebar v-if="showSidebar" />
    <MenuBar v-else-if="showChrome" />
    <v-main>
      <router-view />
    </v-main>
    <ConfirmProvider />
    <v-snackbar
      :key="notices.key"
      :model-value="!!notices.message"
      :color="notices.color"
      timeout="3500"
      data-test="app-notice"
      @update:model-value="(open) => !open && notices.clear()"
    >
      {{ notices.message }}
    </v-snackbar>
  </v-app>
</template>

<style>
/* OC Academic Edition — typography (see ui-style-system.mdc) */
/* Vuetify 4 type classes (text-headline-*, text-body-*) read these instead of inheriting */
:root {
  --v-font-body: Inter, sans-serif;
  --v-font-heading: Inter, sans-serif;
}

.v-application {
  font-family: Inter, sans-serif !important;
  font-size: 16px;
  font-weight: 400;
}

.v-application :is(h1, h2, h3, h4, h5, h6) {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

/* Primary labeled CTAs — shared size for peer buttons */
/* Toggle buttons with a small gap between them, each with its own border and corners, rather than one joined bar
   (the request views and service logs, Destinations' table/map). */
.v-btn-group.oc-spaced-toggle {
  gap: 8px;
}

.v-btn-group.oc-spaced-toggle .v-btn {
  border: thin solid currentColor;
  border-radius: 8px;
}

/* A list's search-and-filter row, the same on every list (Vehicles set the pattern): compact outlined fields and
   40px buttons on one row that wraps. */
.oc-list-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.oc-list-search {
  flex: 1 1 260px;
  max-width: 420px;
}

.oc-list-filter {
  flex: 0 1 220px;
  min-width: 180px;
}

/* A record's name linking to its page, in a table: the theme color, underlined only on hover (Vehicles set it). */
.oc-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.oc-link:hover,
.oc-link:focus-visible {
  text-decoration: underline;
}

.v-btn.oc-cta {
  font-size: 0.875rem !important;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: none;
}
</style>
