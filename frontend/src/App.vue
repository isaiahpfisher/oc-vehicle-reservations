<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import ConfirmProvider from "./components/common/ConfirmProvider.vue";
import MenuBar from "./components/MenuBar.vue";
import Sidebar from "./components/Sidebar.vue";
import { useRoles } from "./composables/useRoles.js";

const route = useRoute();
const { user } = useRoles();

// ui-style-system.mdc: no chrome on login; Sidebar for users with roles, MenuBar for requesters.
// `route.matched` is empty until the first navigation resolves (it awaits the role refresh),
// so checking it keeps the chrome from flashing on page load before a redirect to login.
const showChrome = computed(() => route.matched.length > 0 && route.name !== "login" && !!user.value);
const showSidebar = computed(() => showChrome.value && (user.value?.roles?.length ?? 0) > 0);
</script>

<template>
  <v-app>
    <Sidebar v-if="showSidebar" />
    <MenuBar v-else-if="showChrome" />
    <v-main>
      <router-view />
    </v-main>
    <ConfirmProvider />
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
.v-btn.oc-cta {
  font-size: 0.875rem !important;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: none;
}
</style>
