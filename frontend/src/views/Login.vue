<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import { readRedirectIdToken, startGoogleSignIn } from "../services/googleAuth.js";
import { useRequest } from "../composables/useRequest.js";
import { useAuthStore } from "../stores/auth.js";
import { landingRoute, redirectTarget } from "../router.js";
import BrandMark from "../components/BrandMark.vue";

const router = useRouter();
const route = useRoute();
// UI/UX backlog #17: the axios client sends a signed-out user here with `?expired=1`.
const expired = computed(() => route.query.expired === "1");
const auth = useAuthStore();
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
  auth.signIn(user);
  // UI/UX backlog #17: back to the page they were on, if there was one; otherwise their landing page (#14).
  await router.push(redirectTarget(route.query.redirect) ?? landingRoute());
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
    <!-- The brand half: a faint winding road behind the app's mark, name, and what it's for. -->
    <div class="auth-brand bg-primary" aria-hidden="true">
      <svg class="auth-road" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <path class="auth-road__edge" d="M-60 820C140 760 160 600 320 560S560 600 640 440 600 160 860 80" />
        <path class="auth-road__edge auth-road__edge--far" d="M-60 900C180 840 220 680 360 640S620 680 720 500 700 240 900 150" />
        <path class="auth-road__line" d="M-60 860C160 800 190 640 340 600S590 640 680 470 650 200 880 115" />
      </svg>
    </div>

    <div class="auth-copy auth-copy-brand">
      <div class="d-flex align-center ga-3 mb-10">
        <BrandMark :size="52" inverse />
        <div class="text-white">
          <div class="text-title-large font-weight-bold">OC Vehicles</div>
          <div class="text-body-small auth-muted">Oklahoma Christian University</div>
        </div>
      </div>
      <div class="text-display-small text-white font-weight-bold mb-4 auth-headline">A university vehicle for every trip.</div>
      <p class="text-body-large text-white auth-muted mb-6 auth-detail">Reserve one, follow it to approval, and report problems, all in one place.</p>
      <ul class="auth-points auth-detail text-body-medium text-white">
        <li><v-icon icon="mdi-check-circle-outline" size="18" />Request a vehicle and see when it's approved</li>
        <li><v-icon icon="mdi-check-circle-outline" size="18" />Find pickup and return instructions on your trip</li>
        <li><v-icon icon="mdi-check-circle-outline" size="18" />Report an issue with a vehicle in a minute</li>
      </ul>
    </div>

    <div class="auth-copy auth-copy-form">
      <div class="text-headline-medium text-primary font-weight-bold mb-3">Sign in</div>
      <p class="text-body-large mb-8">Use your @oc.edu or @eagles.oc.edu account. No separate password is required.</p>

      <v-alert v-if="expired && !error" type="info" variant="tonal" class="mb-6" data-test="session-expired">
        Your session ended. Sign in again to pick up where you left off.
      </v-alert>

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
.auth-brand {
  position: relative;
  overflow: hidden;
}

.auth-road {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke-linecap: round;
}

.auth-road__edge {
  stroke: rgba(var(--v-theme-on-primary), 0.1);
  stroke-width: 3;
}

.auth-road__edge--far {
  stroke: rgba(var(--v-theme-on-primary), 0.06);
}

.auth-road__line {
  stroke: rgba(var(--v-theme-on-primary), 0.16);
  stroke-width: 3;
  stroke-dasharray: 18 22;
}

.auth-headline {
  line-height: 1.15;
}

.auth-muted {
  opacity: 0.85;
}

.auth-points {
  list-style: none;
  margin: 0;
  padding: 0;
}

.auth-points li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-points li + li {
  margin-top: 10px;
}

.auth-points .v-icon {
  opacity: 0.8;
}

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
  position: relative;
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
    padding: 40px 0;
  }

  .auth-copy-form {
    grid-column: 1;
    grid-row: 2;
    padding: 48px 0;
  }
}

/* Phones: a short brand band, so Sign in is on the first screen. */
@media (max-width: 600px) {
  .auth-brand {
    min-height: 0;
  }

  .auth-copy-brand .mb-10 {
    margin-bottom: 20px !important;
  }

  .auth-headline {
    font-size: 1.75rem !important;
    margin-bottom: 0 !important;
  }

  .auth-detail {
    display: none;
  }
}
</style>
