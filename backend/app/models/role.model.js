export const ROLE_NAMES = ["admin", "area_admin", "maintenance"];

export default (sequelize, Sequelize) => {
  const Role = sequelize.define(
    "role",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      areaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: { isIn: [ROLE_NAMES] },
      },
    },
    {
      // Column names: sequelizeInstance sets `underscored: true`.
      indexes: [{ unique: true, fields: ["user_id", "role", "area_id"] }],
    },
  );

  return Role;
};
