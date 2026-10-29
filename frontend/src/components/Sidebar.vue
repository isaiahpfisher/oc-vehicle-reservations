<script setup>
import { computed, ref } from "vue";
import { useDisplay } from "vuetify";
import AppLogo from "./AppLogo.vue";
import ProfileMenu from "./ProfileMenu.vue";
import { useAppNav } from "../composables/useAppNav.js";

const { navLinks } = useAppNav();
// `meta.pinned` pages sit just above the profile instead of with the other pages.
const mainLinks = computed(() => navLinks.value.filter((link) => !link.meta.pinned));
const pinnedLinks = computed(() => navLinks.value.filter((link) => link.meta.pinned));

// Collapsed (icons only) by default on small screens.
const rail = ref(useDisplay().smAndDown.value);
</script>

<template>
  <!-- App shell for users with roles: logo top, pages, pinned pages + profile glued to the bottom, collapsible -->
  <v-navigation-drawer permanent :rail="rail" color="primary" width="272" class="app-sidebar">
    <!-- px-2 lines the logo up with the nav icons (list `nav` padding), expanded and collapsed -->
    <div class="px-2 py-4">
      <AppLogo :collapsed="rail" />
    </div>

    <v-divider />

    <v-list nav aria-label="Main navigation" :prepend-gap="20">
      <v-list-item
        v-for="link in mainLinks"
        :key="link.name"
        :to="{ name: link.name }"
        :prepend-icon="link.meta.icon"
        :title="link.meta.nav"
        :aria-label="rail ? link.meta.nav : undefined"
      />
    </v-list>

    <template #append>
      <v-divider />

      <v-list v-if="pinnedLinks.length" nav aria-label="Pinned navigation" :prepend-gap="20" class="pb-0">
        <v-list-item
          v-for="link in pinnedLinks"
          :key="link.name"
          :to="{ name: link.name }"
          :prepend-icon="link.meta.icon"
          :title="link.meta.nav"
          :aria-label="rail ? link.meta.nav : undefined"
        />
      </v-list>

      <v-list nav :prepend-gap="20">
        <ProfileMenu location="end">
          <template #activator="{ props, displayName, email }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-account-circle"
              :title="rail ? undefined : displayName"
              :subtitle="rail ? undefined : email"
              aria-label="Open profile menu"
            />
          </template>
        </ProfileMenu>
      </v-list>
    </template>

    <!-- Edge toggle on the header divider: same spot whether expanded or collapsed -->
    <v-btn
      class="app-sidebar__toggle"
      :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
      size="x-small"
      width="24"
      height="24"
      color="surface"
      elevation="2"
      :aria-label="rail ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="rail = !rail"
    />
  </v-navigation-drawer>
</template>

<style scoped>
.app-sidebar {
  overflow: visible;
}

.app-sidebar__toggle {
  position: absolute;
  top: 60px; /* centered on the divider under the 72px header */
  right: -12px;
  z-index: 1;
  color: rgb(var(--v-theme-primary)) !important;
}
</style>
