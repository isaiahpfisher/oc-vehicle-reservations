<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import { readRedirectIdToken, startGoogleSignIn } from "../services/googleAuth.js";
import Utils from "../config/utils.js";
import { useRequest } from "../composables/useRequest.js";

const router = useRouter();
const { data, loading, error, run } = useRequest(authServices.loginUser, { fallback: "Login failed." });

// Feature 3 FR-015: developer sign-in, rendered only in development builds.
const showDevLogin = import.meta.env.DEV;
const devEmail = ref("");
const devPassword = ref("");
const {
  data: devUser,
  loading: devLoading,
  error: devError,
  run: runDevLogin,
} = useRequest(authServices.devLogin, { fallback: "Login failed." });

const storeAndGoHome = async (user) => {
  Utils.setStore("user", user);
  window.dispatchEvent(new CustomEvent("user-logged-in"));
  await router.push({ name: "home" });
};

const finish = async (credential) => {
  if (await run({ googleCredentials: credential })) {
    await storeAndGoHome(data.value);
  }
};

const devSignIn = async () => {
  if (await runDevLogin({ email: devEmail.value, password: devPassword.value })) {
    await storeAndGoHome(devUser.value);
  }
};

const signIn = async () => {
  const credential = await startGoogleSignIn();
  if (credential) {
    await finish(credential);
  }
};

onMounted(async () => {
  const credential = readRedirectIdToken();
  if (credential) {
    await finish(credential);
  }
});
</script>

<template>
  <div class="auth-split">
    <div class="auth-brand bg-primary" />

    <div class="auth-copy auth-copy-brand">
      <div class="text-headline-medium text-white font-weight-bold mb-3">Vehicle Registration System</div>
      <p class="text-body-large text-white mb-0">Sign in with your OC Google account to reserve a vehicle.</p>
    </div>

    <div class="auth-copy auth-copy-form">
      <div class="text-headline-medium text-primary font-weight-bold mb-3">Log in with Google</div>
      <p class="text-body-large mb-8">Use your @oc.edu or @eagles.oc.edu account. No separate password is required.</p>

      <v-alert v-if="error" type="error" class="mb-6">
        {{ error }}
      </v-alert>

      <v-btn
        color="primary"
        variant="elevated"
        size="large"
        block
        class="oc-cta"
        prepend-icon="mdi-google"
        :loading="loading"
        @click="signIn"
      >
        Log in with Google
      </v-btn>

      <section v-if="showDevLogin" aria-labelledby="dev-login-title" class="mt-10">
        <div class="d-flex align-center ga-3 mb-4">
          <v-divider />
          <span id="dev-login-title" class="text-label-large text-medium-emphasis text-no-wrap">Developer sign-in</span>
          <v-divider />
        </div>

        <v-alert v-if="devError" type="error" class="mb-4">{{ devError }}</v-alert>

        <v-form @submit.prevent="devSignIn">
          <v-text-field v-model="devEmail" label="Email" type="email" autocomplete="username" />
          <v-text-field v-model="devPassword" label="Password" type="password" autocomplete="current-password" />
          <v-btn type="submit" color="primary" variant="outlined" block :loading="devLoading">Sign in</v-btn>
        </v-form>

        <p class="text-body-small text-medium-emphasis mt-3 mb-0">
          Development only. Needs <code>DEV_LOGIN=true</code> on the server. Seeded accounts use the password
          <code>password</code>.
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.auth-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr auto 1fr;
  min-height: 100vh;
}

.auth-brand {
  grid-column: 1;
  grid-row: 1 / -1;
}

.auth-copy {
  width: min(420px, calc(100% - 96px));
  justify-self: center;
}

.auth-copy-brand {
  grid-column: 1;
  grid-row: 2;
}

.auth-copy-form {
  grid-column: 2;
  grid-row: 2;
}

@media (max-width: 959px) {
  .auth-split {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .auth-brand {
    grid-row: 1;
    min-height: 280px;
  }

  .auth-copy-brand {
    grid-row: 1;
    align-self: center;
  }

  .auth-copy-form {
    grid-column: 1;
    grid-row: 2;
    padding: 48px 0;
  }
}
</style>
