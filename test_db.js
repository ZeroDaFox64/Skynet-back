require("dotenv").config();
const Company = require("./src/models/Company");
const { connectDB } = require("./src/config/db");

async function test() {
  await connectDB();
  try {
    const companies = await Company.findAll();
    console.log("Companies:", companies);
  } catch (e) {
    console.error("DB Error:", e.message);
  }
  process.exit();
}

test();
