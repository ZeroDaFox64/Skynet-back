const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Product = sequelize.define('Products', {
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  product_category: {
    type: DataTypes.ENUM('bebida', 'hamburguesa', 'pollo', 'pizza', 'postre', 'otros'),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  front_image: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  underscored: true,
  tableName: 'products',
});

module.exports = Product;
