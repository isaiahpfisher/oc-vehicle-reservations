import { Op } from "sequelize";
import db from "../models/index.js";
import { localDay } from "./vehicleStatus.js";

const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const formatDay = (day) => dayFormat.format(new Date(`${day}T00:00:00Z`));
const formatMiles = (miles) => `${miles.toLocaleString("en-US")} mi`;

/**
 * UI/UX backlog #3: an odometer only goes up, and a reading can't come from the future. The estimated mileage and
 * service schedule (Feature 18) start from the latest reading, so one bad reading would throw both off.
 *
 * Returns a human-readable message, or null when `reading` on `day` fits between the vehicle's other readings:
 * at least the highest reading on or before that day, and at most the lowest reading after it.
 * `excludeId` leaves out the mileage log being edited. `dateLabel` names the date field in the message.
 */
export const odometerProblem = async ({ vehicleId, reading, day, excludeId = null, dateLabel = "Recorded date" }, options = {}) => {
  if (day > localDay()) {
    return `${dateLabel} can't be in the future.`;
  }

  const where = { vehicleId, ...(excludeId === null ? {} : { id: { [Op.ne]: excludeId } }) };
  const [before, after] = await Promise.all([
    db.mileageLog.findOne({
      where: { ...where, recordedAt: { [Op.lte]: day } },
      order: [["odometerReading", "DESC"]],
      ...options,
    }),
    db.mileageLog.findOne({
      where: { ...where, recordedAt: { [Op.gt]: day } },
      order: [["odometerReading", "ASC"]],
      ...options,
    }),
  ]);

  if (before && reading < before.odometerReading) {
    return `Odometer reading can't be lower than ${formatMiles(before.odometerReading)}, recorded ${formatDay(String(before.recordedAt))}.`;
  }

  if (after && reading > after.odometerReading) {
    return `Odometer reading can't be higher than ${formatMiles(after.odometerReading)}, recorded ${formatDay(String(after.recordedAt))}.`;
  }

  return null;
};
