export default (sequelize, Sequelize) => {
  const VehicleRequestDestination = sequelize.define("vehicleRequestDestination", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    destination_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    vehicle_request_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    stop_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });

  return VehicleRequestDestination;
};
