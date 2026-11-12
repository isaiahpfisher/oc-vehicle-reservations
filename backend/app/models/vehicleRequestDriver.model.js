export default (sequelize, Sequelize) => {
  const VehicleRequestDriver = sequelize.define(
    "vehicleRequestDriver",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      driverId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vehicleRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      indexes: [{ unique: true, fields: ["driver_id", "vehicle_request_id"] }],
    },
  );

  return VehicleRequestDriver;
};
