import db from "../models/index.js";
import logger from "../config/logger.js";

const exports = {};

const LIMIT = 255;

const destinationId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

const trimmed = (value) => (value === undefined || value === null ? "" : String(value).trim());

const textError = (value, { required, missing, tooLong }) => {
  const text = trimmed(value);
  if (required && (value === undefined || !text)) {
    return missing;
  }
  if (text.length > LIMIT) {
    return tooLong;
  }
  return null;
};

const milesError = (value) => {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return { value: null };
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return { value };
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return { value: Number(value.trim()) };
  }

  return { message: "Miles from campus must be a whole number of 0 or more." };
};

const resolveFields = (body) => {
  const nameError = textError(body.name, {
    required: true,
    missing: "Missing name.",
    tooLong: "Name too long.",
  });
  if (nameError) return { message: nameError };

  const line1Error = textError(body.address_line_1, {
    required: true,
    missing: "Missing address line 1.",
    tooLong: "Address line 1 too long.",
  });
  if (line1Error) return { message: line1Error };

  const line2Error = textError(body.address_line_2, {
    required: false,
    tooLong: "Address line 2 too long.",
  });
  if (line2Error) return { message: line2Error };

  const cityError = textError(body.city, {
    required: true,
    missing: "Missing city.",
    tooLong: "City too long.",
  });
  if (cityError) return { message: cityError };

  const stateError = textError(body.state, {
    required: true,
    missing: "Missing state.",
    tooLong: "State too long.",
  });
  if (stateError) return { message: stateError };

  const zipError = textError(body.zip_code, {
    required: false,
    tooLong: "ZIP code too long.",
  });
  if (zipError) return { message: zipError };

  if (!Object.hasOwn(body, "is_saved")) {
    return { message: "Missing is_saved." };
  }
  if (body.is_saved !== true && body.is_saved !== false) {
    return { message: "is_saved must be true or false." };
  }

  const miles = milesError(body.miles_from_campus);
  if (miles.message) {
    return { message: miles.message };
  }

  return {
    name: trimmed(body.name),
    addressLine1: trimmed(body.address_line_1),
    addressLine2: trimmed(body.address_line_2) || null,
    city: trimmed(body.city),
    state: trimmed(body.state),
    zipCode: trimmed(body.zip_code) || null,
    isSaved: body.is_saved,
    milesFromCampus: miles.value,
  };
};

const toResponse = (destination) => ({
  id: destination.id,
  name: destination.name,
  address_line_1: destination.addressLine1,
  address_line_2: destination.addressLine2,
  city: destination.city,
  state: destination.state,
  zip_code: destination.zipCode,
  is_saved: Boolean(destination.isSaved),
  miles_from_campus: destination.milesFromCampus,
  createdAt: destination.createdAt,
  updatedAt: destination.updatedAt,
});

exports.findAll = async (req, res) => {
  try {
    const destinations = await db.destination.findAll({ order: [["name", "ASC"]] });
    return res.send(destinations.map(toResponse));
  } catch (err) {
    logger.error(`destination findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch destinations." });
  }
};

/** Feature 8: official destinations for the request form, in the same camelCase shape as a request's `destinations`. */
exports.findSelectable = async (req, res) => {
  try {
    const destinations = await db.destination.findAll({
      attributes: ["id", "name", "addressLine1", "addressLine2", "city", "state", "zipCode", "milesFromCampus"],
      where: { isSaved: true },
      order: [["name", "ASC"]],
    });
    return res.send(destinations);
  } catch (err) {
    logger.error(`destination findSelectable failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch destinations." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const id = destinationId(req.params.destinationId);
    if (id === null) {
      return res.status(400).send({ message: "Invalid destination id." });
    }

    const destination = await db.destination.findByPk(id);
    if (!destination) {
      return res.status(404).send({ message: `Destination with id=${id} not found.` });
    }

    return res.send(toResponse(destination));
  } catch (err) {
    logger.error(`destination findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch destination." });
  }
};

exports.create = async (req, res) => {
  try {
    const resolved = resolveFields(req.body);
    if (resolved.message) {
      return res.status(400).send({ message: resolved.message });
    }

    const destination = await db.destination.create(resolved);
    return res.status(201).send(toResponse(destination));
  } catch (err) {
    logger.error(`destination create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create destination." });
  }
};

exports.update = async (req, res) => {
  try {
    const id = destinationId(req.params.destinationId);
    if (id === null) {
      return res.status(400).send({ message: "Invalid destination id." });
    }

    const existing = await db.destination.findByPk(id);
    if (!existing) {
      return res.status(404).send({ message: `Destination with id=${id} not found.` });
    }

    const resolved = resolveFields(req.body);
    if (resolved.message) {
      return res.status(400).send({ message: resolved.message });
    }

    await existing.update(resolved);
    return res.status(200).send(toResponse(existing));
  } catch (err) {
    logger.error(`destination update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update destination." });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = destinationId(req.params.destinationId);
    if (id === null) {
      return res.status(400).send({ message: "Invalid destination id." });
    }

    const existing = await db.destination.findByPk(id);
    if (!existing) {
      return res.status(404).send({ message: `Destination with id=${id} not found.` });
    }

    // Feature 8: requests are never deleted, so a destination they visit stays.
    if ((await db.vehicleRequestDestination.count({ where: { destinationId: id } })) > 0) {
      return res.status(400).send({
        message: "Destination is on vehicle requests and can't be deleted. Mark it Unofficial to stop offering it.",
      });
    }

    await existing.destroy();
    return res.status(200).send({ message: "Destination deleted successfully." });
  } catch (err) {
    logger.error(`destination delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete destination." });
  }
};

export default exports;
