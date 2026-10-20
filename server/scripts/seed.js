// Optional: adds sample Men's and Women's products when the catalogue is empty.
// Run once with:  npm run seed
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Product = require("../models/Product");

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
const items = [
  ["Embroidered Lawn Suit", 6500, 4300, "Women", "Soft lawn with fine embroidery for summer days.", "Sage green", 12, "photo-1583391733956-3750e0ff4e8b"],
  ["Chiffon Party Dress", 9800, 6500, "Women", "Flowing chiffon for weddings and evening events.", "Maroon", 6, "photo-1572804013309-59a88b7e92f1"],
  ["Cotton Kurta Set", 4200, 2700, "Women", "Everyday cotton comfort with a tailored fit.", "Ivory", 18, "photo-1490481651871-ab68de25d43d"],
  ["Wash and Wear Shalwar Kameez", 5200, 3400, "Men", "Crease resistant fabric that stays fresh all day.", "Charcoal", 20, "photo-1617137968427-85924c800a22"],
  ["Formal Waistcoat", 6800, 4500, "Men", "Classic waistcoat to dress up any kurta.", "Navy", 8, "photo-1593030761757-71fae45fa0e7"],
  ["Cotton Casual Shirt", 3200, 2000, "Men", "Breathable cotton shirt for work and weekends.", "Sky blue", 15, "photo-1602810318383-e386cc2a3ccf"],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  if (await Product.countDocuments()) {
    console.log("Products already exist. Nothing added.");
  } else {
    await Product.insertMany(
      items.map(([name, price, costPrice, category, description, color, quantity, id]) => ({
        name, price, costPrice, category, description, color, quantity, images: [{ url: img(id), color }],
      }))
    );
    console.log(`Added ${items.length} sample products.`);
  }
  await mongoose.disconnect();
})();
