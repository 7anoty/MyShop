import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "/shared/supabase-config.js";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const money = new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD" });

const state = {
  products: [],
  states: [],
  query: "",
  previewStateId: "",
  activeProductId: new URLSearchParams(location.search).get("product") || ""
};

const grid = document.querySelector("#productsGrid");
const statePreview = document.querySelector("#statePreview");
const detail = document.querySelector("#productDetail");
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

function productImages(product) {
  const images = Array.isArray(product.product_images)
    ? product.product_images.sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map((image) => image.image_url)
    : [];
  if (product.image_url && !images.includes(product.image_url)) images.unshift(product.image_url);
  return images.filter(Boolean);
}

function mainImage(product) {
  return productImages(product)[0] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80";
}

function mediaHtml(product) {
  if (product.video_url) {
    return `<video class="media" src="${product.video_url}" controls muted playsinline poster="${product.image_url || ""}"></video>`;
  }
  return `<img class="media" src="${mainImage(product)}" alt="${product.name}" />`;
}

function renderProducts() {
  const products = state.products.filter((product) => product.name.toLowerCase().includes(state.query));
  grid.innerHTML = products.length
    ? products
        .map((product, index) => {
          const shipping = selectedShipping();
          const discount = Number(product.discount || 0);
          return `
            <article class="product" data-card="${product.id}" style="animation-delay: ${Math.min(index * 55, 360)}ms">
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
                  <button class="primary" data-open-product="${product.id}">عرض المنتج</button>
                </div>
                <p class="muted">${shipping ? `توصيل ولايتك: ${money.format(shipping.shipping_price)}` : "سعر التوصيل يظهر داخل صفحة المنتج."}</p>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="panel"><p class="muted">لا توجد منتجات مطابقة.</p></div>`;
}

function renderProductDetail() {
  const product = state.products.find((entry) => entry.id === state.activeProductId);
  if (!product) {
    detail.classList.add("hidden");
    document.querySelector("#home").classList.remove("hidden");
    document.querySelector("#products").classList.remove("hidden");
    return;
  }

  const images = productImages(product);
  const selectedImage = images[0] || mainImage(product);
  const discount = Number(product.discount || 0);
  const shipping = selectedShipping(state.previewStateId);

  document.querySelector("#home").classList.add("hidden");
  document.querySelector("#products").classList.add("hidden");
  detail.classList.remove("hidden");
  detail.innerHTML = `
    <button class="ghost detail-back" data-back-products>العودة للمنتجات</button>
    <article class="detail-layout">
      <div class="detail-gallery">
        <div class="detail-main-media">
          <img src="${selectedImage}" alt="${product.name}" data-detail-main-image />
        </div>
        ${
          product.video_url
            ? `<video class="detail-video" src="${product.video_url}" controls playsinline></video>`
            : ""
        }
        <div class="thumb-strip">
          ${images
            .map(
              (image, index) => `
                <button class="thumb ${index === 0 ? "active" : ""}" data-thumb="${image}" type="button">
                  <img src="${image}" alt="${product.name}" />
                </button>
              `
            )
            .join("")}
        </div>
      </div>
      <aside class="detail-buy-panel">
        <span class="kicker">تفاصيل المنتج</span>
        <h1>${product.name}</h1>
        ${discount > 0 ? `<span class="badge">تخفيض ${discount}%</span>` : ""}
        <div class="price-row">
          <div>
            <div class="price">${money.format(finalPrice(product))}</div>
            ${discount > 0 ? `<div class="old-price">${money.format(product.price)}</div>` : ""}
          </div>
        </div>
        <form class="buy-form" data-order-form="${product.id}">
          <input class="input" name="customer_name" placeholder="الاسم الكامل" required />
          <input class="input" name="phone_number" placeholder="رقم الهاتف" required />
          <select class="select" name="state_id" data-detail-state required>${stateOptions(state.previewStateId)}</select>
          <p class="muted" data-detail-shipping>
            ${shipping ? `سعر التوصيل: ${money.format(shipping.shipping_price)}` : "اختر الولاية لعرض سعر التوصيل."}
          </p>
          <button class="primary" type="submit">تأكيد الطلب</button>
        </form>
      </aside>
    </article>
  `;
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
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
    db.from("products").select("*, product_images(*)").order("created_at", { ascending: false }),
    db.from("states").select("*").order("state_name", { ascending: true })
  ]);
  if (productsError || statesError) throw productsError || statesError;
  state.products = products || [];
  state.states = states || [];
  renderStatePreview();
  renderProducts();
  renderProductDetail();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-scroll]");
  const openProductId = event.target.closest("[data-open-product]")?.dataset.openProduct;
  const cardProductId = event.target.closest("[data-card]")?.dataset.card;
  const backProducts = event.target.closest("[data-back-products]");
  const thumb = event.target.closest("[data-thumb]");

  if (target) document.querySelector(`#${target.dataset.scroll}`).scrollIntoView({ behavior: "smooth" });
  if (thumb) {
    document.querySelector("[data-detail-main-image]").src = thumb.dataset.thumb;
    document.querySelectorAll(".thumb").forEach((entry) => entry.classList.toggle("active", entry === thumb));
  }
  if (backProducts) {
    history.pushState({}, "", "/client/");
    state.activeProductId = "";
    renderProductDetail();
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  }
  if (openProductId || (cardProductId && !event.target.closest("button, input, select, textarea, video"))) {
    const id = openProductId || cardProductId;
    history.pushState({}, "", `/client/?product=${encodeURIComponent(id)}`);
    state.activeProductId = id;
    renderProductDetail();
  }
});

document.addEventListener("change", (event) => {
  const detailState = event.target.closest("[data-detail-state]");
  if (!detailState) return;
  state.previewStateId = detailState.value;
  const shipping = selectedShipping(detailState.value);
  document.querySelector("[data-detail-shipping]").textContent = shipping
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

window.addEventListener("popstate", () => {
  state.activeProductId = new URLSearchParams(location.search).get("product") || "";
  renderProductDetail();
});

loadData().catch((error) => showToast(error.message));
