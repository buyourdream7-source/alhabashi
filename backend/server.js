const express = require("express");
const cors = require("cors");
const path = require("path");

const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const checkoutRouter = require("./routes/checkout");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api", checkoutRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "alhabashi-backend" });
});

// Serve the frontend as static files so the whole MVP runs from one server.
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Alhabashi backend running on http://localhost:${PORT}`);
});
