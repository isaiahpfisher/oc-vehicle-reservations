<script setup>
const open = defineModel({ type: Boolean, default: false });

defineProps({
  title: { type: String, default: "Are you sure?" },
  message: String,
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
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <slot>{{ message }}</slot>
        <v-alert v-if="error" type="error" density="compact" class="mt-2">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="cancel">{{ cancelText }}</v-btn>
        <v-btn :color="confirmColor" variant="elevated" class="oc-cta" :loading="loading" @click="emit('confirm')">
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
