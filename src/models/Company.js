const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js'); // Tu instancia de conexión con SSL

const Company = sequelize.define('Company', {
  rif: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT, // Usamos TEXT por si la descripción es larga
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true, // Validación de formato de email a nivel DB
    },
  },
  pay_status: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  // Opciones adicionales
  timestamps: true,       // Gestiona createdAt y updatedAt automáticamente
  underscored: true,      // Mantiene consistencia snake_case (ej: pay_status, created_at)
  tableName: 'companies',  // Nombre de la tabla en plural
});

module.exports = Company;