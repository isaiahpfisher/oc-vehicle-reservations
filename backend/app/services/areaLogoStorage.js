import path from "path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "area-logos";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

let supabase;

const client = () => {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return supabase;
};

export const storage = {
  enabled() {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  },

  async upload(objectPath, buffer, contentType) {
    const { error } = await client().storage.from(BUCKET).upload(objectPath, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw error;
    }
  },

  publicUrl(objectPath) {
    const { data } = client().storage.from(BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  },

  async remove(paths) {
    if (!paths.length) {
      return;
    }

    const { error } = await client().storage.from(BUCKET).remove(paths);
    if (error) {
      throw error;
    }
  },

  async list(prefix) {
    const { data, error } = await client().storage.from(BUCKET).list(prefix);
    if (error) {
      throw error;
    }

    return (data ?? []).filter((item) => item.id && item.name);
  },
};

export const logoFileError = (file) => {
  if (!file) {
    return null;
  }

  if (file.size > MAX_BYTES) {
    return "File must be under 2 MB.";
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_TYPES.has(file.mimetype)) {
    return "Unsupported file type.";
  }

  return null;
};

const safeFilename = (name) => {
  const base = path.basename(name || "logo").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "logo";
};

const PLACEHOLDER = ".keep.png";
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const logoPrefix = () => String(process.env.AREA_LOGO_PREFIX || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");

const areaFolder = (areaId) => {
  const prefix = logoPrefix();
  if (!prefix) {
    throw new Error("AREA_LOGO_PREFIX is not set.");
  }

  return `${prefix}/${areaId}`;
};

export const bucketPath = (logoUrl) => {
  const marker = `/${BUCKET}/`;
  const index = String(logoUrl || "").indexOf(marker);
  if (index === -1) {
    return null;
  }

  return decodeURIComponent(String(logoUrl).slice(index + marker.length).split("?")[0]);
};

const areaFilePaths = async (areaId) => {
  const folder = areaFolder(areaId);
  return (await storage.list(folder))
    .filter((item) => item.name && !item.name.includes("/") && !item.name.includes(".."))
    .map((item) => `${folder}/${item.name}`);
};

const ensurePrefixFolder = async () => {
  await storage.upload(`${logoPrefix()}/${PLACEHOLDER}`, PLACEHOLDER_PNG, "image/png");
};

const listAll = async (folder) => {
  const files = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await client().storage.from(BUCKET).list(folder, { limit: 1000, offset });
    if (error) {
      throw error;
    }
    if (!data?.length) {
      break;
    }

    for (const item of data) {
      if (!item.name || item.name.includes("..")) {
        continue;
      }

      const child = `${folder}/${item.name}`;
      if (item.id) {
        files.push(child);
      } else {
        files.push(...(await listAll(child)));
      }
    }

    if (data.length < 1000) {
      break;
    }
    offset += data.length;
  }

  return files;
};

export const uploadAreaLogo = async (areaId, file) => {
  if (!storage.enabled()) {
    throw new Error("Supabase is not configured.");
  }

  const folder = areaFolder(areaId);
  const objectPath = `${folder}/${safeFilename(file.originalname)}`;
  await storage.upload(objectPath, file.buffer, file.mimetype);
  const extras = (await areaFilePaths(areaId)).filter((itemPath) => itemPath !== objectPath);
  await storage.remove(extras);
  await ensurePrefixFolder();
  return storage.publicUrl(objectPath);
};

export const removeAreaFolder = async (areaId) => {
  if (!storage.enabled() || !logoPrefix()) {
    return;
  }

  await storage.remove(await areaFilePaths(areaId));
  await ensurePrefixFolder();
};

export const resetPrefixFolder = async () => {
  if (!storage.enabled() || !logoPrefix()) {
    throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and AREA_LOGO_PREFIX before deleting logos.");
  }

  const prefix = logoPrefix();
  const files = await listAll(prefix);
  for (let index = 0; index < files.length; index += 100) {
    await storage.remove(files.slice(index, index + 100));
  }
  await ensurePrefixFolder();
  return { prefix, count: files.length };
};
