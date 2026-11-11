export default (sequelize, Sequelize) => {
  const ServiceLog = sequelize.define("serviceLog", {
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    vehicleId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    serviceTypeId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    mileageLogId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    // INTERIM: no foreign key until Feature 11 adds maintenanceNeeds.
    maintenanceNeedId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    servicedAt: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
  });

  return ServiceLog;
};
