<script setup>
const props = defineProps({
  courseListing: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
});

const emit = defineEmits(["delete"]);

</script>
<template>
  <v-card>
    <v-card-item>
      <v-card-title>{{ courseListing.courseName }}</v-card-title>

      <v-card-subtitle> {{ courseListing.sectionId }} </v-card-subtitle>

      <template v-slot:append v-if="canManage">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              v-bind="props"
              density="compact"
              aria-label="Enrollment actions"
            ></v-btn>
          </template>

          <v-list>
              <v-list-item
              title="Unenroll"
              prepend-icon="mdi-trash-can"
              density="compact"
              @click="emit('delete', courseListing)"
            />
          </v-list>
        </v-menu>
      </template>
    </v-card-item>

    <div class="px-4 my-2">
      <div class="d-flex gc-2">
        <v-chip color="primary">{{ courseListing.creditHours }} hours</v-chip>

        <v-chip color="blue">{{ courseListing.frequency }}</v-chip>

        <v-chip color="green">{{ courseListing.startTime }} - {{ courseListing.endTime }}</v-chip>
      </div>
    </div>
  </v-card>
</template>
