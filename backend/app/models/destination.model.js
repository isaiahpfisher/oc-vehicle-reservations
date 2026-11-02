export default (sequelize, Sequelize) => {
  const Destination = sequelize.define("destination", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    addressLine1: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    addressLine2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    city: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    state: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    zipCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    isSaved: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
    milesFromCampus: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });

  return Destination;
};
