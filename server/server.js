require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const requireAdmin = require("./middleware/auth");
const connectDB = require("./config/db");
const Product = require("./models/Product");
const Sale = require("./models/Sale");
const Image = require("./models/Image");

const app = express();
const PORT = process.env.PORT || 5000;
const DAY = 864e5;
const TZ = "Asia/Karachi"; // Pakistan has no daylight saving: always UTC+5

const origins = (process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : undefined));
app.use(express.json({ limit: "1mb" }));

const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
const startOfDay = (key) => new Date(`${key}T00:00:00+05:00`);
const sinceDays = (n) => startOfDay(dayKey(Date.now() - (n - 1) * DAY));
const badId = (res, id) =>
  !mongoose.isValidObjectId(id) && res.status(400).json({ message: "Invalid ID." });

const FIELDS = ["name", "price", "costPrice", "category", "description", "color", "quantity", "imageUrl"];
const IMG_URL = /^(\/api\/images\/[a-f0-9]{24}|https?:\/\/\S+)$/;
function cleanImages(list) {
  if (!Array.isArray(list)) throw new Error("Photos must be a list.");
  if (list.length > 8) throw new Error("A product can have at most 8 photos.");
  return list.map((i) => {
    const url = String((i && i.url) || "").trim();
    if (!IMG_URL.test(url) || url.length > 600) throw new Error("One of the photos has an invalid address.");
    return { url, color: String((i && i.color) || "").trim().slice(0, 50) };
  });
}
const imageIds = (list = []) =>
  list.map((i) => /^\/api\/images\/([a-f0-9]{24})$/.exec(i.url)?.[1]).filter(Boolean);

const pick = (body) => {
  const data = Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  if (body.images !== undefined) data.images = cleanImages(body.images);
  return data;
};

// ---------- Auth ----------
// Simple in-memory brake against password guessing (10 tries per 15 minutes per IP)
const attempts = new Map();
app.post("/api/admin/login", async (req, res) => {
  const ip = req.ip;
  const rec = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - rec.t > 15 * 60 * 1000) { rec.n = 0; rec.t = Date.now(); }
  if (rec.n >= 10) return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });

  try {
    const { username, password } = req.body || {};
    const ok =
      username && password && username === process.env.ADMIN_USERNAME &&
      (await bcrypt.compare(String(password), process.env.ADMIN_PASSWORD_HASH || ""));
    if (!ok) {
      attempts.set(ip, { ...rec, n: rec.n + 1 });
      return res.status(401).json({ message: "Invalid username or password." });
    }
    attempts.delete(ip);
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ message: "Login successful.", token });
  } catch {
    res.status(500).json({ message: "Login failed." });
  }
});

app.get("/", (req, res) => res.send("Kainat Cloth House API is running."));

// ---------- Products ----------
app.get("/api/products", async (req, res) => {
  try {
    res.json(await Product.find().sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: "Failed to fetch products." });
  }
});

app.get("/api/products/:id", async (req, res) => {
  if (badId(res, req.params.id)) return;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch {
    res.status(500).json({ message: "Failed to fetch product." });
  }
});

app.post("/api/products", requireAdmin, async (req, res) => {
  try {
    const product = await Product.create(pick(req.body));
    res.status(201).json({ message: "Product added successfully.", product });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  if (badId(res, req.params.id)) return;
  try {
    const data = pick(req.body);
    const before = data.images ? await Product.findById(req.params.id).select("images").lean() : null;
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (before) {
      const keep = new Set(imageIds(product.images));
      const drop = imageIds(before.images).filter((id) => !keep.has(id));
      if (drop.length) await Image.deleteMany({ _id: { $in: drop } });
    }
    res.json({ message: "Product updated successfully.", product });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  if (badId(res, req.params.id)) return;
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    const ids = imageIds(product.images);
    if (ids.length) await Image.deleteMany({ _id: { $in: ids } });
    res.json({ message: "Product deleted successfully." });
  } catch {
    res.status(500).json({ message: "Failed to delete product." });
  }
});

// ---------- Photo upload (admin) and delivery ----------
app.post(
  "/api/uploads",
  requireAdmin,
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "4mb" }),
  async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || !req.body.length) {
        return res.status(400).json({ message: "Choose a JPG, PNG or WebP photo." });
      }
      const contentType = String(req.headers["content-type"]).split(";")[0];
      const img = await Image.create({ data: req.body, contentType });
      res.status(201).json({ url: `/api/images/${img._id}` });
    } catch {
      res.status(500).json({ message: "Could not save the photo." });
    }
  }
);

app.get("/api/images/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
    const img = await Image.findById(req.params.id);
    if (!img) return res.status(404).end();
    res.set({
      "Content-Type": img.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    res.send(Buffer.from(img.data));
  } catch {
    res.status(500).end();
  }
});

// ---------- Sales ----------
app.get("/api/sales", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 1, 1), 365);
    const sales = await Sale.find({ soldAt: { $gte: sinceDays(days) } })
      .sort({ soldAt: -1, createdAt: -1 })
      .limit(1000)
      .lean();
    res.json(sales);
  } catch {
    res.status(500).json({ message: "Failed to load sales." });
  }
});

// Record a sale. Stock is reduced atomically so it can never go below zero.
app.post("/api/sales", requireAdmin, async (req, res) => {
  try {
    const { productId, quantity, unitPrice, soldAt, note } = req.body || {};
    const qty = Number(quantity);
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Choose a product." });
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: "Quantity must be a whole number of 1 or more." });

    const price = unitPrice === undefined || unitPrice === "" || unitPrice === null ? null : Number(unitPrice);
    if (price !== null && (!Number.isFinite(price) || price < 0)) return res.status(400).json({ message: "Enter a valid selling price." });

    let when = new Date();
    if (soldAt) when = new Date(String(soldAt).length === 10 ? `${soldAt}T12:00:00+05:00` : soldAt);
    if (isNaN(when)) return res.status(400).json({ message: "Invalid sale date." });
    if (when.getTime() > Date.now() + DAY) return res.status(400).json({ message: "Sale date cannot be in the future." });

    const product = await Product.findOneAndUpdate(
      { _id: productId, quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { new: true }
    );
    if (!product) {
      const exists = await Product.exists({ _id: productId });
      return res.status(exists ? 409 : 404).json({
        message: exists ? "Not enough stock for this sale." : "Product not found.",
      });
    }

    const unit = price ?? product.price;
    try {
      const sale = await Sale.create({
        product: product._id,
        productName: product.name,
        category: product.category,
        quantity: qty,
        unitPrice: unit,
        unitCost: product.costPrice || 0,
        total: unit * qty,
        profit: (unit - (product.costPrice || 0)) * qty,
        soldAt: when,
        note: String(note || "").slice(0, 300),
      });
      res.status(201).json({ message: "Sale recorded.", sale, remaining: product.quantity });
    } catch (e) {
      await Product.updateOne({ _id: productId }, { $inc: { quantity: qty } }); // roll back stock
      throw e;
    }
  } catch (e) {
    res.status(500).json({ message: e.message || "Could not record the sale." });
  }
});

// Delete a sale and put the units back in stock
app.delete("/api/sales/:id", requireAdmin, async (req, res) => {
  if (badId(res, req.params.id)) return;
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found." });
    if (sale.product) await Product.updateOne({ _id: sale.product }, { $inc: { quantity: sale.quantity } });
    res.json({ message: "Sale deleted and stock restored." });
  } catch {
    res.status(500).json({ message: "Failed to delete sale." });
  }
});

// ---------- Analytics (daily sales, profit, inventory) ----------
app.get("/api/analytics", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 14, 1), 365);
    const [sales, products] = await Promise.all([
      Sale.find({ soldAt: { $gte: sinceDays(days) } }).lean(),
      Product.find().lean(),
    ]);

    const series = [];
    const byDay = {};
    for (let i = days - 1; i >= 0; i--) {
      const row = { date: dayKey(Date.now() - i * DAY), revenue: 0, profit: 0, units: 0, orders: 0 };
      series.push(row);
      byDay[row.date] = row;
    }

    const totals = { revenue: 0, profit: 0, units: 0, orders: 0 };
    const cat = { Men: 0, Women: 0 };
    const top = {};
    for (const s of sales) {
      const row = byDay[dayKey(s.soldAt)];
      if (!row) continue;
      row.revenue += s.total; row.profit += s.profit; row.units += s.quantity; row.orders += 1;
      totals.revenue += s.total; totals.profit += s.profit; totals.units += s.quantity; totals.orders += 1;
      cat[s.category] = (cat[s.category] || 0) + s.total;
      const t = (top[s.productName] ||= { name: s.productName, revenue: 0, units: 0 });
      t.revenue += s.total; t.units += s.quantity;
    }

    res.json({
      days,
      series,
      totals,
      today: series[series.length - 1],
      byCategory: Object.entries(cat).map(([name, revenue]) => ({ name, revenue })),
      topProducts: Object.values(top).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      inventory: {
        products: products.length,
        units: products.reduce((n, p) => n + p.quantity, 0),
        retailValue: products.reduce((n, p) => n + p.quantity * p.price, 0),
        costValue: products.reduce((n, p) => n + p.quantity * (p.costPrice || 0), 0),
        outOfStock: products.filter((p) => p.quantity === 0).length,
        lowStock: products
          .filter((p) => p.quantity > 0 && p.quantity <= 5)
          .sort((a, b) => a.quantity - b.quantity)
          .slice(0, 8)
          .map((p) => ({ _id: p._id, name: p.name, quantity: p.quantity })),
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to build analytics." });
  }
});

// Always answer with JSON, even for errors such as a photo that is too large
app.use((err, req, res, next) => {
  const message = err.status === 413 ? "That photo is too large." : err.status === 400 ? "Invalid request." : "Something went wrong.";
  res.status(err.status || 500).json({ message });
});

async function startServer() {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}
startServer();
