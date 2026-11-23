/**
 * Variables in pickup and return instructions: `{{vehicle}}`, `{{pickup_time}}`, … Each trip fills in its own details
 * when the instructions go out to drivers. Keep the names in sync with backend/app/helpers/instructionVariables.js,
 * which refuses any other name.
 *
 * `sample` is what the editor's preview shows, from a made-up trip; `sampleMany` is the same trip with two vehicles of
 * this type.
 *
 * A trip can have several drivers and vehicles, and nothing records which driver takes which vehicle, so:
 * - each driver gets their own email, so {{driver_first_name}} is always one name;
 * - {{vehicle}} lists every vehicle of this type on the trip;
 * - {{area_admins}} lists them all.
 */
export const INSTRUCTION_VARIABLES = [
  { name: "trip", group: "Trip", label: "Trip name", description: "The trip's name", sample: "Trip to Oklahoma State University" },
  { name: "pickup_time", group: "Trip", label: "Pickup time", description: "When the trip starts", sample: "Thu, Dec 3 at 7:00 AM" },
  { name: "return_time", group: "Trip", label: "Return time", description: "When the trip ends", sample: "Fri, Dec 4 at 6:00 PM" },
  {
    name: "vehicle",
    group: "Trip",
    label: "Vehicle",
    description: "Every vehicle of this type on the trip",
    sample: "ATH-V02 · 2022 Ford Transit 350",
    sampleMany: "ATH-V01 · 2021 Ford Transit 350 and ATH-V02 · 2022 Ford Transit 350",
  },
  {
    name: "driver_first_name",
    group: "People",
    label: "Driver's first name",
    description: "Each driver gets their own email",
    sample: "Riley",
  },
  { name: "area_admins", group: "People", label: "Area admins", description: "Everyone who runs the area, with emails", sample: "Taylor Athletics (areaadmin@oc.edu)" },
];

/**
 * Where a type's first default starts (and an area's, when there's no default to copy), so admins edit rather than
 * start from nothing. Short blocks with room between them, and only the variables a driver needs; it reads right
 * whether {{vehicle}} is one vehicle or two.
 */
export const STARTING_INSTRUCTIONS = `Hi {{driver_first_name}},

Pickup: {{pickup_time}}
Get the keys from Support Central, then pick up {{vehicle}} from the lot behind Garvey.

Return: {{return_time}}
Fill the tank and leave the keys in the drop box outside Support Central.

Questions? Contact {{area_admins}}.`;

/** Shown in an empty instructions box. */
export const INSTRUCTIONS_PLACEHOLDER = `For example:
Pickup: {{pickup_time}}, from the field house. Get the keys for {{vehicle}} from the equipment room.
Return: {{return_time}}. Bring the keys back to the equipment room.
Questions? Contact {{area_admins}}.`;

const BY_NAME = new Map(INSTRUCTION_VARIABLES.map((variable) => [variable.name, variable]));

export const variableToken = (name) => `{{${name}}}`;

export const findVariable = (name) => BY_NAME.get(name) ?? null;

/** `[{ group, variables }]` in list order, for the editor's Variables panel. */
export const variableGroups = () => {
  const groups = new Map();
  INSTRUCTION_VARIABLES.forEach((variable) => groups.set(variable.group, [...(groups.get(variable.group) ?? []), variable]));
  return [...groups].map(([group, variables]) => ({ group, variables }));
};

const VARIABLE = /\{\{([^{}]*)\}\}/g;

/**
 * The text split into plain parts and variables, in order: `{ text }` or `{ text, name, variable }` (`variable` is null
 * for a name that isn't one).
 */
export const instructionParts = (content) => {
  const text = String(content ?? "");
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(VARIABLE)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const name = match[1].trim();
    parts.push({ text: match[0], name, variable: findVariable(name) });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
};

/** The names in `content` that aren't variables, in order, without repeats (the API refuses these). */
export const unknownVariables = (content) => [
  ...new Set(instructionParts(content).filter(({ name, variable }) => name !== undefined && !variable).map(({ name }) => name)),
];

export const usesVariables = (content) => instructionParts(content).some(({ variable }) => variable);
