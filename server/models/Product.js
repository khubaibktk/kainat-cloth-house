const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    category: { type: String, required: true, enum: ["Men", "Women"] },
    description: { type: String, default: "", maxlength: 2000 },
    color: { type: String, default: "", maxlength: 100 },
    quantity: { type: Number, default: 0, min: 0 },
    imageUrl: { type: String, default: "" }, // old single-photo field, kept for existing products
    // One entry per color/photo. The first photo is the main one.
    images: {
      type: [{ _id: false, url: { type: String, required: true }, color: { type: String, default: "", maxlength: 50 } }],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
