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
    identifier: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    purchasedAt: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    color: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    passengerCapacity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    licensePlate: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
    licensePlateExpirationDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM("active", "retired"),
      allowNull: false,
    },
  });

  return Vehicle;
};
