export default (sequelize, Sequelize) => {
  const VehicleType = sequelize.define("vehicleType", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    identifier: {
      type: Sequelize.ENUM("VIN", "Serial"),
      allowNull: false,
    },
  });

  return VehicleType;
};
