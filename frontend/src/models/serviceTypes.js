const optionalFrequency = (value) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return { value: null };
  }

  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return { message: "Must be a positive whole number." };
  }

  return { value: Number(text) };
};

/** Client validation for the create dialog and inline row edit. Returns `{ message }` or `{ value }`. */
export const validateServiceTypeForm = (form, serviceTypes, exceptId = null) => {
  const name = String(form.name ?? "").trim();

  if (!name) {
    return { message: "Required field." };
  }

  if (name.length > 255) {
    return { message: "Name too long." };
  }

  const days = optionalFrequency(form.service_frequency_days);
  if (days.message) {
    return days;
  }

  const miles = optionalFrequency(form.service_frequency_miles);
  if (miles.message) {
    return miles;
  }

  if (days.value === null && miles.value === null) {
    return { message: "Required field." };
  }

  const taken = serviceTypes.some(
    (serviceType) =>
      serviceType.name.trim().toLowerCase() === name.toLowerCase() && serviceType.id !== exceptId,
  );
  if (taken) {
    return { message: "Name already taken." };
  }

  return {
    value: {
      name,
      service_frequency_days: days.value,
      service_frequency_miles: miles.value,
    },
  };
};
