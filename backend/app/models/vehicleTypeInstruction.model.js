export default (sequelize, Sequelize) => {
  const VehicleTypeInstruction = sequelize.define(
    "vehicleTypeInstruction",
    {
      vehicleTypeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      areaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
    },
    {
      indexes: [{ unique: true, fields: ["vehicle_type_id", "area_id"] }],
    },
  );

  return VehicleTypeInstruction;
};
