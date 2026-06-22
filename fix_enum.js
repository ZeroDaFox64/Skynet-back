const { sequelize } = require('./src/config/db.js');

async function fixEnum() {
  try {
    // Buscar los tipos ENUM en la base de datos
    const [results] = await sequelize.query("SELECT typname FROM pg_type WHERE typcategory = 'E'");
    console.log("ENUM Types in DB:", results);
    
    // Ver si el de category products existe y agregarlo
    const enumName = results.find(r => r.typname.includes('product_category') || r.typname.includes('products'))?.typname;
    
    if (enumName) {
      console.log(`Found ENUM type: ${enumName}. Altering it to add 'postre'...`);
      await sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE 'postre'`);
      console.log("Successfully added 'postre' to the ENUM.");
    } else {
      console.log("Could not find the ENUM type for product category.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

fixEnum();
