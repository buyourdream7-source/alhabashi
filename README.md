# Alhabashi — MVP

A minimal e-commerce storefront: browse products, add to cart, and place an order.

## Structure

```
alhabashi/
├── backend/     Node.js + Express API (also serves the frontend)
│   ├── server.js
│   ├── routes/products.js   GET /api/products, GET /api/products/:id
│   ├── routes/orders.js     POST /api/orders, GET /api/orders/:id
│   └── data/products.json   product catalog (edit this to add/change products)
└── frontend/    Plain HTML/CSS/JS storefront (no build step)
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## Run it

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:4000** in your browser — the backend serves the frontend directly, so that's the only URL you need.

## What's included (MVP scope)

- Product catalog with search and category filtering
- Shopping cart (persisted in the browser via localStorage)
- Checkout that creates a real order against the backend, checks stock, and returns a confirmation number
- Orders are saved to `backend/data/orders.json` as they come in

## What's intentionally left out (next steps)

- Payment processing (Stripe/PayPal integration) — right now "placing an order" records it but doesn't charge a card
- Customer accounts / login
- An admin screen for managing products and viewing orders (currently: edit `products.json` directly, read `orders.json` directly)
- A real database (currently flat JSON files — fine for an MVP, worth swapping for Postgres/SQLite once you have real traffic)
- Email confirmations to customers

## Customizing

- **Products**: edit `backend/data/products.json`. Each product needs `id`, `name`, `category`, `price`, `description`, `image` (a filename from `frontend/img/`), and `stock`.
- **Branding**: colors and fonts are defined as CSS variables at the top of `frontend/css/style.css`.
- **Deploying**: this can be deployed as-is to any Node host (Render, Railway, a VPS). Point `API_BASE` in `frontend/js/app.js` at your backend's URL if you ever split the frontend onto a separate static host.
deploy trigger
deploy trigger