<script setup>
const open = defineModel({ type: Boolean, default: false });

defineProps({
  title: { type: String, default: "Are you sure?" },
  message: String,
  /** Optional list under the message, e.g. the trips a change affects (Feature 18, US-18.12). */
  items: { type: Array, default: () => [] },
  confirmText: { type: String, default: "Confirm" },
  cancelText: { type: String, default: "Cancel" },
  confirmColor: { type: String, default: "primary" },
  loading: Boolean,
  error: String,
  maxWidth: { type: [String, Number], default: 420 },
});

const emit = defineEmits(["confirm", "cancel"]);
const cancel = () => {
  open.value = false;
  emit("cancel");
};
</script>

<template>
  <v-dialog v-model="open" :max-width="maxWidth" :persistent="loading">
    <v-card rounded="lg">
      <v-card-title class="px-6 pt-5 font-weight-bold">{{ title }}</v-card-title>
      <v-card-text class="px-6">
        <slot>{{ message }}</slot>
        <ul v-if="items.length" class="confirm-items mt-3" data-test="confirm-items">
          <li v-for="item in items" :key="item">{{ item }}</li>
        </ul>
        <v-alert v-if="error" type="error" density="compact" class="mt-2">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn color="secondary" variant="text" :disabled="loading" @click="cancel">{{ cancelText }}</v-btn>
        <v-btn :color="confirmColor" variant="elevated" class="oc-cta" :loading="loading" @click="emit('confirm')">
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.confirm-items {
  padding-left: 20px;
}
</style>
