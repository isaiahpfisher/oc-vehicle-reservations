export default (sequelize, Sequelize) => {
    const Section = sequelize.define("Section", {
      sectionNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      daysOfWeek: {
        type: Sequelize.STRING,
      },
      startTime: {
        type: Sequelize.STRING
      },
      endTime: {
        type: Sequelize.STRING
      },
    });
    return Section;
  };
  
