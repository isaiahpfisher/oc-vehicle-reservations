import db from "../models/index.js";

const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);

/** Sequelize `include` that loads everything a vehicle request response shows. */
export const requestInclude = () => [
  { model: db.area, as: "area", attributes: ["id", "name"] },
  { model: db.user, as: "user", attributes: ["id", "firstName", "lastName", "email"] },
  { model: db.user, as: "approver", attributes: ["id", "firstName", "lastName"] },
  { model: db.vehicleRequestDriver, as: "requestDrivers", include: [{ model: db.driver, as: "driver" }] },
  { model: db.vehicleRequestDestination, as: "stops", include: [{ model: db.destination, as: "destination" }] },
  {
    model: db.vehicleRequestVehicle,
    as: "requestVehicles",
    include: [{ model: db.vehicle, as: "vehicle", include: [{ model: db.vehicleType, as: "vehicleType" }] }],
  },
];

/** Flatten the pivot rows into `drivers`, ordered `destinations`, and `vehicles`. */
export const toRequestResponse = (request) => {
  const { requestDrivers, stops, requestVehicles, ...fields } = request.toJSON();
  const shown = (value) => (fields.allDay ? dateOnly(value) : value);

  return {
    ...fields,
    startAt: shown(fields.startAt),
    endAt: shown(fields.endAt),
    drivers: requestDrivers.map(({ driver }) => driver),
    destinations: [...stops].sort((a, b) => a.stopOrder - b.stopOrder).map(({ destination }) => destination),
    vehicles: requestVehicles.map(({ vehicle }) => vehicle),
  };
};
