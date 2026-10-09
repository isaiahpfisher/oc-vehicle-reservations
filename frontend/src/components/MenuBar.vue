<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";
import authServices from "../services/authServices.js";
import userServices from "../services/userServices.js";

const user = ref(Utils.getStore("user"));
const profileMenuOpen = ref(false);
const editDialogOpen = ref(false);
const editForm = ref(null);
const loggingOut = ref(false);
const savingProfile = ref(false);
const profileError = ref("");

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("student");
const firstNameRules = [(value) => !!value?.trim() || "First name is required."];
const lastNameRules = [(value) => !!value?.trim() || "Last name is required."];
const passwordRules = [(value) => !value || value.length >= 8 || "Password must be at least 8 characters."];
const confirmPasswordRules = [(value) => !password.value || value === password.value || "Passwords do not match."];

const displayName = computed(() => {
  if (!user.value) {
    return "";
  }

  const parts = [user.value.firstName, user.value.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : (user.value.email ?? "");
});

const refreshUser = () => {
  user.value = Utils.getStore("user");
};

onMounted(() => {
  window.addEventListener("user-logged-in", refreshUser);
  window.addEventListener("user-logged-out", refreshUser);
});

onUnmounted(() => {
  window.removeEventListener("user-logged-in", refreshUser);
  window.removeEventListener("user-logged-out", refreshUser);
});

const resetPasswordFields = () => {
  password.value = "";
  confirmPassword.value = "";
};

const populateEditForm = (profile) => {
  firstName.value = profile.firstName ?? "";
  lastName.value = profile.lastName ?? "";
  email.value = profile.email ?? "";
  role.value = profile.role ?? "student";
  resetPasswordFields();
};

const openEditDialog = async () => {
  profileMenuOpen.value = false;
  profileError.value = "";

  if (!user.value?.userId) {
    return;
  }

  try {
    const response = await userServices.getUser(user.value.userId);
    populateEditForm(response.data);
    editDialogOpen.value = true;
  } catch (error) {
    populateEditForm(user.value);
    profileError.value = error.response?.data?.message || "Failed to load profile.";
    editDialogOpen.value = true;
  }
};

const closeEditDialog = () => {
  editDialogOpen.value = false;
  profileError.value = "";
  resetPasswordFields();
};

const handleSaveProfile = async () => {
  profileError.value = "";
  const { valid } = await editForm.value.validate();

  if (!valid || !user.value?.userId) {
    return;
  }

  savingProfile.value = true;

  try {
    const payload = {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      role: role.value.trim(),
    };

    if (password.value) {
      payload.password = password.value;
    }

    const response = await userServices.updateUser(user.value.userId, payload);
    const currentUser = Utils.getStore("user");

    Utils.setStore("user", {
      ...currentUser,
      ...response.data,
      userId: response.data.id,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      email: response.data.email,
      role: response.data.role,
      token: currentUser.token,
    });
    refreshUser();
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    closeEditDialog();
  } catch (error) {
    profileError.value = error.response?.data?.message || "Failed to update profile.";
  } finally {
    savingProfile.value = false;
  }
};

const handleLogout = async () => {
  profileMenuOpen.value = false;
  loggingOut.value = true;

  try {
    await authServices.logoutUser();
  } finally {
    loggingOut.value = false;
  }
};
</script>

<template>
  <v-app-bar color="primary" density="comfortable">
    <v-app-bar-title>Course Management System</v-app-bar-title>

    <v-btn v-if="user?.role === 'admin'" variant="text" color="white" to="/faculty"> Faculty </v-btn>
    <v-btn v-if="user" variant="text" color="white" to="/">Courses</v-btn>
   <v-btn v-if="user?.role == 'admin'" variant="text" color="white" to="/semesters">Semesters</v-btn>
    <v-btn v-if="user?.role == 'student'" variant="text" color="white" to="/course-listing">Course Listing</v-btn>

    <!-- <v-btn v-if="user?.role === 'admin' || user?.role === 'manager'" variant="text" color="white" to="/teams">
      Teams
    </v-btn>
    <v-btn v-if="user?.role === 'admin'" variant="text" color="white" to="/games"> Games </v-btn>
    <v-btn v-if="user?.role === 'admin'" variant="text" color="white" to="/people"> People </v-btn>
    <v-btn v-if="user?.role === 'admin'" variant="text" color="white" to="/seasons"> Seasons </v-btn> -->

    <v-spacer />

    <v-menu v-if="user" v-model="profileMenuOpen" :close-on-content-click="false">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          icon="mdi-account-circle"
          variant="text"
          color="white"
          aria-label="Open profile menu"
        />
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

        <v-card-actions class="px-4 py-2">
          <v-btn color="primary" variant="elevated" class="oc-cta" block @click="openEditDialog"> Edit Profile </v-btn>
        </v-card-actions>

        <v-divider />

        <v-list density="compact">
          <v-list-item title="Sign out" prepend-icon="mdi-logout" :disabled="loggingOut" @click="handleLogout" />
        </v-list>
      </v-card>
    </v-menu>

    <v-dialog v-model="editDialogOpen" max-width="560">
      <v-card>
        <v-card-title>Edit Profile</v-card-title>
        <v-card-text>
          <v-form ref="editForm" @submit.prevent="handleSaveProfile">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="firstName"
                  label="First name"
                  density="comfortable"
                  autocomplete="given-name"
                  :rules="firstNameRules"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="lastName"
                  label="Last name"
                  density="comfortable"
                  autocomplete="family-name"
                  :rules="lastNameRules"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="email"
                  label="Email"
                  type="email"
                  density="comfortable"
                  autocomplete="email"
                  :rules="emailRules"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="password"
                  label="New password"
                  type="password"
                  density="comfortable"
                  autocomplete="new-password"
                  :rules="passwordRules"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="confirmPassword"
                  label="Confirm password"
                  type="password"
                  density="comfortable"
                  autocomplete="new-password"
                  :rules="confirmPasswordRules"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="role" label="Role" density="comfortable" />
              </v-col>
            </v-row>

            <v-alert v-if="profileError" type="error" density="compact" class="mt-2">
              {{ profileError }}
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeEditDialog">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="savingProfile" @click="handleSaveProfile"> Save </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app-bar>
</template>
