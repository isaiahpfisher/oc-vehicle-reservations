<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";
import { useRequest } from "../composables/useRequest.js";

const router = useRouter();
const form = ref(null);
const email = ref("");
const password = ref("");

const passwordRules = [(value) => !!value || "Password is required."];

const { data, loading, error, run } = useRequest(authServices.loginUser, { fallback: "Login failed." });

const submit = async () => {
  const { valid } = await form.value.validate();
  if (!valid) return;

  const credentials = { email: email.value.trim(), password: password.value };

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
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card elevation="2">
          <v-card-title class="text-h5">Sign in</v-card-title>

          <v-card-text>
            <v-form ref="form" @submit.prevent="submit">
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                density="comfortable"
                autocomplete="email"
                :rules="emailRules"
                class="mb-2"
              />

              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                density="comfortable"
                autocomplete="current-password"
                :rules="passwordRules"
                class="mb-2"
              />

              <v-alert v-if="error" type="error" density="compact" class="mb-4">
                {{ error }}
              </v-alert>

              <v-btn type="submit" color="primary" variant="elevated" block :loading="loading"> Sign in </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" :to="{ name: 'register' }"> Create an account </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
