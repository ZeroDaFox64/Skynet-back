const { Sequelize } = require('sequelize');

const connectDB = async () => {
  const sequelize = new Sequelize(process.env.RENDER_URI, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true, // Fuerza el uso de SSL
      rejectUnauthorized: false // Permite certificados no firmados por CAs públicas
    }
  }
})

  try {
  await sequelize.authenticate();
  console.log('DB is connected.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}
}

module.exports = connectDB;