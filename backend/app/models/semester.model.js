export default (sequelize, Sequelize) => {
  const Semester = sequelize.define("semester", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
  });

  return Semester;
};
