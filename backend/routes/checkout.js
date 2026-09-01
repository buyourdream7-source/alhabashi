const express = require("express");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");
const Stripe = require("stripe");

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

// POST /api/create-checkout-session
// body: { customer: { name, email, address }, items: [{ productId, quantity }] }
router.post("/create-checkout-session", async (req, res) => {
  const { customer, items } = req.body;

  if (!customer || !customer.name || !customer.email) {
    return res.status(400).json({ error: "Customer name and email are required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order must include at least one item" });
  }

  const products = readProducts();
  const line_items = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Unknown product: ${item.productId}` });
    }
    const quantity = Number(item.quantity) || 0;
    if (quantity < 1 || quantity > product.stock) {
      return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
    }
    line_items.push({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(product.price * 100), // Stripe uses cents
        product_data: { name: product.name },
      },
    });
  }

  // Stash cart + customer info in metadata so we can rebuild the order after payment
  const metadata = {
    customerName: customer.name,
    customerEmail: customer.email,
    customerAddress: customer.address || "",
    items: JSON.stringify(items),
  };

  const origin = `${req.protocol}://${req.get("host")}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customer.email,
      line_items,
      metadata,
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err.message);
    res.status(500).json({ error: "Could not start checkout. Please try again." });
  }
});

// GET /api/checkout-session/:id
// Called by success.html to confirm payment and record the order.
router.get("/checkout-session/:id", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const orders = readOrders();
    let order = orders.find((o) => o.stripeSessionId === session.id);

    if (!order) {
      const products = readProducts();
      const items = JSON.parse(session.metadata.items);
      let total = 0;
      const lineItems = items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const lineTotal = Number((product.price * item.quantity).toFixed(2));
        total += lineTotal;
        return {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: item.quantity,
          lineTotal,
        };
      });

      order = {
        id: nanoid(10),
        stripeSessionId: session.id,
        createdAt: new Date().toISOString(),
        customer: {
          name: session.metadata.customerName,
          email: session.metadata.customerEmail,
          address: session.metadata.customerAddress,
        },
        items: lineItems,
        total: Number(total.toFixed(2)),
        currency: "USD",
        status: "paid",
      };

      orders.push(order);
      writeOrders(orders);
    }

    res.json(order);
  } catch (err) {
    console.error("Session retrieve error:", err.message);
    res.status(500).json({ error: "Could not confirm order" });
  }
});

module.exports = router;
