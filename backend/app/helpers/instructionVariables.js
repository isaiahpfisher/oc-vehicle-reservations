/**
 * Variables in pickup and return instructions (Feature 15): `{{vehicle}}`, `{{pickup_time}}`, … Each trip fills in its
 * own details when the instructions go out to drivers. Keep in sync with frontend/src/models/instructionVariables.js.
 */
export const INSTRUCTION_VARIABLES = ["trip", "pickup_time", "return_time", "vehicle", "driver_first_name", "area_admins"];

/** Every `{{ … }}` in the text, by the name inside the braces. */
const VARIABLE = /\{\{([^{}]*)\}\}/g;

/** The names in `content` that aren't variables, in order, without repeats. */
export const unknownVariables = (content) => [
  ...new Set([...String(content ?? "").matchAll(VARIABLE)].map(([, name]) => name.trim()).filter((name) => !INSTRUCTION_VARIABLES.includes(name))),
];
