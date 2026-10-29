export default (sequelize, Sequelize) => {
  const ServiceType = sequelize.define("serviceType", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    service_frequency_days: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: "service_frequency_days",
    },
    service_frequency_miles: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: "service_frequency_miles",
    },
  });

  return ServiceType;
};
