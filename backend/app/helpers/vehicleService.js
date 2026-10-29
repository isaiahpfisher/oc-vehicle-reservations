/**
 * STUB(features 9, 11, 13): mileage logs, maintenance needs, and service logs don't exist yet, so every vehicle
 * reports in service with unknown miles until service. Replace with real lookups when those features merge.
 */
export const getServiceStatuses = async (vehicles) =>
  new Map(vehicles.map((vehicle) => [vehicle.id, { out_of_service: false, miles_until_service: null }]));
