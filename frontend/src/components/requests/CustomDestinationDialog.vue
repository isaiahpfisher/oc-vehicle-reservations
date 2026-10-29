<script setup>
import { ref, watch } from "vue";

const open = defineModel({ type: Boolean, default: false });
const emit = defineEmits(["add"]);

const blank = () => ({ name: "", addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "" });
const form = ref(blank());
const formRef = ref(null);
const required = [(value) => !!value?.trim() || "Required field."];

watch(open, (isOpen) => {
  if (isOpen) {
    form.value = blank();
  }
});

const submit = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) {
    return;
  }

  emit("add", Object.fromEntries(Object.entries(form.value).map(([key, value]) => [key, value.trim()])));
  open.value = false;
};
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card rounded="lg" class="pa-2">
      <v-card-item>
        <v-card-title class="font-weight-bold">Add a custom address</v-card-title>
        <v-card-subtitle>For a place that isn't in the saved list.</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <v-defaults-provider :defaults="{ VTextField: { variant: 'outlined', hideDetails: 'auto' } }">
          <v-form ref="formRef" class="d-flex flex-column ga-4" @submit.prevent="submit">
            <v-text-field v-model="form.name" label="Place name" :rules="required" autofocus />
            <v-text-field v-model="form.addressLine1" label="Street address" />
            <v-text-field v-model="form.addressLine2" label="Apt, suite, building (optional)" />
            <div class="d-flex ga-3">
              <v-text-field v-model="form.city" label="City" :rules="required" class="flex-1-1-100" />
              <v-text-field v-model="form.state" label="State" :rules="required" class="state-field" />
              <v-text-field v-model="form.zipCode" label="ZIP" class="zip-field" />
            </div>
          </v-form>
        </v-defaults-provider>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn color="secondary" variant="text" class="oc-cta" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" data-test="add-custom-destination" @click="submit">
          Add stop
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.state-field {
  flex: 0 0 96px;
}

.zip-field {
  flex: 0 0 120px;
}
</style>
