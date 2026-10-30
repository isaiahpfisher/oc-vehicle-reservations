<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import userServices from "../../services/userServices.js";
import { useDeleteUser } from "../../composables/useDeleteUser.js";
import { useRequest } from "../../composables/useRequest.js";
import { useRoles } from "../../composables/useRoles.js";
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

const ITEMS_PER_PAGE = 10;
// More roles than this collapse into a "+N" chip so the column can't squeeze name and email.
const VISIBLE_ROLE_CHIPS = 2;

const router = useRouter();
const { user: currentUser } = useRoles();
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

const isSelf = (user) => user.id === currentUser.value?.userId;

const viewUser = (user) => router.push({ name: "userDetails", params: { id: user.id } });

const confirmDeleteUser = useDeleteUser();

const deleteUser = async (user) => {
  if (await confirmDeleteUser(user)) {
    await getUsers();
  }
};

onMounted(getUsers);
</script>

<template>
  <PageShell title="User Management">
    <v-row>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="query"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search users by name..."
          aria-label="Search users"
          clearable
          @click:clear="query = ''"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="roleFilter" :items="filterOptions" label="Filter by role" clearable />
      </v-col>
    </v-row>

    <ListState
      :loading
      :error
      :empty="!users.length"
      :no-results="!filteredUsers.length"
      empty-title="No users yet."
      empty-icon="mdi-account-multiple-outline"
      no-results-title="No users match your search."
      no-results-text=""
    >
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="filteredUsers"
        :items-per-page="ITEMS_PER_PAGE"
        :items-per-page-options="[ITEMS_PER_PAGE]"
        item-value="id"
      >
        <template #[`item.name`]="{ item }">
          <router-link :to="{ name: 'userDetails', params: { id: item.id } }" class="text-primary font-weight-medium">
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
            <v-btn icon="mdi-eye-outline" size="small" variant="text" aria-label="View user" @click="viewUser(item)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Delete user"
              :disabled="isSelf(item)"
              @click="deleteUser(item)"
            />
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
