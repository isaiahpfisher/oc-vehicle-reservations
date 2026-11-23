<script setup>
import { computed, ref, watch } from "vue";
import { useNoticeStore } from "../stores/notice.js";
import { useRouter } from "vue-router";
import destinationServices from "../services/destinationServices.js";
import placeServices from "../services/placeServices.js";
import { useRequest } from "../composables/useRequest.js";
import { useUnsavedChanges } from "../composables/useUnsavedChanges.js";
import AddressSearchField from "../components/common/AddressSearchField.vue";
import FormSection from "../components/layout/FormSection.vue";
import PageShell from "../components/layout/PageShell.vue";
import MoreActionsMenu from "../components/common/MoreActionsMenu.vue";
import { useConfirm } from "../composables/useConfirm.js";
import SectionCard from "../components/layout/SectionCard.vue";
import RequestStatusChip from "../components/requests/RequestStatusChip.vue";
import { formatTripDates, personName } from "../models/requests.js";

// UI/UX backlog #48: the app-wide success toast.
const { notify } = useNoticeStore();
const props = defineProps({
  /** The destination being edited; none on the create route. */
  id: { type: [String, Number], default: null },
});

const router = useRouter();
const formRef = ref(null);
const searchRef = ref(null);

const blank = () => ({
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  milesFromCampus: "",
  isSaved: true,
});

const form = ref(blank());

/** UI/UX backlog #69: the trips that stop here (your areas only), newest first. */
const TRIPS_SHOWN = 10;
const {
  data: trips,
  loading: tripsLoading,
  error: tripsError,
  run: getTrips,
} = useRequest(destinationServices.getDestinationTrips, { initial: [], fallback: "Couldn't load the trips." });
// UI/UX backlog #31: ask before leaving with unsaved changes. `baseline` is the form as loaded.
const baseline = ref("");
const snapshot = () => {
  baseline.value = JSON.stringify(form.value);
};
const dirty = computed(() => baseline.value !== "" && JSON.stringify(form.value) !== baseline.value);
const { allowLeave } = useUnsavedChanges(dirty);


const {
  data: destination,
  loading,
  error: loadError,
  run: load,
} = useRequest(destinationServices.getDestinationById, { fallback: "Failed to load destination." });

const {
  loading: saving,
  error: saveError,
  run: saveDestination,
} = useRequest(
  (payload) =>
    props.id ? destinationServices.updateDestination(props.id, payload) : destinationServices.createDestination(payload),
  { fallback: "Failed to save destination." },
);

const title = computed(() => {
  if (!props.id) return "New Destination";
  return destination.value?.name ?? "";
});

const breadcrumbs = computed(() => [
  { title: "Destinations", to: { name: "destinations" } },
  { title: title.value || "Destination", disabled: true },
]);

// Feature 8, FR-010: picking an address also looks up its driving distance from campus.
const milesFromGoogle = ref(false);
const {
  data: lookedUpMiles,
  loading: milesLoading,
  error: milesError,
  run: lookUpMiles,
} = useRequest(placeServices.getMilesFromCampus, {
  select: (res) => res.data.milesFromCampus,
  fallback: "Couldn't look up the distance. Enter it yourself.",
});
let latestLookup = 0;

const fillFromSearch = async ({ placeId, name, addressLine1, addressLine2, city, state, zipCode }) => {
  form.value = {
    ...form.value,
    name: form.value.name.trim() || name,
    addressLine1,
    addressLine2: addressLine2 ?? "",
    city,
    state,
    zipCode: zipCode ?? "",
  };

  const lookup = ++latestLookup;
  milesFromGoogle.value = false;
  const found = await lookUpMiles(placeId);
  // Ignore an answer for an address the user has since replaced, or a destination they've moved on from.
  if (found && lookup === latestLookup) {
    form.value = { ...form.value, milesFromCampus: lookedUpMiles.value };
    milesFromGoogle.value = true;
  }
};

const milesMessages = computed(() => {
  if (milesError.value) return milesError.value;
  return milesFromGoogle.value ? "From Google Maps, one way. You can change it." : "";
});

const required = (value) => !!String(value ?? "").trim() || "Required field.";
const maxLength = (label) => (value) => String(value ?? "").trim().length <= 255 || `${label} too long.`;
const wholeMiles = (value) =>
  /^\d*$/.test(String(value ?? "").trim()) || "Miles from campus must be a whole number of 0 or more.";

const optional = (value) => value.trim() || null;

const toPayload = (values) => {
  const miles = String(values.milesFromCampus ?? "").trim();
  return {
    name: values.name.trim(),
    address_line_1: values.addressLine1.trim(),
    address_line_2: optional(values.addressLine2),
    city: values.city.trim(),
    state: values.state.trim(),
    zip_code: optional(values.zipCode),
    is_saved: values.isSaved,
    miles_from_campus: miles ? Number(miles) : null,
  };
};

const toForm = (saved) => ({
  name: saved.name ?? "",
  addressLine1: saved.address_line_1 ?? "",
  addressLine2: saved.address_line_2 ?? "",
  city: saved.city ?? "",
  state: saved.state ?? "",
  zipCode: saved.zip_code ?? "",
  milesFromCampus: saved.miles_from_campus ?? "",
  isSaved: saved.is_saved !== false,
});

const save = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  if (await saveDestination(toPayload(form.value))) {
    notify(props.id ? "Destination saved." : "Destination created.");
    allowLeave();
    await router.push({ name: "destinations" });
  }
};

const cancel = () => {
  allowLeave();
  router.push({ name: "destinations" });
};

watch(
  () => props.id,
  async (id) => {
    latestLookup += 1;
    searchRef.value?.reset();
    milesFromGoogle.value = false;
    milesError.value = "";

    if (!id) {
      destination.value = null;
      form.value = blank();
      snapshot();
      return;
    }

    if (await load(id)) {
      form.value = toForm(destination.value);
      snapshot();
      getTrips(id);
    }
  },
  { immediate: true },
);

/** UI/UX backlog #36: delete lives in the page's ⋮ menu, not on every list row. */
const confirmDelete = useConfirm();
const deleteDestination = async () => {
  const deleted = await confirmDelete({
    title: "Delete destination",
    message: `Delete "${title.value}"? This action is permanent.`,
    confirmText: "Delete",
    confirmColor: "error",
    onConfirm: () => destinationServices.removeDestination(props.id),
  });

  if (deleted) {
    notify("Destination deleted.");
    allowLeave();
    await router.push({ name: "destinations" });
  }
};
</script>

<template>
  <PageShell
    :title
    subtitle="Where it is, how far it is from campus, and whether requests can choose it."
    :breadcrumbs
    :loading
    :error="loadError"
    :max-width="1040"
    centered
  >
    <template v-if="id" #actions>
      <MoreActionsMenu>
        <v-list-item
          prepend-icon="mdi-delete-outline"
          title="Delete destination"
          base-color="error"
          data-test="delete-destination"
          @click="deleteDestination"
        />
      </MoreActionsMenu>
    </template>

    <v-form ref="formRef" @submit.prevent="save">
      <FormSection
        title="Find on Google Maps"
        subtitle="Pick a place to fill in its name, address, and distance from campus. You can change anything after."
      >
        <AddressSearchField ref="searchRef" hint="" hide-details="auto" variant="filled" @select="fillFromSearch" />
      </FormSection>

      <FormSection title="Name" subtitle="How the destination appears in the destinations list and on vehicle requests.">
        <v-text-field v-model="form.name" hide-details="auto" label="Name" :rules="[required, maxLength('Name')]" />
      </FormSection>

      <FormSection title="Address" subtitle="Where drivers are headed.">
        <v-row density="comfortable">
          <v-col cols="12">
            <v-text-field
              v-model="form.addressLine1"
              hide-details="auto"
              label="Address line 1"
              :rules="[required, maxLength('Address line 1')]"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.addressLine2"
              hide-details="auto"
              label="Address line 2"
              placeholder="Apt, suite, building (optional)"
              :rules="[maxLength('Address line 2')]"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="form.city" hide-details="auto" label="City" :rules="[required, maxLength('City')]" />
          </v-col>
          <v-col cols="6" sm="3">
            <v-text-field v-model="form.state" hide-details="auto" label="State" :rules="[required, maxLength('State')]" />
          </v-col>
          <v-col cols="6" sm="3">
            <v-text-field
              v-model="form.zipCode"
              hide-details="auto"
              label="ZIP code"
              :rules="[maxLength('ZIP code')]"
            />
          </v-col>
        </v-row>
      </FormSection>

      <FormSection
        title="Distance"
        subtitle="Optional. One-way driving miles from campus, used to estimate a trip's mileage when Google can't."
      >
        <v-row density="comfortable">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.milesFromCampus"
              hide-details="auto"
              label="Miles from campus"
              inputmode="numeric"
              suffix="mi"
              :loading="milesLoading"
              :messages="milesMessages"
              :rules="[wholeMiles]"
            />
          </v-col>
        </v-row>
      </FormSection>

      <FormSection
        title="Availability"
        subtitle="Official destinations can be chosen on vehicle requests. Custom stops from requests start unofficial."
      >
        <v-switch v-model="form.isSaved" label="Official" color="primary" hide-details inset />
      </FormSection>

      <v-divider />
      <v-alert v-if="saveError" type="error" density="compact" class="mt-6">{{ saveError }}</v-alert>
      <div class="d-flex justify-end ga-2 pt-6">
        <v-btn color="secondary" variant="text" :disabled="saving" @click="cancel">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" type="submit" :loading="saving">Save</v-btn>
      </div>
    </v-form>

    <SectionCard
      v-if="id"
      title="Trips"
      :subtitle="trips.length ? (trips.length === 1 ? '1 trip stops here.' : `${trips.length} trips stop here.`) : ''"
      class="mt-8"
      data-test="destination-trips"
    >
      <v-skeleton-loader v-if="tripsLoading && !trips.length" type="list-item-two-line@2" />
      <v-alert v-else-if="tripsError" type="error" density="compact">{{ tripsError }}</v-alert>
      <p v-else-if="!trips.length" class="text-body-medium text-medium-emphasis mb-0">No trips in your areas stop here yet.</p>
      <v-list v-else density="compact" class="py-0 bg-transparent">
        <v-list-item
          v-for="trip in trips.slice(0, TRIPS_SHOWN)"
          :key="trip.id"
          :to="{ name: 'request', params: { requestId: trip.id } }"
          :subtitle="`${formatTripDates(trip)} · ${trip.area?.name ?? ''} · ${personName(trip.user)}`"
          class="trip-row px-0"
        >
          <v-list-item-title class="text-truncate" :title="trip.purpose">{{ trip.purpose }}</v-list-item-title>
          <template #append><RequestStatusChip :status="trip.status" /></template>
        </v-list-item>
      </v-list>
      <div v-if="trips.length > TRIPS_SHOWN" class="text-body-small text-medium-emphasis mt-2">
        Showing the latest {{ TRIPS_SHOWN }} of {{ trips.length }}.
      </div>
    </SectionCard>
  </PageShell>
</template>

<style scoped>
.trip-row + .trip-row {
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
