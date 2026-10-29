// STUB(feature-7): driver fields from ERD.md so Feature 8 can validate drivers. Replace with Feature 7's model when it merges.
// `hasCdl` comes from Feature 8's US-8.8. It is not in ERD.md yet, so carry it over.
export default (sequelize, Sequelize) => {
  const Driver = sequelize.define("driver", {
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    licenseExpirationDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("pending", "approved", "denied", "revoked"),
      allowNull: false,
      defaultValue: "pending",
    },
    hasCdl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  return Driver;
};
