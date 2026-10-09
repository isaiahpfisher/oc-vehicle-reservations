<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";
import { useRequest } from "../composables/useRequest.js";

const router = useRouter();
const form = ref(null);
const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const firstNameRules = [(value) => !!value?.trim() || "First name is required."];
const lastNameRules = [(value) => !!value?.trim() || "Last name is required."];
const passwordRules = [
  (value) => !!value || "Password is required.",
  (value) => value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = [
  (value) => !!value || "Password is required.",
  (value) => value === password.value || "Passwords do not match.",
];

const { data, loading, error, run } = useRequest(authServices.registerUser, { fallback: "Registration failed." });

const submit = async () => {
  const { valid } = await form.value.validate();
  if (!valid) return;

  const credentials = {
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    email: email.value.trim(),
    password: password.value,
  };

  const result = await run(credentials);
  if (!result) return;

  Utils.setStore("user", data.value);
  window.dispatchEvent(new CustomEvent("user-logged-in"));
  await router.push({ name: "home" });
};
</script>

<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12" sm="10" md="7" lg="5">
        <v-card elevation="2">
          <v-card-title class="text-h5">Create account</v-card-title>

          <v-card-text>
            <v-form ref="form" @submit.prevent="submit">
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
                    label="Password"
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
              </v-row>

              <v-alert v-if="error" type="error" density="compact" class="mb-4">
                {{ error }}
              </v-alert>

              <v-btn type="submit" color="primary" variant="elevated" block :loading="loading"> Create account </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" :to="{ name: 'login' }"> Already have an account? Sign in </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
