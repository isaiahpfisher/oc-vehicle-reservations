import logger from "../config/logger.js";
import { requiredText } from "../helpers/fields.js";
import { autocomplete, placeAddress, placesEnabled } from "../helpers/places.js";

const exports = {};

// A client-generated UUID; Places ids are URL-safe base64-ish. Both end up in a Google URL or body.
const SESSION_TOKEN = /^[A-Za-z0-9-]{1,64}$/;
const PLACE_ID = /^[A-Za-z0-9_-]{1,512}$/;

const unavailable = (res) => res.status(503).send({ message: "Address search isn't available." });

const failed = (res, err) => {
  logger.warn(`Address search failed: ${err.message}`);
  return res.status(502).send({ message: "Address search failed." });
};

exports.autocomplete = async (req, res) => {
  const input = requiredText(req.query.input);
  if (!input || input.length < 3 || input.length > 200) {
    return res.status(400).send({ message: "Enter 3 to 200 characters to search." });
  }

  if (!SESSION_TOKEN.test(String(req.query.sessionToken ?? ""))) {
    return res.status(400).send({ message: "Invalid session token." });
  }

  if (!placesEnabled()) {
    return unavailable(res);
  }

  try {
    return res.send(await autocomplete(input, req.query.sessionToken));
  } catch (err) {
    return failed(res, err);
  }
};

exports.findOne = async (req, res) => {
  if (!PLACE_ID.test(req.params.placeId)) {
    return res.status(400).send({ message: "Invalid place id." });
  }

  if (!SESSION_TOKEN.test(String(req.query.sessionToken ?? ""))) {
    return res.status(400).send({ message: "Invalid session token." });
  }

  if (!placesEnabled()) {
    return unavailable(res);
  }

  try {
    return res.send(await placeAddress(req.params.placeId, req.query.sessionToken));
  } catch (err) {
    return failed(res, err);
  }
};

export default exports;
