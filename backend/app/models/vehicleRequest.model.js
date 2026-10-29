export const REQUEST_STATUSES = ["pending", "awaiting_vehicle", "reserved", "returned", "cancelled", "denied"];

// Attribute names are snake_case to match the Feature 8 API payloads.
export default (sequelize, Sequelize) => {
  const VehicleRequest = sequelize.define("vehicleRequest", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    area_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    purpose: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    start_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    end_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    all_day: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    number_of_people: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    estimated_miles: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    approver_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    approved_at: {
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
