export default (sequelize, Sequelize) => {
  const VehicleRequestVehicle = sequelize.define(
    "vehicleRequestVehicle",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vehicle_request_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vehicle_id: {
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
