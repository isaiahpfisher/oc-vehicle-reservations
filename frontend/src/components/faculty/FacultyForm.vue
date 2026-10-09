<script setup>
import { ref } from "vue";
import { DEPARTMENTS } from "../../models/courses.js";

const form = defineModel({ type: Object, required: true });

const required = (label) => (v) =>
  (Array.isArray(v) ? v.length > 0 : !!String(v ?? "").trim()) || `${label} is required.`;

const oneOf = (options, label) => (v) =>
  [v].flat().every((x) => options.includes(x)) || `${label} must be one of ${options.join(", ")}.`;

const rules = {
  firstName: [required("firstName"), (v) => v?.trim().length <= 255 || "First name must be 255 characters or fewer."],
  lastName: [required("lastName"), (v) => v?.trim().length <= 255 || "Last name must be 255 characters or fewer."],
  department: [required("Department"), oneOf(DEPARTMENTS, "Department")],
};
</script>

<template>
  <v-defaults-provider :defaults="{ global: { density: 'comfortable' } }">
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field v-model="form.firstName" label="First Name" counter="255" :rules="rules.firstName" />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field v-model="form.lastName" label="Last Name" counter="255" :rules="rules.lastName" />
      </v-col>
      <v-col cols="12" md="6">
        <v-select v-model="form.department" label="Department" :items="DEPARTMENTS" :rules="rules.department" />
      </v-col>
    </v-row>
  </v-defaults-provider>
</template>