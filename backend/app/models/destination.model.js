// STUB(feature-6): destination fields from ERD.md so Feature 8 can save trip stops. Replace with Feature 6's model when it merges.
export default (sequelize, Sequelize) => {
  const Destination = sequelize.define("destination", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    addressLine1: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
    addressLine2: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
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
      allowNull: false,
      defaultValue: "",
    },
    isSaved: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    milesFromCampus: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });

  return Destination;
};
