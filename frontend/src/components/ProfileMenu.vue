<script setup>
import { computed, ref } from "vue";
import authServices from "../services/authServices.js";
import { useRoles } from "../composables/useRoles.js";
import { fullName } from "../models/users.js";

defineProps({
  location: { type: String, default: "bottom" },
});

const { user } = useRoles();
const open = ref(false);
const loggingOut = ref(false);

const displayName = computed(() => (user.value ? fullName(user.value) || user.value.email : ""));

const handleLogout = async () => {
  open.value = false;
  loggingOut.value = true;

  try {
    await authServices.logoutUser();
  } finally {
    loggingOut.value = false;
  }
};
</script>

<template>
  <v-menu v-if="user" v-model="open" :close-on-content-click="false" :location>
    <template #activator="{ props: menuProps }">
      <slot name="activator" :props="menuProps" :display-name="displayName" :email="user.email" />
    </template>

    <v-card min-width="300">
      <v-list density="comfortable">
        <v-list-item :title="displayName">
          <template #subtitle>
            <div>{{ user.email }}</div>
          </template>
        </v-list-item>
      </v-list>

      <v-divider />

      <v-list density="compact">
        <v-list-item title="Sign out" prepend-icon="mdi-logout" :disabled="loggingOut" @click="handleLogout" />
      </v-list>
    </v-card>
  </v-menu>
</template>
