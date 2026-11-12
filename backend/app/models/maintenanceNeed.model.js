export const MAINTENANCE_PRIORITIES = ["High", "Medium", "Low", "None"];
export const MAINTENANCE_STATUSES = ["Open", "In Progress", "Completed", "Canceled"];

export default (sequelize, Sequelize) => {
  const MaintenanceNeed = sequelize.define("maintenanceNeed", {
    issueReportId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true,
    },
    authorId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    vehicleId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    assigneeId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    title: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    outOfService: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
    priority: {
      type: Sequelize.ENUM(...MAINTENANCE_PRIORITIES),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM(...MAINTENANCE_STATUSES),
      allowNull: false,
    },
    resolvedAt: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
  });

  return MaintenanceNeed;
};
