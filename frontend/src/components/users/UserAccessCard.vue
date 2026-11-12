<script setup>
import { computed, ref, watch } from "vue";
import userServices from "../../services/userServices.js";
import { useRequest } from "../../composables/useRequest.js";
import SectionCard from "../layout/SectionCard.vue";
import { areaRoleOptions, roleKey, systemRoleOptions, toRolesPayload } from "../../models/users.js";

const SELF_ADMIN_MESSAGE = "You cannot remove your own admin role.";

const props = defineProps({
  user: { type: Object, required: true },
  areas: { type: Array, default: () => [] },
  isSelf: Boolean,
});

const emit = defineEmits(["saved"]);

const savedKeys = computed(() => props.user.roles.map(roleKey).sort());
const selected = ref([...savedKeys.value]);
const saved = ref(false);

const {
  data: savedUser,
  loading: saving,
  error: saveError,
  run: updateRoles,
} = useRequest(userServices.updateUserRoles, { fallback: "Failed to save roles." });

const areaOptions = computed(() => areaRoleOptions(props.areas, props.user));
const dirty = computed(() => [...selected.value].sort().join() !== savedKeys.value.join());

// A fresh user (after save or navigation) resets the checkboxes.
watch(savedKeys, (keys) => {
  selected.value = [...keys];
});

watch(selected, () => {
  if (dirty.value) saved.value = false;
});

const cancel = () => {
  selected.value = [...savedKeys.value];
  saveError.value = "";
};

// The Admin checkbox is disabled on your own page; the API also refuses self-demotion (400).
const save = async () => {
  saved.value = false;
  if (await updateRoles(props.user.id, toRolesPayload(selected.value))) {
    emit("saved", savedUser.value);
    saved.value = true;
  }
};
</script>

<template>
  <SectionCard title="Access" subtitle="Every user can request vehicles. Roles grant access to manage the rest of the system.">
    <div role="group" aria-labelledby="access-system-roles">
      <div id="access-system-roles" class="text-label-large font-weight-bold mb-1">System roles</div>
      <v-checkbox
        v-for="option in systemRoleOptions"
        :key="option.value"
        v-model="selected"
        :value="option.value"
        :label="option.title"
        :disabled="isSelf && option.value === 'admin'"
        :messages="isSelf && option.value === 'admin' ? SELF_ADMIN_MESSAGE : undefined"
        color="primary"
        density="compact"
        hide-details="auto"
      />
    </div>

    <div role="group" aria-labelledby="access-area-roles" class="mt-6">
      <div id="access-area-roles" class="text-label-large font-weight-bold mb-1">Area admin of</div>
      <v-checkbox
        v-for="option in areaOptions"
        :key="option.value"
        v-model="selected"
        :value="option.value"
        :label="option.title"
        color="primary"
        density="compact"
        hide-details
      />
      <p v-if="!areaOptions.length" class="text-body-medium text-medium-emphasis mb-0">
        Area Admin roles appear here once areas are created.
      </p>
    </div>

    <v-alert v-if="saveError" type="error" density="compact" class="mt-4">{{ saveError }}</v-alert>
    <v-alert v-else-if="saved" type="success" density="compact" class="mt-4">Roles saved.</v-alert>

    <template #actions>
      <v-btn color="secondary" variant="text" :disabled="!dirty || saving" @click="cancel">Cancel</v-btn>
      <v-btn color="primary" variant="elevated" class="oc-cta" :disabled="!dirty" :loading="saving" @click="save">
        Save
      </v-btn>
    </template>
  </SectionCard>
</template>
