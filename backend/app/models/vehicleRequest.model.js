/**
 * INTERIM stand-in for Feature 8. Remove this model when the real vehicle request
 * model lands, and point issue reports at that model instead.
 * The table name matches Feature 8 (`vehicle_requests`) and only stores `purpose`,
 * which is the field issue reports display.
 */
export default (sequelize, Sequelize) => {
  const VehicleRequest = sequelize.define("vehicleRequest", {
    purpose: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
  });

  return VehicleRequest;
};
