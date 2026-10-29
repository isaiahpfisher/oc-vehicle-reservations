// STUB(feature-4): minimal vehicle type so Feature 8 can assign vehicles. Replace with Feature 4's model when it merges.
// `requiresCdl` comes from Feature 8's Key Entities. It is not in the Feature 4 spec yet, so carry it over.
export default (sequelize, Sequelize) => {
  const VehicleType = sequelize.define("vehicleType", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    identifier: {
      type: Sequelize.ENUM("VIN", "serial"),
      allowNull: false,
    },
    requiresCdl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  return VehicleType;
};
