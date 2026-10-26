/**
 * INTERIM stand-in for Feature 2 (Area Management) so Feature 3 roles can reference areas.
 * Remove this file once the full Feature 2 is merged and use its Area model instead.
 */
export default (sequelize, Sequelize) => {
  const Area = sequelize.define("area", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    logo: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  });

  return Area;
};
