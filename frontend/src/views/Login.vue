<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import { readRedirectIdToken, startGoogleSignIn } from "../services/googleAuth.js";
import Utils from "../config/utils.js";
import { useRequest } from "../composables/useRequest.js";

const router = useRouter();
const { data, loading, error, run } = useRequest(authServices.loginUser, { fallback: "Login failed." });

const finish = async (credential) => {
  const result = await run({ googleCredentials: credential });
  if (!result) {
    return;
  }

  Utils.setStore("user", data.value);
  window.dispatchEvent(new CustomEvent("user-logged-in"));
  await router.push({ name: "home" });
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
      <div class="text-h4 text-white font-weight-bold mb-3">Vehicle Registration System</div>
      <p class="text-body-1 text-white mb-0">Sign in with your OC Google account to reserve a vehicle.</p>
    </div>

    <div class="auth-copy auth-copy-form">
      <div class="text-h4 text-primary font-weight-bold mb-3">Log in with Google</div>
      <p class="text-body-1 mb-8">Use your @oc.edu or @eagles.oc.edu account. No separate password is required.</p>

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
    padding: 40px 0;
  }
}
</style>
