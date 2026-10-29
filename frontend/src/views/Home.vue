<script setup>
import { computed } from "vue";
import { useRoles } from "../composables/useRoles.js";
import PageShell from "../components/layout/PageShell.vue";

const { user } = useRoles();
const firstName = computed(() => user.value?.firstName ?? "");
</script>

<template>
  <PageShell :title="firstName ? `Welcome, ${firstName}` : 'Welcome'" />
</template>
