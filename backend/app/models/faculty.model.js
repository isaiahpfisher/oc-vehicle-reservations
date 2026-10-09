export default (sequelize, Sequelize) => {
    const Faculty = sequelize.define("faculty", {
      facultyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
        firstName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      department: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    }, {
        tableName: "faculty"
    });
  
    return Faculty;
  };