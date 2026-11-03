export const DRIVER_STATUSES = ["pending", "approved", "denied", "revoked", "former"];

export const LICENSE_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC",
  "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

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
