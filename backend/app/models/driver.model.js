// INTERIM(feature-7): the `drivers` table from Feature 7's spec, so Feature 8 can validate drivers.
// Feature 7's model replaces this file when it merges.
export const DRIVER_STATUSES = ["pending", "approved", "denied", "revoked", "former"];

export default (sequelize, Sequelize) => {
  const Driver = sequelize.define("driver", {
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true,
    },
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    licenseState: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    licenseExpirationDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    approvedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM(...DRIVER_STATUSES),
      allowNull: false,
      defaultValue: "pending",
    },
  });

  return Driver;
};
