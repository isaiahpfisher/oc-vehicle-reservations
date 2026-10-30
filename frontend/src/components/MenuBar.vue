<script setup>
import AppLogo from "./AppLogo.vue";
import ProfileMenu from "./ProfileMenu.vue";
import { useAppNav } from "../composables/useAppNav.js";

const { navLinks } = useAppNav();
</script>

<template>
  <!-- App shell for requesters (no roles); users with roles get Sidebar.vue -->
  <v-app-bar color="primary" density="comfortable">
    <template #prepend>
      <AppLogo class="ml-2" />
    </template>

    <nav aria-label="Main navigation" class="d-flex ml-4">
      <v-btn v-for="link in navLinks" :key="link.name" variant="text" color="white" :to="{ name: link.name }">
        {{ link.meta.nav }}
      </v-btn>
    </nav>

    <v-spacer />

    <ProfileMenu>
      <template #activator="{ props }">
        <v-btn v-bind="props" icon="mdi-account-circle" variant="text" color="white" aria-label="Open profile menu" />
      </template>
    </ProfileMenu>
  </v-app-bar>
</template>
