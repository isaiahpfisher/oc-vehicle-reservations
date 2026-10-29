export default (sequelize, Sequelize) => {
  const VehicleRequestDestination = sequelize.define("vehicleRequestDestination", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    destinationId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    vehicleRequestId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    stopOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });

  return VehicleRequestDestination;
};
