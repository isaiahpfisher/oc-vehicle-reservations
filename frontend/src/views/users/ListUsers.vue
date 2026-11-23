<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { PAGE_SIZES } from "../../utils/lists.js";
import { useRouter } from "vue-router";
import userServices from "../../services/userServices.js";
import { useRequest } from "../../composables/useRequest.js";
import ListState from "../../components/common/ListState.vue";
import PageShell from "../../components/layout/PageShell.vue";
import {
  ROLE_LABELS,
  fullName,
  roleKey,
  roleLabel,
  sortRolesForDisplay,
  userHasRoleKey,
  userMatchesQuery,
} from "../../models/users.js";

// More roles than this collapse into a "+N" chip so the column can't squeeze name and email.
const VISIBLE_ROLE_CHIPS = 2;

const router = useRouter();
const query = ref("");
const roleFilter = ref(null);
const page = ref(1);

const {
  data: users,
  loading,
  error,
  run: getUsers,
} = useRequest(userServices.getUsers, { initial: [], fallback: "Failed to fetch users." });

const headers = [
  { title: "Name", key: "name", sortable: false, nowrap: true },
  { title: "Email", key: "email", sortable: false, nowrap: true },
  { title: "Roles", key: "roles", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end", nowrap: true },
];

// Admin and Maintenance always; Area Admin options for each area someone administers.
const filterOptions = computed(() => {
  const options = new Map([
    ["admin", ROLE_LABELS.admin],
    ["maintenance", ROLE_LABELS.maintenance],
  ]);
  for (const user of users.value) {
    for (const role of user.roles) {
      options.set(roleKey(role), roleLabel(role));
    }
  }
  return [...options].map(([value, title]) => ({ value, title }));
});

const filteredUsers = computed(() =>
  users.value
    .filter((user) => userMatchesQuery(user, query.value) && userHasRoleKey(user, roleFilter.value))
    .map((user) => {
      const roles = sortRolesForDisplay(user.roles);
      return {
        ...user,
        name: fullName(user),
        visibleRoles: roles.slice(0, VISIBLE_ROLE_CHIPS),
        hiddenRoleLabels: roles.slice(VISIBLE_ROLE_CHIPS).map(roleLabel),
      };
    }),
);

watch([query, roleFilter], () => {
  page.value = 1;
});

const viewUser = (user) => router.push({ name: "userDetails", params: { id: user.id } });

onMounted(getUsers);
</script>

<template>
  <!-- UI/UX backlog #42: the page title matches its menu label. -->
  <PageShell title="Users">
    <div class="oc-list-toolbar">
      <v-text-field
        v-model="query"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search by name or email"
        aria-label="Search users"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="oc-list-search"
        @click:clear="query = ''"
      />
      <v-select
        v-model="roleFilter"
        :items="filterOptions"
        label="Role"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="oc-list-filter"
      />
    </div>

    <ListState
      :loading
      :error
      :empty="!users.length"
      :no-results="!filteredUsers.length"
      empty-title="No users yet"
      empty-text="People show up here after they first sign in with Google."
      empty-art="people"
      no-results-title="No users match your search."
      no-results-text=""
    >
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="filteredUsers"
        :items-per-page-options="PAGE_SIZES"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <router-link :to="{ name: 'userDetails', params: { id: item.id } }" class="oc-link font-weight-medium">
            {{ item.name }}
          </router-link>
        </template>

        <template #[`item.email`]="{ item }">
          <span class="users-email d-block text-truncate" :title="item.email">{{ item.email }}</span>
        </template>

        <template #[`item.roles`]="{ item }">
          <div class="d-flex flex-nowrap ga-1 py-2">
            <v-chip
              v-for="role in item.visibleRoles"
              :key="role.id"
              size="small"
              color="primary"
              variant="tonal"
              class="flex-shrink-0"
            >
              {{ roleLabel(role) }}
            </v-chip>
            <v-tooltip v-if="item.hiddenRoleLabels.length" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-chip
                  v-bind="tooltipProps"
                  size="small"
                  color="primary"
                  variant="outlined"
                  class="flex-shrink-0"
                  tabindex="0"
                  :aria-label="`${item.hiddenRoleLabels.length} more roles: ${item.hiddenRoleLabels.join(', ')}`"
                >
                  +{{ item.hiddenRoleLabels.length }}
                </v-chip>
              </template>
              <div v-for="label in item.hiddenRoleLabels" :key="label">{{ label }}</div>
            </v-tooltip>
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="View user" location="top">
              <template #activator="{ props: tooltip }">
                <v-btn v-bind="tooltip" icon="mdi-eye-outline" size="small" variant="text" aria-label="View user" @click="viewUser(item)" />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </ListState>
  </PageShell>
</template>

<style scoped>
.users-email {
  max-width: 18rem;
}
</style>
