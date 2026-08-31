const express = require("express");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");

const router = express.Router();
const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");
const ORDERS_FILE = path.join(__dirname, "..", "data", "orders.json");

function readProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
}

function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// POST /api/orders
// body: { customer: { name, email, address }, items: [{ productId, quantity }] }
router.post("/", (req, res) => {
  const { customer, items } = req.body;

  if (!customer || !customer.name || !customer.email) {
    return res.status(400).json({ error: "Customer name and email are required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order must include at least one item" });
  }

  const products = readProducts();
  let total = 0;
  const lineItems = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Unknown product: ${item.productId}` });
    }
    const quantity = Number(item.quantity) || 0;
    if (quantity < 1) {
      return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
    }
    if (quantity > product.stock) {
      return res.status(400).json({ error: `Not enough stock for ${product.name}` });
    }
    const lineTotal = Number((product.price * quantity).toFixed(2));
    total += lineTotal;
    lineItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      lineTotal,
    });
  }

  const order = {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    customer,
    items: lineItems,
    total: Number(total.toFixed(2)),
    currency: "USD",
    status: "received",
  };

  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);

  res.status(201).json(order);
});

// GET /api/orders/:id
router.get("/:id", (req, res) => {
  const orders = readOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

module.exports = router;
