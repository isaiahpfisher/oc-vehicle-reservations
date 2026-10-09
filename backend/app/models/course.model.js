export default (sequelize, Sequelize) => {
  const Course = sequelize.define("course", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    number: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    semesters: {
      type: Sequelize.STRING,
      allowNull: false,
      get() {
        const raw = this.getDataValue("semesters");
        return raw ? raw.split(",") : [];
      },
      set(value) {
        this.setDataValue("semesters", Array.isArray(value) ? value.join(",") : value);
      },
    },
    frequency: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    hours: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    department: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return Course;
};
