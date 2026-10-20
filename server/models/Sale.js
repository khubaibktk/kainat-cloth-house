const mongoose = require("mongoose");

// A sale keeps a snapshot of name, price and cost so reports stay correct
// even if the product is edited or deleted later.
const saleSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    productName: { type: String, required: true },
    category: { type: String, required: true, enum: ["Men", "Women"] },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true },
    profit: { type: Number, required: true },
    soldAt: { type: Date, default: Date.now, index: true },
    note: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
