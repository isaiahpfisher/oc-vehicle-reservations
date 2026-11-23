<script setup>
import { computed, watch } from "vue";
import { useNoticeStore } from "../../stores/notice.js";
import { useRouter } from "vue-router";
import userServices from "../../services/userServices.js";
import areaServices from "../../services/areaServices.js";
import { useDeleteUser } from "../../composables/useDeleteUser.js";
import { useRequest } from "../../composables/useRequest.js";
import { useAuthStore } from "../../stores/auth.js";
import UserAccessCard from "../../components/users/UserAccessCard.vue";
import UserActivity from "../../components/users/UserActivity.vue";
import PageShell from "../../components/layout/PageShell.vue";
import DetailLayout from "../../components/layout/DetailLayout.vue";
import DetailHeader from "../../components/layout/DetailHeader.vue";
import SectionCard from "../../components/layout/SectionCard.vue";
import { driverStatusLabel } from "../../models/drivers.js";
import { fullName, initials, memberSince, roleLabel, sortRolesForDisplay } from "../../models/users.js";

// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const props = defineProps({
  id: { type: [String, Number], required: true },
});

const router = useRouter();
const auth = useAuthStore();

const { data: user, loading: userLoading, error: userError, run: loadUser } = useRequest(userServices.getUser, {
  fallback: "Failed to load user.",
});
const { data: areas, loading: areasLoading, error: areasError, run: loadAreas } = useRequest(areaServices.getAreas, {
  initial: [],
  fallback: "Failed to load areas.",
});
const loading = computed(() => userLoading.value || areasLoading.value);
const loadError = computed(() => userError.value || areasError.value);

const userId = computed(() => Number(props.id));
const isSelf = computed(() => userId.value === auth.user?.userId);
const name = computed(() => (user.value ? fullName(user.value) : "User"));

const breadcrumbs = computed(() => [
  { title: "Users", to: { name: "users" } },
  { title: name.value, disabled: true },
]);

const driverRows = computed(() => {
  const driver = user.value?.driver;
  if (!driver) return [];

  return [
    { label: "Status", value: driverStatusLabel(driver.status) },
    { label: "License state", value: driver.licenseState },
    { label: "License expiration", value: driver.licenseExpirationDate },
    { label: "Phone number", value: driver.phoneNumber },
  ];
});

const onRolesSaved = (updated) => {
  user.value = { ...user.value, roles: updated.roles };
  if (isSelf.value) auth.setRoles(updated.roles);
};

const confirmDeleteUser = useDeleteUser();

const deleteUser = async () => {
  if (await confirmDeleteUser(user.value)) {
    notify("User deleted.");
    await router.push({ name: "users" });
  }
};

watch(userId, (id) => Promise.all([loadUser(id), loadAreas()]), { immediate: true });
</script>

<template>
  <PageShell :breadcrumbs :loading :error="loadError">
    <template #loading>
      <DetailLayout>
        <template #header>
          <v-card><v-skeleton-loader type="list-item-avatar-three-line" /></v-card>
        </template>
        <template #aside>
          <v-card><v-skeleton-loader type="article, actions" /></v-card>
        </template>
        <v-card><v-skeleton-loader type="heading, paragraph" /></v-card>
      </DetailLayout>
    </template>

    <DetailLayout>
      <!-- Who this is (name and email come from Google, read-only) -->
      <template #header>
        <DetailHeader
          :title="name"
          :subtitle="user.email"
          :meta="`Member since ${memberSince(user.createdAt)}`"
          :initials="initials(user)"
        >
          <template #append>
            <v-chip v-for="role in sortRolesForDisplay(user.roles)" :key="role.id" size="small" color="primary" variant="tonal">
              {{ roleLabel(role) }}
            </v-chip>
            <v-chip v-if="!user.roles.length" size="small" variant="outlined">Requester</v-chip>
          </template>
        </DetailHeader>
      </template>

      <!-- What they can do -->
      <template #aside>
        <UserAccessCard :user :areas :is-self="isSelf" @saved="onRolesSaved" />

        <SectionCard title="Driver">
          <div v-if="user.driver" class="d-flex flex-column ga-2 text-body-medium">
            <div v-for="row in driverRows" :key="row.label" class="d-flex justify-space-between ga-4">
              <span class="text-medium-emphasis">{{ row.label }}</span>
              <span>{{ row.value }}</span>
            </div>
          </div>
          <div v-else class="text-body-medium text-medium-emphasis">No linked driver.</div>
        </SectionCard>

        <SectionCard
          title="Account"
          subtitle="Deleting removes this user's roles and sessions. Signing in with Google again creates a new account."
        >
          <v-btn color="error" variant="outlined" prepend-icon="mdi-delete-outline" :disabled="isSelf" @click="deleteUser">
            Delete user
          </v-btn>
          <div v-if="isSelf" class="text-body-small text-medium-emphasis mt-2">You cannot delete yourself.</div>
        </SectionCard>
      </template>

      <!-- What they've done (UI/UX backlog #13 replaced the "Coming soon" tabs) -->
      <UserActivity :person="user" :self="isSelf" />
    </DetailLayout>
  </PageShell>
</template>
