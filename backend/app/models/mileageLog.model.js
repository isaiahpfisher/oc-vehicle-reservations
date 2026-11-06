export default (sequelize, Sequelize) => {
  const MileageLog = sequelize.define("mileageLog", {
    vehicleId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    odometerReading: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    recordedAt: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
  });

  return MileageLog;
};
