import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import "./index.js";

/** localStorage key that keeps the session across reloads (Feature 1). */
export const STORAGE_KEY = "user";

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

const save = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * The signed-in user: the login response `{ userId, email, firstName, lastName, roles, token }`, or `null`.
 * Loaded from localStorage when the app starts and written back on every change.
 * Role checks live in `useRoles()`, which reads `roles` from here.
 */
export const useAuthStore = defineStore("auth", () => {
  const user = ref(load());

  watch(user, save, { deep: true, flush: "sync" });

  const isSignedIn = computed(() => user.value !== null);
  const token = computed(() => user.value?.token ?? null);
  const roles = computed(() => user.value?.roles ?? []);

  /** Store a login response (Google or developer sign-in). */
  const signIn = (payload) => {
    user.value = payload;
  };

  /** Forget the session on this device (sign out, or the server rejected the token). */
  const signOut = () => {
    user.value = null;
  };

  /** Replace the signed-in user's roles (page-load refresh, or an admin editing their own roles). */
  const setRoles = (next) => {
    if (user.value) {
      user.value = { ...user.value, roles: next };
    }
  };

  return { user, isSignedIn, token, roles, signIn, signOut, setRoles };
});
