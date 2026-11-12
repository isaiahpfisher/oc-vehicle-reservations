export default (sequelize, Sequelize) => {
  const Area = sequelize.define("area", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    logo: {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: "",
    },
  });

  return Area;
};
