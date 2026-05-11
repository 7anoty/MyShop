import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "supabase-config.js";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const money = new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD" });

const state = {
  products: [],
  states: [],
  query: "",
  previewStateId: ""
};

const grid = document.querySelector("#productsGrid");
const statePreview = document.querySelector("#statePreview");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2800);
}

function finalPrice(product) {
  const discount = Number(product.discount || 0);
  return Number(product.price) * (1 - discount / 100);
}

function selectedShipping(productStateId) {
  const id = productStateId || state.previewStateId;
  return state.states.find((entry) => entry.id === id);
}

function stateOptions(selectedId = "") {
  return `<option value="">اختر الولاية</option>${state.states
    .map((entry) => `<option value="${entry.id}" ${entry.id === selectedId ? "selected" : ""}>${entry.state_name}</option>`)
    .join("")}`;
}

function mediaHtml(product) {
  if (product.video_url) {
    return `<video class="media" src="${product.video_url}" controls muted playsinline poster="${product.image_url || ""}"></video>`;
  }
  return `<img class="media" src="${product.image_url || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80"}" alt="${product.name}" />`;
}

function renderProducts() {
  const products = state.products.filter((product) => product.name.toLowerCase().includes(state.query));
  grid.innerHTML = products.length
    ? products
        .map((product) => {
          const shipping = selectedShipping();
          const discount = Number(product.discount || 0);
          return `
            <article class="product" data-card="${product.id}">
              ${mediaHtml(product)}
              <div class="product-body">
                <div class="actions">
                  ${discount > 0 ? `<span class="badge">تخفيض ${discount}%</span>` : ""}
                </div>
                <h3>${product.name}</h3>
                <div class="price-row">
                  <div>
                    <div class="price">${money.format(finalPrice(product))}</div>
                    ${discount > 0 ? `<div class="old-price">${money.format(product.price)}</div>` : ""}
                  </div>
                  <button class="primary" data-buy="${product.id}">شراء</button>
                </div>
                <label class="muted" for="state-${product.id}">الولاية وسعر التوصيل</label>
                <select class="select" id="state-${product.id}" data-card-state="${product.id}">
                  ${stateOptions(state.previewStateId)}
                </select>
                <p class="muted" data-shipping="${product.id}">
                  ${shipping ? `سعر التوصيل: ${money.format(shipping.shipping_price)}` : "اختر الولاية لعرض سعر التوصيل."}
                </p>
                <form class="buy-form hidden" data-order-form="${product.id}">
                  <input class="input" name="customer_name" placeholder="الاسم الكامل" required />
                  <input class="input" name="phone_number" placeholder="رقم الهاتف" required />
                  <select class="select" name="state_id" required>${stateOptions(state.previewStateId)}</select>
                  <button class="secondary" type="submit">تأكيد الطلب</button>
                </form>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="panel"><p class="muted">لا توجد منتجات مطابقة.</p></div>`;
}

function renderStatePreview() {
  statePreview.innerHTML = stateOptions(state.previewStateId);
}

async function loadData() {
  if (!isSupabaseConfigured()) {
    grid.innerHTML = `<div class="panel"><h3>أكمل إعداد Supabase</h3><p class="muted">ضع رابط المشروع ومفتاح anon في public/shared/supabase-config.js ثم شغل SQL الموجود في supabase.sql.</p></div>`;
    return;
  }

  const [{ data: products, error: productsError }, { data: states, error: statesError }] = await Promise.all([
    db.from("products").select("*").order("created_at", { ascending: false }),
    db.from("states").select("*").order("state_name", { ascending: true })
  ]);
  if (productsError || statesError) throw productsError || statesError;
  state.products = products || [];
  state.states = states || [];
  renderStatePreview();
  renderProducts();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-scroll]");
  const buyId = event.target.closest("[data-buy]")?.dataset.buy;
  if (target) document.querySelector(`#${target.dataset.scroll}`).scrollIntoView({ behavior: "smooth" });
  if (buyId) document.querySelector(`[data-order-form="${buyId}"]`).classList.toggle("hidden");
});

document.addEventListener("change", (event) => {
  const productId = event.target.closest("[data-card-state]")?.dataset.cardState;
  if (!productId) return;
  const formSelect = document.querySelector(`[data-order-form="${productId}"] select[name="state_id"]`);
  formSelect.value = event.target.value;
  const shipping = selectedShipping(event.target.value);
  document.querySelector(`[data-shipping="${productId}"]`).textContent = shipping
    ? `سعر التوصيل: ${money.format(shipping.shipping_price)}`
    : "اختر الولاية لعرض سعر التوصيل.";
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-order-form]");
  if (!form) return;
  event.preventDefault();
  const productId = form.dataset.orderForm;
  const formData = Object.fromEntries(new FormData(form).entries());
  const wilaya = selectedShipping(formData.state_id);
  if (!wilaya) return showToast("اختر الولاية أولًا.");

  const { error } = await db.from("orders").insert({
    product_id: productId,
    customer_name: formData.customer_name,
    phone_number: formData.phone_number,
    state_id: wilaya.id,
    shipping_price: wilaya.shipping_price
  });

  if (error) return showToast(error.message);
  form.reset();
  form.classList.add("hidden");
  showToast("تم تسجيل طلبك بنجاح.");
});

document.querySelector("#searchInput").addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  renderProducts();
});

statePreview.addEventListener("change", (event) => {
  state.previewStateId = event.target.value;
  renderProducts();
});

loadData().catch((error) => showToast(error.message));
