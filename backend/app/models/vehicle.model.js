// INTERIM(feature-5): minimal vehicle so Feature 8 can assign vehicles. Replace with Feature 5's model when it merges.
export default (sequelize, Sequelize) => {
  const Vehicle = sequelize.define("vehicle", {
    areaId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    vehicleTypeId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    universityId: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    make: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    model: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    year: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    passengerCapacity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("active", "retired"),
      allowNull: false,
      defaultValue: "active",
    },
  });

  return Vehicle;
};
