<script setup>
/**
 * UI/UX backlog #13: every signed-in user's own profile — who they are, what they can do, their driver record, and
 * their activity. The API already lets anyone read their own user (`GET /users/:id`, Feature 3), driver included.
 */
import { computed, watch } from "vue";
import userServices from "../services/userServices.js";
import { useRequest } from "../composables/useRequest.js";
import { useRoles } from "../composables/useRoles.js";
import PageShell from "../components/layout/PageShell.vue";
import DetailLayout from "../components/layout/DetailLayout.vue";
import DetailHeader from "../components/layout/DetailHeader.vue";
import SectionCard from "../components/layout/SectionCard.vue";
import UserActivity from "../components/users/UserActivity.vue";
import { driverStatusColor, driverStatusLabel, isLicenseExpired } from "../models/drivers.js";
import { fullName, initials, memberSince, roleLabel, sortRolesForDisplay } from "../models/users.js";
import { formatDay } from "../models/vehicles.js";

const { user: signedIn } = useRoles();

const { data: user, loading, error, run: loadUser } = useRequest(userServices.getUser, {
  fallback: "Failed to load your profile.",
});

const driver = computed(() => user.value?.driver ?? null);

const driverRows = computed(() =>
  driver.value
    ? [
        { label: "License state", value: driver.value.licenseState },
        { label: "License expires", value: formatDay(driver.value.licenseExpirationDate) },
        { label: "Phone number", value: driver.value.phoneNumber },
      ]
    : [],
);

watch(() => signedIn.value?.userId, (id) => id && loadUser(id), { immediate: true });
</script>

<template>
  <PageShell :loading="loading && !user" :error>
    <DetailLayout v-if="user">
      <template #header>
        <DetailHeader
          :title="fullName(user)"
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

      <template #aside>
        <SectionCard
          title="Driver"
          :subtitle="driver ? 'Only approved drivers with a current license can be chosen for trips.' : ''"
          data-test="profile-driver"
        >
          <template v-if="driver">
            <div class="d-flex align-center justify-space-between ga-4 mb-2">
              <span class="text-medium-emphasis text-body-medium">Status</span>
              <v-chip :color="driverStatusColor(driver.status)" size="small" variant="tonal" label>
                {{ driverStatusLabel(driver.status) }}
              </v-chip>
            </div>
            <div v-for="row in driverRows" :key="row.label" class="d-flex justify-space-between ga-4 text-body-medium mb-2">
              <span class="text-medium-emphasis">{{ row.label }}</span>
              <span>{{ row.value }}</span>
            </div>
            <v-alert v-if="isLicenseExpired(driver)" type="warning" variant="tonal" density="compact" class="mt-2">
              Your license has expired, so you can't be chosen as a driver. Ask an area admin to update it.
            </v-alert>
          </template>
          <p v-else class="text-body-medium text-medium-emphasis mb-0">
            You're not set up as a driver. Ask an area admin to add you if you'll be driving on trips.
          </p>
        </SectionCard>
      </template>

      <UserActivity :person="user" self />
    </DetailLayout>
  </PageShell>
</template>
