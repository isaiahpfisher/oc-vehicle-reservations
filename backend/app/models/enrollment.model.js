export default (sequelize, Sequelize) => {
  const Enrollment = sequelize.define("enrollment", {
    studentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    sectionId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });

  return Enrollment;
};
