export const ISSUE_TYPES = ["low_gas", "dirty", "maintenance", "other"];
export const ISSUE_STATUSES = ["pending", "resolved", "cancelled"];

export default (sequelize, Sequelize) => {
  const IssueReport = sequelize.define("issueReport", {
    vehicleId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    vehicleRequestId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    authorId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    assigneeId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    type: {
      type: Sequelize.ENUM(...ISSUE_TYPES),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM(...ISSUE_STATUSES),
      allowNull: false,
    },
    resolvedAt: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
  });

  return IssueReport;
};
