const mongoose = require("mongoose");

// Uploaded product photos live in MongoDB, so no extra storage service is needed.
const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true, enum: ["image/jpeg", "image/png", "image/webp"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Image", imageSchema);
