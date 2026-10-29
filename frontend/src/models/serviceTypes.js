const positiveWholeNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return "Required field.";
  }

  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return "Must be a positive whole number.";
  }

  return "";
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

  const daysError = positiveWholeNumber(form.service_frequency_days);
  if (daysError) {
    return { message: daysError };
  }

  const milesError = positiveWholeNumber(form.service_frequency_miles);
  if (milesError) {
    return { message: milesError };
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
      service_frequency_days: Number(String(form.service_frequency_days).trim()),
      service_frequency_miles: Number(String(form.service_frequency_miles).trim()),
    },
  };
};
