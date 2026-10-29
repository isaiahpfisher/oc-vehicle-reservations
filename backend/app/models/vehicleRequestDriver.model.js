export default (sequelize, Sequelize) => {
  const VehicleRequestDriver = sequelize.define(
    "vehicleRequestDriver",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vehicle_request_id: {
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
