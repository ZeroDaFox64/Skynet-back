const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js'); // Asegúrate de que este archivo tiene la config SSL de Render

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Lo definimos como propiedad simple (UUID es el estándar para IDs modernos)
  user_token: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // PostgreSQL permite guardar arrays de forma nativa
  company_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  // Opciones del modelo
  timestamps: true,       // Crea createdAt y updatedAt automáticamente
  underscored: true,      // Convierte camelCase a snake_case en la DB (recomendado en Postgres)
  tableName: 'users',     // Nombre de la tabla en la base de datos
});

module.exports = User;
