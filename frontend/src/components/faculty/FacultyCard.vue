<script setup>
const props = defineProps({
  faculty: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
});

const emit = defineEmits(["edit", "delete"]);
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title>{{ faculty.firstName }} {{ faculty.lastName }}</v-card-title>

      <v-card-subtitle>{{ faculty.department }}</v-card-subtitle>

      <template v-slot:append v-if="canManage">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              v-bind="props"
              density="compact"
              aria-label="Faculty actions"
            ></v-btn>
          </template>

          <v-list>
            <v-list-item title="Edit" prepend-icon="mdi-pencil" density="compact" @click="emit('edit', faculty)" />
            <v-list-item
              title="Delete"
              prepend-icon="mdi-trash-can"
              density="compact"
              @click="emit('delete', faculty)"
            />
          </v-list>
        </v-menu>
      </template>
    </v-card-item>
  </v-card>
</template>