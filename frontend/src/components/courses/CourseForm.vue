<script setup>
import { ref } from "vue";
import { DEPARTMENTS, FREQUENCIES, SEMESTERS } from "../../models/courses.js";

const form = defineModel({ type: Object, required: true });

const required = (label) => (v) =>
  (Array.isArray(v) ? v.length > 0 : !!String(v ?? "").trim()) || `${label} is required.`;

const oneOf = (options, label) => (v) =>
  [v].flat().every((x) => options.includes(x)) || `${label} must be one of ${options.join(", ")}.`;

const rules = {
  name: [required("Name"), (v) => v?.trim().length <= 255 || "Name must be 255 characters or fewer."],
  number: [
    required("Course number"),
    (v) => /^[A-Z]{4}-\d{4}$/.test(v) || "Number must be in the format XXXX-#### (ex. COMP-1234).",
  ],
  hours: [(v) => !v || (Number.isInteger(Number(v)) && Number(v) > 0) || "Hours must be a positive whole number."],
  department: [required("Department"), oneOf(DEPARTMENTS, "Department")],
  semesters: [required("Semesters offered"), oneOf(SEMESTERS, "Semesters offered")],
  frequency: [required("Frequency"), oneOf(FREQUENCIES, "Frequency")],
  description: [required("Description")],
};
</script>

<template>
  <v-defaults-provider :defaults="{ global: { density: 'comfortable' } }">
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field v-model="form.name" label="Name" counter="255" :rules="rules.name" />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          :model-value="form.number"
          label="Number"
          hint="e.g. COMP-1234"
          :rules="rules.number"
          @update:model-value="form.number = $event.toUpperCase()"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field v-model="form.hours" type="number" min="1" step="1" label="Credit Hours" :rules="rules.hours" />
      </v-col>
      <v-col cols="12" md="6">
        <v-select v-model="form.department" label="Department" :items="DEPARTMENTS" :rules="rules.department" />
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="form.semesters"
          label="Semesters Offered"
          :items="SEMESTERS"
          :rules="rules.semesters"
          chips
          multiple
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-select v-model="form.frequency" label="Frequency" :items="FREQUENCIES" :rules="rules.frequency" />
      </v-col>
      <v-col cols="12">
        <v-textarea v-model="form.description" label="Description" :rules="rules.description" />
      </v-col>
    </v-row>
  </v-defaults-provider>
</template>
