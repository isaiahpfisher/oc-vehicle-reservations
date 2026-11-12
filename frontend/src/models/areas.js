const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT = /\.(png|jpe?g|webp)$/i;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export const LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

export const logoFilename = (logo) => {
  if (!logo) {
    return "";
  }

  try {
    return decodeURIComponent(new URL(logo).pathname.split("/").pop() || "");
  } catch {
    return String(logo).split("/").pop() || "";
  }
};

export const logoFileMessage = (file) => {
  if (!file) {
    return "";
  }

  if (!ALLOWED_EXT.test(file.name) || (file.type && !ALLOWED_TYPES.has(file.type))) {
    return "Unsupported file type.";
  }

  if (file.size > MAX_BYTES) {
    return "File must be under 2 MB.";
  }

  return "";
};

export const areaNameMessage = (name, areas, exceptId) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Required field.";
  }

  if (trimmed.length > 255) {
    return "Name too long.";
  }

  if (areas.some((area) => area.name === trimmed && area.id !== exceptId)) {
    return "Name already taken.";
  }

  return "";
};
