/** The parent foreign keys a note can hang off (Feature 14). Exactly one is set per row. */
export const NOTE_PARENT_KEYS = ["vehicleRequestId", "issueReportId", "maintenanceNeedId"];

export default (sequelize, Sequelize) => {
  const Note = sequelize.define("note", {
    vehicleRequestId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    issueReportId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    maintenanceNeedId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    authorId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    isVisible: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Unused until the emails feature (Feature 14 → Delivered to later features).
    includeInEmail: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  return Note;
};
