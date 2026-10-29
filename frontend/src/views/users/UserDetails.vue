<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import userServices from "../../services/userServices.js";
import areaServices from "../../services/areaServices.js";
import { useDeleteUser } from "../../composables/useDeleteUser.js";
import { useRequest } from "../../composables/useRequest.js";
import { useAuthStore } from "../../stores/auth.js";
import UserAccessCard from "../../components/users/UserAccessCard.vue";
import ComingSoon from "../../components/common/ComingSoon.vue";
import PageShell from "../../components/layout/PageShell.vue";
import DetailLayout from "../../components/layout/DetailLayout.vue";
import DetailHeader from "../../components/layout/DetailHeader.vue";
import SectionCard from "../../components/layout/SectionCard.vue";
import { fullName, initials, memberSince, roleLabel, sortRolesForDisplay } from "../../models/users.js";

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
const tab = ref("requests");

const userId = computed(() => Number(props.id));
const isSelf = computed(() => userId.value === auth.user?.userId);
const name = computed(() => (user.value ? fullName(user.value) : "User"));
const isMaintenance = computed(() => user.value?.roles.some((role) => role.role === "maintenance") ?? false);

const breadcrumbs = computed(() => [
  { title: "Users", to: { name: "users" } },
  { title: name.value, disabled: true },
]);

// Placeholders for later features (see "Delivered to later features" in the Feature 3 spec).
const tabs = computed(() => [
  { value: "requests", title: "Requests", icon: "mdi-car-outline", text: "This user's vehicle requests and the trips they drive will show here." },
  { value: "issues", title: "Issue reports", icon: "mdi-alert-circle-outline", text: "Issue reports this user filed or is assigned to will show here." },
  ...(isMaintenance.value
    ? [{ value: "maintenance", title: "Maintenance", icon: "mdi-wrench-outline", text: "Maintenance needs, service logs, and odometer readings for this user will show here." }]
    : []),
]);

const onRolesSaved = (updated) => {
  user.value = { ...user.value, roles: updated.roles };
  if (isSelf.value) auth.setRoles(updated.roles);
};

// Keep the selected tab valid when the Maintenance tab disappears.
watch(tabs, (list) => {
  if (!list.some((item) => item.value === tab.value)) tab.value = list[0].value;
});

const confirmDeleteUser = useDeleteUser();

const deleteUser = async () => {
  if (await confirmDeleteUser(user.value)) {
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
          <ComingSoon compact icon="mdi-card-account-details-outline" text="Driver status and license details." />
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

      <!-- What they've done (filled in by later features) -->
      <v-card>
        <v-tabs v-model="tab" color="primary" class="px-2">
          <v-tab v-for="item in tabs" :key="item.value" :value="item.value" :prepend-icon="item.icon">
            {{ item.title }}
          </v-tab>
        </v-tabs>
        <v-divider />
        <v-tabs-window v-model="tab">
          <v-tabs-window-item v-for="item in tabs" :key="item.value" :value="item.value">
            <ComingSoon :icon="item.icon" :text="item.text" />
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card>
    </DetailLayout>
  </PageShell>
</template>
