export default (sequelize, Sequelize) => {
  const VehicleRequestVehicle = sequelize.define(
    "vehicleRequestVehicle",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vehicleRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vehicleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      indexes: [{ unique: true, fields: ["vehicle_request_id", "vehicle_id"] }],
    },
  );

  return VehicleRequestVehicle;
};
