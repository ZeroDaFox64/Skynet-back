require('dotenv').config(); 
const { Sequelize } = require('sequelize');

// 1. Creamos la instancia fuera de la función para poder exportarla
const sequelize = new Sequelize(process.env.RENDER_URI, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false // Opcional: para que no ensucie la consola con logs de SQL
});

// 2. Función para probar la conexión (la llamarás en tu index.js)
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB is connected to Render.');
    
    // Opcional: Esto crea las tablas si no existen
    // await sequelize.sync({ alter: true }); 
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

// 3. Exportas AMBAS cosas: la función para conectar y la instancia para los modelos
module.exports = { sequelize, connectDB };
