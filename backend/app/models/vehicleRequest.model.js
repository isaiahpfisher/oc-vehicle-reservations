export const REQUEST_STATUSES = ["pending", "awaiting_vehicle", "reserved", "returned", "cancelled", "denied"];

export default (sequelize, Sequelize) => {
  const VehicleRequest = sequelize.define("vehicleRequest", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    areaId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    purpose: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    startAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    endAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    allDay: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    numberOfPeople: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    estimatedMiles: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    approverId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    approvedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM(...REQUEST_STATUSES),
      allowNull: false,
      defaultValue: "pending",
    },
  });

  return VehicleRequest;
};
