// Point this at your backend if it's not served from the same origin.
const API_BASE = window.location.origin.includes("file://")
  ? "http://localhost:4000/api"
  : "/api";

const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem("alhabashi_cart") || "{}"), // { productId: quantity }
  category: "",
  query: "",
};

const el = {
  grid: document.getElementById("productGrid"),
  cartCount: document.getElementById("cartCount"),
  cartToggle: document.getElementById("cartToggle"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartClose: document.getElementById("cartClose"),
  cartOverlay: document.getElementById("cartOverlay"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  checkoutModal: document.getElementById("checkoutModal"),
  checkoutClose: document.getElementById("checkoutClose"),
  checkoutForm: document.getElementById("checkoutForm"),
  checkoutSummary: document.getElementById("checkoutSummary"),
  checkoutError: document.getElementById("checkoutError"),
  orderConfirmation: document.getElementById("orderConfirmation"),
  orderId: document.getElementById("orderId"),
  continueShoppingBtn: document.getElementById("continueShoppingBtn"),
  searchInput: document.getElementById("searchInput"),
  chips: document.querySelectorAll(".chip"),
};

document.getElementById("year").textContent = new Date().getFullYear();

function saveCart() {
  localStorage.setItem("alhabashi_cart", JSON.stringify(state.cart));
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

async function fetchProducts() {
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.query) params.set("q", state.query);

  try {
    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load products");
    state.products = await res.json();
  } catch (err) {
    el.grid.innerHTML = `<div class="empty-state">Couldn't reach the store backend. Is the server running at ${API_BASE}?</div>`;
    return;
  }
  renderProducts();
}

function renderProducts() {
  if (state.products.length === 0) {
    el.grid.innerHTML = `<div class="empty-state">No products match that search.</div>`;
    return;
  }
  el.grid.innerHTML = state.products
    .map(
      (p) => `
    <article class="product-card">
      <img src="img/${p.image}" alt="${p.name}" loading="lazy">
      <div class="product-card-body">
        <span class="product-category">${p.category}</span>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">${money(p.price)}</span>
          <button class="add-btn" data-id="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>
  `
    )
    .join("");

  el.grid.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.id));
  });
}

function addToCart(productId) {
  state.cart[productId] = (state.cart[productId] || 0) + 1;
  saveCart();
  renderCart();
  openCart();
}

function changeQty(productId, delta) {
  const next = (state.cart[productId] || 0) + delta;
  if (next <= 0) {
    delete state.cart[productId];
  } else {
    state.cart[productId] = next;
  }
  saveCart();
  renderCart();
}

function cartLineItems() {
  return Object.entries(state.cart)
    .map(([productId, quantity]) => {
      const product = state.products.find((p) => p.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter(Boolean);
}

function cartTotal() {
  return cartLineItems().reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
}

function renderCart() {
  const totalCount = Object.values(state.cart).reduce((a, b) => a + b, 0);
  el.cartCount.textContent = totalCount;

  const items = cartLineItems();
  if (items.length === 0) {
    el.cartItems.innerHTML = `<div class="cart-empty">Your cart is empty.</div>`;
    el.checkoutBtn.disabled = true;
  } else {
    el.cartItems.innerHTML = items
      .map(
        ({ product, quantity }) => `
      <div class="cart-item">
        <img src="img/${product.image}" alt="${product.name}">
        <div>
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">${money(product.price)} each</div>
          <div class="qty-controls">
            <button data-action="dec" data-id="${product.id}" aria-label="Decrease quantity">−</button>
            <span>${quantity}</span>
            <button data-action="inc" data-id="${product.id}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div>
          <div>${money(product.price * quantity)}</div>
          <button class="remove-btn" data-action="remove" data-id="${product.id}">Remove</button>
        </div>
      </div>
    `
      )
      .join("");
    el.checkoutBtn.disabled = false;
  }

  el.cartTotal.textContent = money(cartTotal());

  el.cartItems.querySelectorAll("[data-action]").forEach((btn) => {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    btn.addEventListener("click", () => {
      if (action === "inc") changeQty(id, 1);
      if (action === "dec") changeQty(id, -1);
      if (action === "remove") {
        delete state.cart[id];
        saveCart();
        renderCart();
      }
    });
  });
}

function openCart() {
  el.cartDrawer.classList.add("open");
  el.cartOverlay.classList.add("visible");
}
function closeCart() {
  el.cartDrawer.classList.remove("open");
  el.cartOverlay.classList.remove("visible");
}

el.cartToggle.addEventListener("click", openCart);
el.cartClose.addEventListener("click", closeCart);
el.cartOverlay.addEventListener("click", () => {
  closeCart();
  closeCheckout();
});

/* ---------- Checkout ---------- */
function openCheckout() {
  el.checkoutForm.hidden = false;
  el.orderConfirmation.hidden = true;
  el.checkoutError.textContent = "";
  const items = cartLineItems();
  el.checkoutSummary.innerHTML =
    items
      .map(
        ({ product, quantity }) =>
          `<div class="line"><span>${product.name} × ${quantity}</span><span>${money(product.price * quantity)}</span></div>`
      )
      .join("") + `<div class="line total"><span>Total</span><span>${money(cartTotal())}</span></div>`;
  el.checkoutModal.classList.add("open");
  el.cartOverlay.classList.add("visible");
}
function closeCheckout() {
  el.checkoutModal.classList.remove("open");
  if (!el.cartDrawer.classList.contains("open")) {
    el.cartOverlay.classList.remove("visible");
  }
}

el.checkoutBtn.addEventListener("click", () => {
  closeCart();
  openCheckout();
});
el.checkoutClose.addEventListener("click", closeCheckout);
el.continueShoppingBtn.addEventListener("click", () => {
  closeCheckout();
});

el.checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.checkoutError.textContent = "";
  const formData = new FormData(el.checkoutForm);
  const customer = {
    name: formData.get("name"),
    email: formData.get("email"),
    address: formData.get("address"),
  };
  const items = cartLineItems().map(({ product, quantity }) => ({
    productId: product.id,
    quantity,
  }));

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");

    state.cart = {};
    saveCart();
    renderCart();

    el.checkoutForm.hidden = true;
    el.orderConfirmation.hidden = false;
    el.orderId.textContent = data.id;
  } catch (err) {
    el.checkoutError.textContent = err.message;
  }
});

/* ---------- Filters ---------- */
el.chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    el.chips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.category = chip.dataset.category;
    fetchProducts();
  });
});

let searchTimer;
el.searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = e.target.value.trim();
    fetchProducts();
  }, 250);
});

/* ---------- Init ---------- */
fetchProducts();
renderCart();
