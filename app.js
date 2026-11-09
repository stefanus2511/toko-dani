import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDp-yVYrMzF1a84i-3_GcBlIsAk_rg1Zdk",
  authDomain: "toko-dani-77a00.firebaseapp.com",
  projectId: "toko-dani-77a00",
  storageBucket: "toko-dani-77a00.firebasestorage.app",
  messagingSenderId: "450873334306",
  appId: "1:450873334306:web:58eff76efbe18159d1487b",
  measurementId: "G-S9H7QL11LT",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// DOM Helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Formatter Helpers
const num = (n) => Number(n) || 0;
const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num(n));

const rawNumber = (n) => String(num(n));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

const dateFmt = (v) => {
  const d = v?.toDate
    ? v.toDate()
    : v instanceof Date
      ? v
      : new Date(v || Date.now());
  return isNaN(d)
    ? "-"
    : new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
};

const getTodayDateString = () => {
  const now = new Date();
  return now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
};

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Default Products for starter/demo
const DEFAULT_PRODUCTS = [
  {
    name: "Minyak Goreng Sania 1L",
    code: "8992775211012",
    category: "Sembako",
    buyPrice: 14500,
    sellPrice: 16500,
    warehouse: 10,
    display: 3,
    minStock: 5,
    baseUnit: "pch",
  },
  {
    name: "Beras Ramos Setra 5kg",
    code: "8999908123451",
    category: "Sembako",
    buyPrice: 60000,
    sellPrice: 68000,
    warehouse: 20,
    display: 28,
    minStock: 5,
    baseUnit: "krg",
  },
  {
    name: "Gula Gulaku Kuning 1kg",
    code: "8993175110023",
    category: "Sembako",
    buyPrice: 15500,
    sellPrice: 17500,
    warehouse: 15,
    display: 45,
    minStock: 10,
    baseUnit: "bks",
  },
  {
    name: "Teh Celup Sariwangi 25ct",
    code: "8999999012345",
    category: "Minuman",
    buyPrice: 5500,
    sellPrice: 7000,
    warehouse: 25,
    display: 30,
    minStock: 5,
    baseUnit: "kotak",
  },
  {
    name: "Telur Ayam Negeri 1kg",
    code: "TK-2024102401",
    category: "Sembako",
    buyPrice: 25000,
    sellPrice: 28000,
    warehouse: 5,
    display: 6,
    minStock: 10,
    baseUnit: "kg",
  },
  {
    name: "Mie Sedap Ayam Krispi",
    code: "8998866200213",
    category: "Snack",
    buyPrice: 2900,
    sellPrice: 3500,
    warehouse: 40,
    display: 80,
    minStock: 15,
    baseUnit: "bks",
  },
];

// Application State
const state = {
  page: "kasir", // 'kasir' | 'tambah-barang' | 'stok-barang' | 'keuangan'
  products: [],
  categories: ["Sembako", "Minuman", "Snack", "Sabun & Cuci", "Lain-lain"],
  transactions: [],
  expenses: [],
  stockMovements: [],
  settings: {
    storeName: "Toko Dani",
    address: "",
    phone: "",
    receiptFooter: "Terima kasih telah berbelanja di Toko Dani",
  },
  cart: [
    { id: "demo-1", name: "Minyak Goreng 1L", price: 16500, qty: 2 },
    { id: "demo-3", name: "Gula Pasir 1kg", price: 17500, qty: 2 },
    { id: "demo-4", name: "Teh Celup Sariwangi", price: 7000, qty: 1 },
  ],
  search: "",
  category: "",
  stockFilter: "all", // 'all' | 'warning' | 'empty'
  stockSearch: "",
  discount: 3500,
  received: 75000, // Raw number without dots!
  busy: false,
  scannerStream: null,
  scannerFrame: 0,
  // Financial filters:
  periodMode: "today", // 'today' | 'custom'
  customSubmode: "single", // 'single' | 'range' | 'month'
  singleDate: new Date().toISOString().slice(0, 10),
  rangeStart: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
  rangeEnd: new Date().toISOString().slice(0, 10),
  filterMonth: new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  }),
  // Modal targets
  restockTarget: null,
  activeTransaction: null,
};

// UI Notifications
function toast(message, icon = "check_circle") {
  const el = $("#toast");
  const msgEl = $("#toast-msg");
  const iconEl = $("#toast-icon");
  if (!el || !msgEl) return;
  msgEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;
  el.classList.remove("opacity-0", "-translate-y-2", "pointer-events-none");
  el.classList.add("opacity-100", "translate-y-0");
  setTimeout(() => {
    el.classList.remove("opacity-100", "translate-y-0");
    el.classList.add("opacity-0", "-translate-y-2", "pointer-events-none");
  }, 2200);
}

// Data synchronization with Firebase Firestore
async function loadAll() {
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
    const names = ["products", "transactions", "expenses", "stockMovements"];
    const vals = await Promise.all(
      names.map((n) => getDocs(collection(db, n))),
    );
    const [prodDocs, transDocs, expDocs, moveDocs] = vals;

    state.products = prodDocs.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.transactions = transDocs.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.expenses = expDocs.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.stockMovements = moveDocs.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // Populate initial starter products if database has none
    if (!state.products.length) {
      for (const p of DEFAULT_PRODUCTS) {
        const ref = await addDoc(collection(db, "products"), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        state.products.push({ id: ref.id, ...p });
      }
    }

    // Set demo cart item IDs to match actual loaded products
    if (state.products.length >= 3 && state.cart[0]?.id?.startsWith("demo-")) {
      state.cart = [
        {
          id: state.products[0].id,
          name: state.products[0].name,
          price: state.products[0].sellPrice,
          qty: 2,
        },
        {
          id: state.products[2]?.id || state.products[1].id,
          name: state.products[2]?.name || state.products[1].name,
          price: state.products[2]?.sellPrice || state.products[1].sellPrice,
          qty: 2,
        },
        {
          id: state.products[3]?.id || state.products[0].id,
          name: state.products[3]?.name || state.products[0].name,
          price: state.products[3]?.sellPrice || state.products[0].sellPrice,
          qty: 1,
        },
      ];
    }

    const st = await getDoc(doc(db, "settings", "main"));
    if (st.exists()) {
      state.settings = { ...state.settings, ...st.data() };
    }

    const dot = $("#connection-dot");
    if (dot) {
      dot.className =
        "inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 transition-colors";
      dot.title = "Firestore Terhubung";
    }
  } catch (err) {
    console.warn("Firestore connection notice:", err);
    // Fallback to local default data for seamless offline UI testing
    if (!state.products.length) {
      state.products = DEFAULT_PRODUCTS.map((p, i) => ({
        id: `local-${i}`,
        ...p,
      }));
    }
    const dot = $("#connection-dot");
    if (dot) {
      dot.className =
        "inline-block w-2.5 h-2.5 rounded-full bg-amber-400 transition-colors";
      dot.title = "Mode Lokal / Offline";
    }
  } finally {
    updateTopBar();
    render();
  }
}

// Total stock helper
const totalStock = (p) => num(p.warehouse) + num(p.display);
const isLowStock = (p) => totalStock(p) <= num(p.minStock) && totalStock(p) > 0;
const isEmptyStock = (p) => totalStock(p) <= 0;

// Update TopBar text & active bottom nav state
function updateTopBar() {
  const storeNameEl = $("#top-store-name");
  const dateLabelEl = $("#top-date-label");
  const pageTitleEl = $("#top-page-title");

  if (storeNameEl)
    storeNameEl.textContent = state.settings.storeName || "Toko Dani";
  if (dateLabelEl) dateLabelEl.textContent = getTodayDateString();

  const titles = {
    kasir: "Kasir",
    "tambah-barang": "Tambah Barang",
    "stok-barang": "Stok Barang",
    keuangan: "Keuangan & Laporan",
  };
  if (pageTitleEl) pageTitleEl.textContent = titles[state.page] || "Kasir";

  $$("#bottom-nav .nav-tab-item").forEach((a) => {
    const active = a.dataset.path === state.page;
    a.classList.toggle("active", active);
  });
}

// Switch Page
window.pindahHalaman = (path) => {
  if (state.page === path) return;
  state.page = path;
  updateTopBar();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ========================================================
// 1. HALAMAN KASIR (POS) - MOBILE TUNED
// ========================================================

// Generator baris keranjang belanja
function renderCartRowsHtml() {
  if (!state.cart.length) {
    return `<div class="py-4 text-center text-text-muted-ink text-[12.5px]">Keranjang kosong. Pilih barang di atas.</div>`;
  }
  return state.cart
    .map(
      (item) => `
    <div class="flex items-center justify-between py-1 border-b border-border-warm-subtle/60 last:border-b-0">
      <div class="flex flex-col min-w-0 pr-2">
        <span class="text-[12.5px] font-semibold text-on-surface truncate">${esc(item.name)}</span>
        <span class="text-[11px] text-on-surface-variant">${money(item.price)} × ${item.qty}</span>
        <span class="text-[12.5px] font-bold text-primary">${money(item.price * item.qty)}</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <div class="flex items-center bg-surface-sand rounded-lg p-0.5 border border-border-warm/70">
          <button aria-label="Kurangi" class="w-5 h-5 rounded bg-surface-container-lowest hover:bg-surface-sand text-on-surface flex items-center justify-center active:scale-95 transition-transform" type="button" onclick="window.ubahQtyKeranjang('${item.id}', -1)">
            <span class="material-symbols-outlined text-[13px]">remove</span>
          </button>
          <span class="w-5 text-center text-[12px] font-bold text-on-surface">${item.qty}</span>
          <button aria-label="Tambah" class="w-5 h-5 rounded bg-surface-container-lowest hover:bg-surface-sand text-primary flex items-center justify-center active:scale-95 transition-transform" type="button" onclick="window.ubahQtyKeranjang('${item.id}', 1)">
            <span class="material-symbols-outlined text-[13px]">add</span>
          </button>
        </div>
        <button aria-label="Hapus" class="w-5 h-5 rounded-lg text-outline hover:text-error hover:bg-danger-soft-bg flex items-center justify-center transition-colors" type="button" onclick="window.hapusDariKeranjang('${item.id}')">
          <span class="material-symbols-outlined text-[14px]">delete</span>
        </button>
      </div>
    </div>`,
    )
    .join("");
}

// Update DOM keranjang kasir secara presisi tanpa me-reset halaman / animasi
function updateKasirCartInPlace() {
  if (state.page !== "kasir" || !$("#cart-items-list")) {
    render();
    return;
  }

  const subtotal = state.cart.reduce((a, x) => a + x.qty * x.price, 0);
  const discount = Math.min(subtotal, num(state.discount));
  const grand = Math.max(0, subtotal - discount);
  const received = num(state.received);
  const kembalian = Math.max(0, received - grand);

  // 1. Update List Item & Badge
  const cartList = $("#cart-items-list");
  if (cartList) cartList.innerHTML = renderCartRowsHtml();

  const countBadge = $("#cart-badge-count");
  if (countBadge) countBadge.textContent = `${state.cart.length} item`;

  const clearBtnWrapper = $("#cart-clear-btn-wrapper");
  if (clearBtnWrapper) {
    clearBtnWrapper.innerHTML = state.cart.length
      ? `<button type="button" class="text-[11.5px] text-danger-solid hover:underline font-semibold" onclick="window.kosongkanKeranjang()">Kosongkan</button>`
      : "";
  }

  // 2. Update Ringkasan Tagihan
  const subtotalEl = $("#label-subtotal-val");
  if (subtotalEl) subtotalEl.textContent = money(subtotal);

  const grandEl = $("#label-grand-val");
  if (grandEl) grandEl.textContent = money(grand);

  const uangPasText = $("#label-uang-pas-btn");
  if (uangPasText) uangPasText.textContent = `Uang Pas (${money(grand)})`;

  const uangPasBtn = $("#btn-uang-pas");
  if (uangPasBtn)
    uangPasBtn.setAttribute("onclick", `window.setUangPas(${grand})`);

  const kembalianEl = $("#label-kembalian");
  if (kembalianEl) kembalianEl.textContent = money(kembalian);

  // 3. Update Tombol Bayar
  const btnBayar = $("#btn-proses-bayar");
  const labelBayar = $("#label-bayar-btn");
  if (labelBayar)
    labelBayar.textContent = state.busy
      ? "Memproses..."
      : `Bayar ${money(grand)}`;
  if (btnBayar) {
    if (!state.cart.length || state.busy) {
      btnBayar.disabled = true;
      btnBayar.classList.add("opacity-60", "cursor-not-allowed");
    } else {
      btnBayar.disabled = false;
      btnBayar.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }
}

function renderKasir() {
  const filteredProducts = state.products.filter((p) => {
    if (p.archived) return false;
    const matchSearch =
      !state.search ||
      `${p.name} ${p.code || ""}`
        .toLowerCase()
        .includes(state.search.toLowerCase());
    const matchCategory = !state.category || p.category === state.category;
    return matchSearch && matchCategory;
  });

  const subtotal = state.cart.reduce((a, x) => a + x.qty * x.price, 0);
  const discount = Math.min(subtotal, num(state.discount));
  const grand = Math.max(0, subtotal - discount);
  const received = num(state.received);
  const kembalian = Math.max(0, received - grand);

  // Category chips
  const categoryChips = [
    `<button type="button" class="px-2.5 py-1 rounded-full text-[12px] font-semibold shrink-0 shadow-xs transition-transform active:scale-95 flex items-center gap-1 ${
      !state.category
        ? "bg-primary text-on-primary"
        : "bg-surface-container-warm hover:bg-surface-sand text-on-surface-variant border border-border-warm-subtle"
    }" onclick="window.setPosCategory('')"><span class="material-symbols-outlined text-[15px]">apps</span> Semua</button>`,
    ...state.categories.map((c) => {
      const active = state.category === c;
      return `<button type="button" class="px-2.5 py-1 rounded-full text-[12px] font-medium shrink-0 border border-border-warm-subtle transition-colors flex items-center gap-1 ${
        active
          ? "bg-primary text-on-primary font-semibold"
          : "bg-surface-container-warm hover:bg-surface-sand text-on-surface-variant"
      }" onclick="window.setPosCategory('${esc(c)}')">${esc(c)}</button>`;
    }),
  ].join("");

  // Product cards
  const productCards = filteredProducts.length
    ? filteredProducts
        .map((p) => {
          const stock = totalStock(p);
          return `
      <div class="product-card bg-surface-container-lowest p-2 rounded-xl border border-border-warm-subtle flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors">
        <div class="flex flex-col mb-1.5">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-sand text-text-muted-ink border border-border-warm-subtle truncate max-w-[70px]">${esc(p.category || "Umum")}</span>
            <span class="text-[10.5px] font-semibold ${stock <= num(p.minStock) ? "text-danger-solid" : "text-green-badge-text"}">Stok: ${stock}</span>
          </div>
          <h4 class="text-[12.5px] font-bold text-on-surface line-clamp-2 leading-tight">${esc(p.name)}</h4>
          <span class="text-[13.5px] font-extrabold text-primary mt-1">${money(p.sellPrice)}</span>
        </div>
        <button class="w-full h-7 bg-surface-sand hover:bg-primary hover:text-on-primary text-primary rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1 border border-border-warm-subtle transition-colors active:scale-95" type="button" onclick="window.tambahKeKeranjang('${p.id}')">
          <span class="material-symbols-outlined text-[15px]">add</span> Tambah
        </button>
      </div>`;
        })
        .join("")
    : `<div class="col-span-2 py-6 text-center text-text-muted-ink text-[13px]">Barang tidak ditemukan.</div>`;

  // Cart rows generator
  const cartRows = renderCartRowsHtml();

  return `
  <div class="flex flex-col w-full gap-2.5">
    <!-- SEARCH & SCAN: Input Lebih Lebar & Tombol Barcode di Bawah Input -->
    <div class="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-border-warm-subtle flex flex-col gap-2">
      <!-- Input Pencarian Lebar Penuh (100%) - Tanpa Border Kotak -->
      <div id="pos-search-wrapper" class="input-box-wrapper w-full flex items-center bg-surface-sand/65 px-3 rounded-xl h-10.5 border-0 focus-within:bg-surface-cream transition-all">
        <span class="material-symbols-outlined text-outline text-[19px] mr-2 shrink-0">search</span>
        <input class="w-full bg-transparent text-[13.5px] text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none border-0" id="pos-search-input" placeholder="Cari nama barang atau ketik barcode..." type="text" value="${esc(state.search)}" oninput="window.handlePosSearch(this.value)">
        ${
          state.search
            ? `<button type="button" class="text-text-muted-ink hover:text-danger-solid p-1" onclick="window.clearSearch()"><span class="material-symbols-outlined text-[16px]">close</span></button>`
            : ""
        }
      </div>

      <!-- Tombol Barcode di Bawah Input & Filter Kategori -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button class="h-7.5 px-3 bg-surface-container-warm hover:bg-surface-container text-primary font-semibold text-[11.5px] rounded-full flex items-center gap-1 border border-border-warm-subtle transition-colors shrink-0 shadow-xs active:scale-95" type="button" onclick="window.startBarcodeScanner()">
          <span class="material-symbols-outlined text-[16px] text-primary">barcode_scanner</span>
          <span>Scan Barcode</span>
        </button>
        <div class="h-4 w-px bg-border-warm/70 shrink-0"></div>
        ${categoryChips}
      </div>
    </div>

    <!-- KATALOG PRODUK CEPAT -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-0.5">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-primary text-[17px]">verified</span>
          <h3 class="text-[13.5px] font-bold text-on-surface">Produk Toko</h3>
        </div>
        <span class="text-[11.5px] text-on-surface-variant font-medium">${filteredProducts.length} item</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        ${productCards}
      </div>
    </div>

    <!-- KERANJANG PESANAN -->
    <div class="bg-surface-container-lowest p-2.5 rounded-xl border border-border-warm-subtle shadow-xs flex flex-col gap-1.5">
      <div class="flex items-center justify-between pb-1 border-b border-border-warm-subtle">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-primary text-[17px]">shopping_bag</span>
          <h3 class="text-[13px] font-bold text-on-surface">Pesanan</h3>
          <span id="cart-badge-count" class="text-[10.5px] px-1.5 py-0.2 rounded-full bg-surface-sand text-on-surface-variant font-medium border border-border-warm-subtle">${state.cart.length} item</span>
        </div>
        <div id="cart-clear-btn-wrapper">
          ${
            state.cart.length
              ? `<button type="button" class="text-[11.5px] text-danger-solid hover:underline font-semibold" onclick="window.kosongkanKeranjang()">Kosongkan</button>`
              : ""
          }
        </div>
      </div>
      <div id="cart-items-list" class="flex flex-col">
        ${cartRows}
      </div>
    </div>

    <!-- RINGKASAN PEMBAYARAN: Bersih Tanpa Teks Diskon Ganda & Opsi Uang Pas / Nominal Polos -->
    <div class="bg-surface-container-lowest p-3 rounded-xl border border-border-warm-subtle shadow-xs flex flex-col gap-2.5">
      <!-- Subtotal & Diskon (HANYA SATU BARIS DISKON BERSIH) -->
      <div class="flex flex-col gap-1 pb-1.5 border-b border-border-warm-subtle text-[12.5px]">
        <div class="flex justify-between items-center text-on-surface-variant">
          <span>Subtotal</span>
          <span class="font-bold text-on-surface" id="label-subtotal-val">${money(subtotal)}</span>
        </div>
        <div class="flex justify-between items-center text-secondary">
          <label for="pos-discount" class="flex items-center gap-1 font-semibold cursor-pointer">
            <span class="material-symbols-outlined text-[15px]">local_offer</span> Diskon
          </label>
          <div class="flex items-center gap-1">
            <span class="font-bold text-[12px]">- Rp</span>
            <input class="w-20 text-right bg-surface-sand border border-border-warm rounded-lg px-2 py-0.5 text-[12.5px] font-bold text-secondary focus:outline-none focus:border-secondary" id="pos-discount" type="number" min="0" placeholder="0" value="${state.discount ? num(state.discount) : ""}" oninput="window.setDiskon(this.value)">
          </div>
        </div>
      </div>

      <!-- Total Tagihan -->
      <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-sand/80 border border-border-warm">
        <span class="text-[13px] font-bold text-on-surface">Total Tagihan</span>
        <span class="text-[17px] font-extrabold text-primary tracking-tight" id="label-grand-val">${money(grand)}</span>
      </div>

      <!-- OPSI PEMBAYARAN TUNAI: HANYA 2 OPSI ("Uang Pas" dan "Ketik Nominal") -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[11.5px] font-semibold text-on-surface-variant">Pilihan Uang Tunai:</span>
        <div class="grid grid-cols-2 gap-1.5">
          <button id="btn-uang-pas" class="h-9 bg-surface-sand hover:bg-surface-container-warm text-on-surface rounded-lg text-[12px] font-bold border border-border-warm transition-colors active:scale-95 flex items-center justify-center gap-1" onclick="window.setUangPas(${grand})" type="button">
            <span class="material-symbols-outlined text-[15px] text-primary">payments</span>
            <span id="label-uang-pas-btn">Uang Pas (${money(grand)})</span>
          </button>
          <button class="h-9 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[12px] font-bold border border-primary/30 transition-colors active:scale-95 flex items-center justify-center gap-1" onclick="window.fokusNominal()" type="button">
            <span class="material-symbols-outlined text-[15px]">edit</span>
            <span>Ketik Nominal</span>
          </button>
        </div>
      </div>

      <!-- INPUT UANG DITERIMA: TIDAK DITITIKIN (Misal 10000 tetap 10000) -->
      <div class="flex flex-col gap-1">
        <div class="input-box-wrapper flex items-center justify-between bg-surface-sand/70 px-2.5 rounded-lg h-9.5 border border-border-warm focus-within:border-primary/60 transition-colors">
          <span class="text-[12px] text-on-surface-variant font-medium flex items-center gap-1">
            <span class="material-symbols-outlined text-[15px] text-outline">point_of_sale</span> Uang Diterima
          </span>
          <div class="flex items-center gap-1 font-bold text-on-surface">
            <span class="text-[12.5px] text-on-surface-variant">Rp</span>
            <input class="w-24 text-right bg-transparent text-[14px] font-extrabold text-on-surface focus:outline-none border-0" id="uang-diterima" type="number" min="0" placeholder="0" value="${state.received ? num(state.received) : ""}" oninput="window.setUangDiterima(this.value)">
          </div>
        </div>

        <!-- Kembalian -->
        <div class="flex items-center justify-between px-2.5 py-1 rounded-lg bg-green-badge-bg/70 border border-primary/25">
          <div class="flex items-center gap-1 text-primary">
            <span class="material-symbols-outlined text-[15px]">savings</span>
            <span class="text-[11.5px] font-semibold">Kembalian</span>
          </div>
          <span class="text-[13.5px] font-extrabold text-primary" id="label-kembalian">${money(kembalian)}</span>
        </div>
      </div>
    </div>

    <!-- TOMBOL AKSI UTAMA -->
    <div class="flex flex-col gap-1.5 pt-0.5 pb-2">
      <button id="btn-proses-bayar" class="w-full h-11 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-[14.5px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] ${
        !state.cart.length || state.busy ? "opacity-60 cursor-not-allowed" : ""
      }" type="button" onclick="window.prosesPembayaran()" ${!state.cart.length || state.busy ? "disabled" : ""}>
        <span class="material-symbols-outlined text-[19px]">check_circle</span>
        <span id="label-bayar-btn">${state.busy ? "Memproses..." : `Bayar ${money(grand)}`}</span>
      </button>
      <div class="grid grid-cols-2 gap-1.5">
        <button class="h-9 bg-surface-container-lowest hover:bg-surface-sand text-on-surface border border-border-warm rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors active:scale-95" type="button" onclick="window.cetakNotaTerakhir()">
          <span class="material-symbols-outlined text-outline text-[15px]">receipt</span>
          <span>Cetak Nota</span>
        </button>
        <button class="h-9 bg-surface-container-lowest hover:bg-danger-soft-bg text-outline hover:text-error border border-border-warm rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors active:scale-95" type="button" onclick="window.kosongkanKeranjang()">
          <span class="material-symbols-outlined text-[15px]">close</span>
          <span>Batal</span>
        </button>
      </div>
    </div>
  </div>`;
}

// POS Handlers
window.handlePosSearch = (val) => {
  state.search = val;
  const input = $("#pos-search-input");
  const pos = input ? input.selectionStart : null;
  render();
  const newInput = $("#pos-search-input");
  if (newInput && pos !== null) {
    newInput.focus();
    newInput.setSelectionRange(pos, pos);
  }
};

window.clearSearch = () => {
  state.search = "";
  render();
  $("#pos-search-input")?.focus();
};

window.setPosCategory = (cat) => {
  state.category = cat;
  render();
};

window.tambahKeKeranjang = (productId) => {
  const prod = state.products.find((p) => p.id === productId);
  if (!prod) return;
  const exist = state.cart.find((i) => i.id === productId);
  if (exist) {
    exist.qty += 1;
  } else {
    state.cart.push({
      id: prod.id,
      name: prod.name,
      price: num(prod.sellPrice),
      qty: 1,
    });
  }
  toast(`${prod.name} ditambahkan!`);
  updateKasirCartInPlace();
};

window.ubahQtyKeranjang = (id, delta) => {
  const item = state.cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter((i) => i.id !== id);
  }
  updateKasirCartInPlace();
};

window.hapusDariKeranjang = (id) => {
  state.cart = state.cart.filter((i) => i.id !== id);
  updateKasirCartInPlace();
};

window.kosongkanKeranjang = () => {
  state.cart = [];
  state.discount = 0;
  state.received = 0;
  const posDisc = $("#pos-discount");
  if (posDisc) posDisc.value = "";
  const uangRec = $("#uang-diterima");
  if (uangRec) uangRec.value = "";
  toast("Keranjang dikosongkan");
  updateKasirCartInPlace();
};

window.setDiskon = (val) => {
  state.discount = num(val);
  updateKasirCartInPlace();
};

// Pilihan Uang: Uang Pas
window.setUangPas = (total) => {
  state.received = total;
  const inputUang = $("#uang-diterima");
  if (inputUang) {
    inputUang.value = rawNumber(total); // Plain number, NO DOTS!
  }
  updateKasirCartInPlace();
};

// Pilihan Uang: Ketik Nominal
window.fokusNominal = () => {
  const input = $("#uang-diterima");
  if (input) {
    input.focus();
    input.select();
  }
};

// Input Uang Diterima: update value without dots
window.setUangDiterima = (val) => {
  state.received = num(val);
  updateKasirCartInPlace();
};

// Proses Pembayaran Kasir
window.prosesPembayaran = async () => {
  if (!state.cart.length)
    return toast("Keranjang belanja masih kosong!", "warning");
  const subtotal = state.cart.reduce((a, x) => a + x.qty * x.price, 0);
  const discount = Math.min(subtotal, num(state.discount));
  const grand = Math.max(0, subtotal - discount);
  const received = num(state.received);

  if (received < grand) {
    return alert(
      `Uang yang diterima masih kurang!\nTotal: ${money(grand)}\nDiterima: ${money(received)}`,
    );
  }

  state.busy = true;
  render();

  try {
    const number = `TD-${Date.now().toString().slice(-8)}`;
    const change = received - grand;
    const transData = {
      number,
      items: state.cart.map((i) => ({ ...i })),
      subtotal,
      discount,
      total: grand,
      costTotal: state.cart.reduce((acc, item) => {
        const p = state.products.find((prod) => prod.id === item.id);
        return acc + num(p?.buyPrice) * item.qty;
      }, 0),
      paymentMethod: "Tunai",
      received,
      change,
      status: "selesai",
      createdAt: serverTimestamp(),
    };

    // Save transaction to Firestore
    try {
      await addDoc(collection(db, "transactions"), transData);
    } catch (dbErr) {
      console.warn("Firestore save fallback to local:", dbErr);
    }

    // Update local product stocks
    state.cart.forEach((item) => {
      const p = state.products.find((prod) => prod.id === item.id);
      if (p) {
        p.display = Math.max(0, num(p.display) - item.qty);
        try {
          if (!item.id.startsWith("local-") && !item.id.startsWith("demo-")) {
            updateDoc(doc(db, "products", item.id), {
              display: p.display,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (_) {}
      }
    });

    const completed = {
      ...transData,
      id: number,
      createdAt: new Date(),
    };
    state.transactions.unshift(completed);
    state.cart = [];
    state.discount = 0;
    state.received = 0;
    state.busy = false;

    toast("Pembayaran berhasil!", "check_circle");
    render();
    window.bukaNotaModal(completed);
  } catch (err) {
    state.busy = false;
    render();
    alert("Gagal memproses pembayaran: " + err.message);
  }
};

window.cetakNotaTerakhir = () => {
  if (state.transactions.length) {
    window.bukaNotaModal(state.transactions[0]);
  } else {
    toast("Belum ada riwayat transaksi", "info");
  }
};

// ========================================================
// 2. HALAMAN TAMBAH BARANG - MOBILE TUNED
// ========================================================
function renderTambahBarang() {
  return `
  <div class="flex flex-col w-full gap-2.5">
    <!-- Header -->
    <div class="flex items-center justify-between pb-1 border-b border-border-warm-subtle/80">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
          <span class="material-symbols-outlined text-[19px]">add_box</span>
        </div>
        <h1 class="text-[15.5px] font-bold text-text-primary-ink">Tambah Barang Baru</h1>
      </div>
      <button type="button" onclick="window.resetAddForm()" class="text-text-muted-ink hover:text-danger-solid p-1 rounded transition-colors flex items-center gap-1 text-[12px] font-medium">
        <span class="material-symbols-outlined text-[16px]">restart_alt</span>
        <span>Reset</span>
      </button>
    </div>

    <!-- Form Tambah Barang -->
    <form id="add-product-form" onsubmit="event.preventDefault(); window.simpanBarangBaru();" class="flex flex-col gap-2.5">
      <!-- Nama Barang -->
      <div class="flex flex-col gap-1 bg-surface-cream rounded-xl p-3 shadow-xs border border-border-warm-subtle">
        <label for="product-name" class="text-[12.5px] font-semibold text-text-primary-ink flex items-center gap-1">
          <span class="material-symbols-outlined text-primary text-[17px]">shopping_bag</span>
          <span>Nama Barang</span>
          <span class="text-secondary font-bold">*</span>
        </label>
        <input type="text" id="product-name" required placeholder="Contoh: Kopi Kapal Api 65gr" class="w-full h-10.5 px-3 rounded-lg bg-surface-sand border border-border-warm-subtle text-text-primary-ink text-[13.5px] focus:bg-surface-cream focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-text-muted-ink/50">
      </div>

      <!-- Kode / Barcode -->
      <div class="flex flex-col gap-1 bg-surface-cream rounded-xl p-3 shadow-xs border border-border-warm-subtle">
        <label for="product-code" class="text-[12.5px] font-semibold text-text-primary-ink flex items-center justify-between">
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-primary text-[17px]">qr_code_scanner</span>
            <span>Kode / Barcode</span>
          </span>
        </label>
        <div class="flex gap-1.5">
          <input type="text" id="product-code" placeholder="Barcode / Kode unik" class="flex-1 h-10.5 px-3 rounded-lg bg-surface-sand border border-border-warm-subtle text-text-primary-ink font-mono text-[13px] focus:bg-surface-cream focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-text-muted-ink/50">
          <button type="button" onclick="window.generateAutoCode()" title="Kode Otomatis" class="h-10.5 px-2.5 rounded-lg bg-surface-sand hover:bg-surface-container-warm border border-border-warm-subtle text-text-primary-ink text-[12px] font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform shrink-0">
            <span class="material-symbols-outlined text-[16px] text-primary">magic_button</span>
            <span>Otomatis</span>
          </button>
          <button type="button" onclick="window.startBarcodeScanner('product-code')" title="Scan Kamera" class="h-10.5 px-2.5 rounded-lg bg-surface-sand hover:bg-surface-container-warm border border-border-warm-subtle text-text-primary-ink text-[12px] font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform shrink-0">
            <span class="material-symbols-outlined text-[16px] text-tertiary">barcode_scanner</span>
            <span>Scan</span>
          </button>
        </div>
      </div>

      <!-- Kategori -->
      <div class="flex flex-col gap-1 bg-surface-cream rounded-xl p-3 shadow-xs border border-border-warm-subtle">
        <label for="product-category" class="text-[12.5px] font-semibold text-text-primary-ink flex items-center gap-1">
          <span class="material-symbols-outlined text-primary text-[17px]">category</span>
          <span>Kategori</span>
          <span class="text-secondary font-bold">*</span>
        </label>
        <div class="relative">
          <select id="product-category" required class="w-full h-10.5 px-3 pr-10 rounded-lg bg-surface-sand border border-border-warm-subtle text-text-primary-ink text-[13.5px] focus:bg-surface-cream focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none appearance-none transition-all">
            <option value="" disabled selected>Pilih kategori...</option>
            ${state.categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
          </select>
          <span class="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-ink text-[20px]">arrow_drop_down</span>
        </div>
      </div>

      <!-- Harga Modal & Jual + Margin Preview -->
      <div class="bg-surface-cream rounded-xl p-3 shadow-xs border border-border-warm-subtle flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label for="cost-price" class="text-[12px] font-semibold text-text-primary-ink flex items-center gap-0.5">
              <span>Harga Modal</span>
              <span class="text-secondary font-bold">*</span>
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-2.5 text-text-muted-ink text-[12px] select-none font-semibold">Rp</span>
              <input type="number" id="cost-price" inputmode="numeric" min="0" step="100" value="4000" oninput="window.recalculateMargin()" class="w-full h-10.5 pl-9 pr-2 rounded-lg bg-surface-sand border border-border-warm-subtle text-text-primary-ink font-bold text-[13.5px] focus:bg-surface-cream focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all">
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label for="sell-price" class="text-[12px] font-semibold text-text-primary-ink flex items-center gap-0.5">
              <span>Harga Jual</span>
              <span class="text-secondary font-bold">*</span>
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-2.5 text-primary text-[12px] select-none font-semibold">Rp</span>
              <input type="number" id="sell-price" inputmode="numeric" min="0" step="100" value="5500" oninput="window.recalculateMargin()" class="w-full h-10.5 pl-9 pr-2 rounded-lg bg-surface-sand border border-border-warm-subtle text-primary font-bold text-[13.5px] focus:bg-surface-cream focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all">
            </div>
          </div>
        </div>

        <!-- Profit Summary Strip -->
        <div id="profit-badge-container" class="mt-1 p-2.5 rounded-lg bg-green-badge-bg border border-green-fresh-vibrant/30 flex flex-col gap-1 transition-colors shadow-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-primary text-[17px]" style="font-variation-settings: 'FILL' 1;">trending_up</span>
              <span class="text-[12px] text-green-badge-text font-bold">Estimasi Keuntungan</span>
            </div>
            <span id="margin-percentage" class="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[11px] font-bold shrink-0">Laba 27%</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span id="profit-value-display" class="text-[20px] leading-tight text-primary font-extrabold tracking-tight">+Rp 1.500</span>
            <span class="text-[11.5px] text-green-badge-text">per unit</span>
          </div>
          <p id="profit-advice" class="text-[11px] text-green-badge-text font-medium">Margin sehat untuk toko kelontong harian.</p>
        </div>
      </div>

      <!-- Stok Awal & Batas Peringatan -->
      <div class="bg-surface-cream rounded-xl p-3 shadow-xs border border-border-warm-subtle grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <label for="initial-stock" class="text-[12px] font-semibold text-text-primary-ink">Stok Awal</label>
          <div class="flex items-center gap-1">
            <button type="button" onclick="window.adjustStock(-1)" aria-label="Kurangi stok" class="w-9 h-9 rounded-lg bg-surface-sand hover:bg-surface-container-warm border border-border-warm text-text-primary-ink active:scale-95 flex items-center justify-center shrink-0 transition-all select-none shadow-xs">
              <span class="material-symbols-outlined text-[19px]">remove</span>
            </button>
            <input type="number" id="initial-stock" min="0" value="24" class="flex-1 h-9 rounded-lg bg-surface-sand border border-border-warm-subtle text-center text-[15px] font-bold text-text-primary-ink focus:bg-surface-cream focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none min-w-0 transition-all">
            <button type="button" onclick="window.adjustStock(1)" aria-label="Tambah stok" class="w-9 h-9 rounded-lg bg-primary hover:bg-primary-container text-on-primary active:scale-[0.98] flex items-center justify-center shrink-0 transition-all select-none shadow-xs">
              <span class="material-symbols-outlined text-[19px]">add</span>
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label for="minimum-stock-alert" class="text-[12px] font-semibold text-text-primary-ink flex items-center gap-0.5">
            <span class="material-symbols-outlined text-tertiary text-[15px]">warning</span>
            <span>Batas Peringatan</span>
          </label>
          <div class="relative flex items-center">
            <input type="number" id="minimum-stock-alert" min="1" value="5" class="w-full h-9 px-2.5 pr-10 rounded-lg bg-surface-sand border border-border-warm-subtle text-text-primary-ink text-[13.5px] font-bold focus:bg-surface-cream focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all">
            <span class="absolute right-2 text-[11px] text-text-muted-ink">sisa</span>
          </div>
        </div>
      </div>

      <!-- Tombol Simpan -->
      <div class="pt-0.5 pb-2">
        <button type="submit" id="btn-save-product" class="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-[14px] font-bold flex items-center justify-center gap-1.5 shadow-sm active:translate-y-0.5 transition-all select-none">
          <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <span>Simpan Barang</span>
        </button>
      </div>
    </form>
  </div>`;
}

// Tambah Barang Handlers
window.recalculateMargin = () => {
  const costInput = $("#cost-price");
  const sellInput = $("#sell-price");
  const profitDisplay = $("#profit-value-display");
  const marginBadge = $("#margin-percentage");
  const adviceText = $("#profit-advice");
  const container = $("#profit-badge-container");

  if (!costInput || !sellInput || !profitDisplay) return;

  const cost = parseFloat(costInput.value) || 0;
  const sell = parseFloat(sellInput.value) || 0;
  const profit = sell - cost;

  if (cost > 0 && sell > 0) {
    const marginPct = Math.round((profit / sell) * 100);
    if (profit >= 0) {
      profitDisplay.textContent =
        "+Rp " + new Intl.NumberFormat("id-ID").format(profit);
      profitDisplay.className =
        "text-[20px] leading-tight text-primary font-extrabold tracking-tight";
      marginBadge.textContent = "Laba " + marginPct + "%";
      marginBadge.className =
        "px-2 py-0.5 rounded-full bg-primary text-on-primary text-[11px] font-bold shrink-0";
      adviceText.textContent =
        marginPct > 15
          ? "Margin sehat untuk toko kelontong harian."
          : "Keuntungan cukup tipis, pastikan perputaran cepat.";
      adviceText.className = "text-[11px] text-green-badge-text font-medium";
      container.className =
        "mt-1 p-2.5 rounded-lg bg-green-badge-bg border border-green-fresh-vibrant/30 flex flex-col gap-1 transition-colors shadow-xs";
    } else {
      profitDisplay.textContent =
        "-Rp " + new Intl.NumberFormat("id-ID").format(Math.abs(profit));
      profitDisplay.className =
        "text-[20px] leading-tight text-danger-solid font-extrabold tracking-tight";
      marginBadge.textContent = "Rugi " + Math.abs(marginPct) + "%";
      marginBadge.className =
        "px-2 py-0.5 rounded-full bg-danger-solid text-on-error text-[11px] font-bold shrink-0";
      adviceText.textContent = "Peringatan: Harga jual lebih murah dari modal!";
      adviceText.className = "text-[11px] text-danger-solid font-medium";
      container.className =
        "mt-1 p-2.5 rounded-lg bg-danger-soft-bg border border-danger-solid/30 flex flex-col gap-1 transition-colors shadow-xs";
    }
  } else {
    profitDisplay.textContent = "Rp 0";
    marginBadge.textContent = "Laba 0%";
    adviceText.textContent = "Ketik harga modal dan jual untuk kalkulasi laba.";
    adviceText.className = "text-[11px] text-text-muted-ink";
  }
};

window.adjustStock = (amount) => {
  const stockInput = $("#initial-stock");
  if (!stockInput) return;
  let currentVal = parseInt(stockInput.value, 10) || 0;
  stockInput.value = Math.max(0, currentVal + amount);
};

window.generateAutoCode = () => {
  const codeInput = $("#product-code");
  if (!codeInput) return;
  codeInput.value = "TK-" + Math.floor(10000000 + Math.random() * 90000000);
  codeInput.classList.add("bg-surface-container-warm");
  setTimeout(
    () => codeInput.classList.remove("bg-surface-container-warm"),
    300,
  );
};

window.resetAddForm = () => {
  if (confirm("Kosongkan isian formulir ini?")) {
    $("#add-product-form")?.reset();
    window.recalculateMargin();
    $("#product-name")?.focus();
  }
};

window.simpanBarangBaru = async () => {
  const name = $("#product-name")?.value.trim();
  const code =
    $("#product-code")?.value.trim() || `TK-${Date.now().toString().slice(-6)}`;
  const category = $("#product-category")?.value || "Lain-lain";
  const buyPrice = num($("#cost-price")?.value);
  const sellPrice = num($("#sell-price")?.value);
  const display = num($("#initial-stock")?.value);
  const minStock = num($("#minimum-stock-alert")?.value) || 5;

  if (!name) return alert("Mohon masukkan nama barang.");

  const newProd = {
    name,
    code,
    category,
    buyPrice,
    sellPrice,
    display,
    warehouse: 0,
    minStock,
    baseUnit: "pcs",
  };

  try {
    const ref = await addDoc(collection(db, "products"), {
      ...newProd,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    state.products.push({ id: ref.id, ...newProd });
  } catch (err) {
    console.warn("Save local:", err);
    state.products.push({ id: `local-${Date.now()}`, ...newProd });
  }

  toast(`${name} berhasil disimpan!`);
  window.pindahHalaman("stok-barang");
};

// ========================================================
// 3. HALAMAN STOK BARANG - MOBILE TUNED
// ========================================================
function renderStokBarang() {
  const totalItems = state.products.length;
  const safeItems = state.products.filter(
    (p) => !isLowStock(p) && !isEmptyStock(p),
  ).length;
  const warningItems = state.products.filter(
    (p) => isLowStock(p) || isEmptyStock(p),
  ).length;

  const filtered = state.products.filter((p) => {
    const textMatch =
      !state.stockSearch ||
      `${p.name} ${p.code || ""}`
        .toLowerCase()
        .includes(state.stockSearch.toLowerCase());
    if (!textMatch) return false;

    if (state.stockFilter === "warning") return isLowStock(p);
    if (state.stockFilter === "empty") return isEmptyStock(p);
    return true;
  });

  const stockRows = filtered.length
    ? filtered
        .map((p) => {
          const stock = totalStock(p);
          const empty = isEmptyStock(p);
          const warn = isLowStock(p);

          let badgeHtml = `<span class="px-1.5 py-0.5 rounded bg-green-badge-bg text-green-badge-text text-[10px] font-semibold shrink-0">Aman</span>`;
          if (empty) {
            badgeHtml = `<span class="px-1.5 py-0.5 rounded bg-danger-solid text-on-error text-[10px] font-bold shrink-0">Habis</span>`;
          } else if (warn) {
            badgeHtml = `<span class="px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold shrink-0">Menipis</span>`;
          }

          return `
      <article class="stock-item bg-surface-container-lowest border border-border-warm-subtle rounded-xl p-2.5 shadow-xs flex flex-col gap-1.5">
        <div class="flex items-center gap-1.5">
          ${badgeHtml}
          <h2 class="text-[13px] font-semibold text-on-surface truncate flex-1">${esc(p.name)}</h2>
        </div>
        <div class="flex items-center justify-between gap-1 pt-1 border-t border-border-warm-subtle">
          <div class="flex items-center gap-1.5 text-text-muted-ink min-w-0">
            <span class="text-[12.5px] font-bold text-on-surface">${money(p.sellPrice)}</span>
            <span>•</span>
            <span class="text-[11.5px] ${empty ? "text-danger-solid" : warn ? "text-tertiary font-bold" : "text-on-surface"} font-semibold">
              Sisa: <span class="font-bold">${stock}</span> ${esc(p.baseUnit || "pcs")}
            </span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button aria-label="Kurangi Stok" class="w-6.5 h-6.5 rounded-lg bg-surface-sand text-on-surface border border-border-warm-subtle font-medium flex items-center justify-center active:translate-y-0.5 transition-all" onclick="window.kurangiStokCepat('${p.id}')">
              <span class="material-symbols-outlined text-[15px]">remove</span>
            </button>
            <button class="h-6.5 px-2 rounded-lg bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center gap-0.5 active:translate-y-0.5 transition-all" onclick="window.bukaModalRestock('${p.id}')">
              <span class="material-symbols-outlined text-[14px]">add</span>
              <span>Tambah</span>
            </button>
          </div>
        </div>
      </article>`;
        })
        .join("")
    : `<div class="py-8 text-center text-text-muted-ink text-[12.5px]">Tidak ada barang persediaan yang cocok.</div>`;

  return `
  <div class="flex flex-col w-full gap-2.5">
    <!-- Ringkasan Cepat Persediaan -->
    <section class="grid grid-cols-3 gap-1.5">
      <div class="flex flex-col p-2 bg-surface-sand border border-border-warm-subtle rounded-xl shadow-xs">
        <div class="flex items-center justify-between text-text-muted-ink">
          <span class="text-[11px] font-semibold">Total</span>
          <span class="material-symbols-outlined text-[15px]">inventory_2</span>
        </div>
        <span class="text-[17px] text-on-surface font-bold mt-0.5">${totalItems}</span>
      </div>
      <div class="flex flex-col p-2 bg-green-badge-bg border border-green-fresh-vibrant/20 rounded-xl shadow-xs">
        <div class="flex items-center justify-between text-green-badge-text">
          <span class="text-[11px] font-semibold">Aman</span>
          <span class="material-symbols-outlined text-[15px]">check_circle</span>
        </div>
        <span class="text-[17px] text-primary font-bold mt-0.5">${safeItems}</span>
      </div>
      <div class="flex flex-col p-2 bg-danger-soft-bg border border-danger-solid/20 rounded-xl shadow-xs">
        <div class="flex items-center justify-between text-danger-solid">
          <span class="text-[11px] font-semibold">Menipis</span>
          <span class="material-symbols-outlined text-[15px]">warning</span>
        </div>
        <span class="text-[17px] text-danger-solid font-bold mt-0.5">${warningItems}</span>
      </div>
    </section>

    <!-- Bar Pencarian Cepat -->
    <section class="flex flex-col gap-1.5">
      <div class="relative w-full">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted-ink">
          <span class="material-symbols-outlined text-[19px]">search</span>
        </div>
        <input class="w-full h-10.5 pl-9 pr-3 bg-surface-container-lowest border border-border-warm-subtle text-on-surface rounded-xl shadow-xs text-[13.5px] focus:outline-none focus:border-primary placeholder:text-text-muted-ink/60" id="stock-search-input" placeholder="Cari beras, minyak, telur..." type="text" value="${esc(state.stockSearch)}" oninput="window.handleStockSearch(this.value)">
      </div>

      <!-- Filter Pil Kategori Sederhana -->
      <div class="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
        <button class="px-3 py-1.5 rounded-full text-[11.5px] shadow-xs shrink-0 transition-all flex items-center gap-1 ${
          state.stockFilter === "all"
            ? "bg-primary text-on-primary font-bold"
            : "bg-surface-sand text-text-muted-ink border border-border-warm-subtle font-medium"
        }" onclick="window.setStockFilter('all')">
          <span class="material-symbols-outlined text-[15px]">apps</span>
          Semua (${totalItems})
        </button>
        <button class="px-3 py-1.5 rounded-full text-[11.5px] shadow-xs shrink-0 transition-all flex items-center gap-1 ${
          state.stockFilter === "warning"
            ? "bg-tertiary-fixed text-on-tertiary-fixed font-bold border border-tertiary-fixed-dim/40"
            : "bg-surface-sand text-text-muted-ink border border-border-warm-subtle font-medium"
        }" onclick="window.setStockFilter('warning')">
          <span class="material-symbols-outlined text-[15px]">priority_high</span>
          Menipis (${warningItems})
        </button>
        <button class="px-3 py-1.5 rounded-full text-[11.5px] shadow-xs shrink-0 transition-all flex items-center gap-1 ${
          state.stockFilter === "empty"
            ? "bg-danger-solid text-on-error font-bold"
            : "bg-surface-sand text-text-muted-ink border border-border-warm-subtle font-medium"
        }" onclick="window.setStockFilter('empty')">
          <span class="material-symbols-outlined text-[15px]">report</span>
          Habis (${state.products.filter(isEmptyStock).length})
        </button>
      </div>
    </section>

    <!-- Banner Pengingat Kulakan -->
    <div class="py-2 px-3 bg-tertiary-fixed/30 border border-tertiary-fixed-dim/40 rounded-xl flex items-center justify-between">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="material-symbols-outlined text-[17px] text-tertiary shrink-0">local_shipping</span>
        <span class="text-[12px] text-on-tertiary-fixed font-semibold truncate">Kulakan Pasar: Besok Subuh</span>
      </div>
      <span class="text-[11px] font-bold px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-full shrink-0">${warningItems} barang</span>
    </div>

    <!-- Daftar Kartu Barang Persediaan -->
    <section class="flex flex-col gap-2">
      ${stockRows}
    </section>
  </div>`;
}

// Stok Handlers
window.handleStockSearch = (v) => {
  state.stockSearch = v;
  const input = $("#stock-search-input");
  const pos = input ? input.selectionStart : null;
  render();
  const newInput = $("#stock-search-input");
  if (newInput && pos !== null) {
    newInput.focus();
    newInput.setSelectionRange(pos, pos);
  }
};

window.setStockFilter = (f) => {
  state.stockFilter = f;
  render();
};

window.kurangiStokCepat = async (id) => {
  const p = state.products.find((prod) => prod.id === id);
  if (!p) return;
  const cur = num(p.display);
  if (cur <= 0) return toast(`${p.name} sudah habis!`, "warning");
  p.display = cur - 1;
  try {
    if (!id.startsWith("local-") && !id.startsWith("demo-")) {
      await updateDoc(doc(db, "products", id), {
        display: p.display,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (_) {}
  toast(`${p.name} dikurangi 1 (sisa: ${totalStock(p)})`);
  render();
};

window.bukaModalRestock = (id) => {
  const p = state.products.find((prod) => prod.id === id);
  if (!p) return;
  state.restockTarget = p;
  const modalRoot = $("#modal-root");
  if (!modalRoot) return;

  modalRoot.innerHTML = `
  <div class="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" id="restock-modal">
    <div class="w-full sm:max-w-md bg-surface-container-lowest border border-border-warm-subtle rounded-t-2xl sm:rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="min-w-0">
          <span class="text-[11.5px] text-primary font-bold">Kulakan Barang Masuk</span>
          <h3 class="text-[15px] font-bold text-on-surface truncate">${esc(p.name)}</h3>
        </div>
        <button class="w-8 h-8 rounded-full bg-surface-sand flex items-center justify-center text-text-muted-ink border border-border-warm-subtle" onclick="window.tutupModalRestock()">
          <span class="material-symbols-outlined text-[19px]">close</span>
        </button>
      </div>

      <div class="p-2.5 bg-surface-sand rounded-xl border border-border-warm-subtle flex flex-col gap-1">
        <span class="text-[12px] text-text-muted-ink font-medium">Pilih jumlah kulakan masuk:</span>
        <div class="grid grid-cols-3 gap-1.5 mt-0.5">
          <button class="h-11 bg-surface-container-lowest border border-border-warm-subtle rounded-lg text-[16px] text-primary font-bold shadow-xs active:bg-primary active:text-on-primary transition-colors flex items-center justify-center" onclick="window.eksekusiRestock(10)">
            +10
          </button>
          <button class="h-11 bg-surface-container-lowest border border-border-warm-subtle rounded-lg text-[16px] text-primary font-bold shadow-xs active:bg-primary active:text-on-primary transition-colors flex items-center justify-center" onclick="window.eksekusiRestock(20)">
            +20
          </button>
          <button class="h-11 bg-surface-container-lowest border border-border-warm-subtle rounded-lg text-[16px] text-primary font-bold shadow-xs active:bg-primary active:text-on-primary transition-colors flex items-center justify-center" onclick="window.eksekusiRestock(50)">
            +50
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-[12px] text-on-surface font-semibold" for="custom-qty-input">Atau isi jumlah lainnya:</label>
        <div class="flex items-center gap-1.5">
          <input class="h-11 flex-1 px-3 bg-surface-sand border border-border-warm-subtle rounded-lg text-[18px] text-on-surface font-extrabold focus:outline-none focus:border-primary" id="custom-qty-input" min="1" type="number" value="10">
          <span class="text-[13px] text-text-muted-ink font-semibold">${esc(p.baseUnit || "pcs")}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-1.5 mt-1">
        <button class="h-10.5 rounded-xl bg-surface-sand border border-border-warm-subtle text-on-surface text-[13px] font-semibold" onclick="window.tutupModalRestock()">
          Batal
        </button>
        <button class="h-10.5 rounded-xl bg-primary text-on-primary text-[13px] font-bold flex items-center justify-center gap-1 shadow-xs" onclick="window.eksekusiRestockCustom()">
          <span class="material-symbols-outlined text-[17px]">save</span>
          Simpan Stok
        </button>
      </div>
    </div>
  </div>`;
};

window.tutupModalRestock = () => {
  const modalRoot = $("#modal-root");
  if (modalRoot) modalRoot.innerHTML = "";
  state.restockTarget = null;
};

window.eksekusiRestock = async (qty) => {
  const p = state.restockTarget;
  if (!p) return;
  p.display = num(p.display) + qty;
  try {
    if (!p.id.startsWith("local-") && !p.id.startsWith("demo-")) {
      await updateDoc(doc(db, "products", p.id), {
        display: p.display,
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "stockMovements"), {
        productId: p.id,
        productName: p.name,
        type: "Kulakan Masuk",
        quantity: qty,
        unit: p.baseUnit || "pcs",
        createdAt: serverTimestamp(),
      });
    }
  } catch (_) {}
  toast(`Stok ${p.name} bertambah +${qty}!`);
  window.tutupModalRestock();
  render();
};

window.eksekusiRestockCustom = () => {
  const input = $("#custom-qty-input");
  const val = parseInt(input?.value, 10) || 0;
  if (val > 0) window.eksekusiRestock(val);
};

// ========================================================
// 4. HALAMAN KEUANGAN & LAPORAN - MOBILE TUNED
// ========================================================
function renderKeuangan() {
  // Filter transactions according to selected period
  const transList = state.transactions.filter((t) => {
    if (t.status === "dibatalkan") return false;
    const dt = t.createdAt?.toDate
      ? t.createdAt.toDate()
      : new Date(t.createdAt || Date.now());
    if (state.periodMode === "today") {
      return dt >= todayStart();
    }
    // Custom submodes
    if (state.customSubmode === "single") {
      return dt.toISOString().slice(0, 10) === state.singleDate;
    }
    if (state.customSubmode === "range") {
      const s = new Date(state.rangeStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(state.rangeEnd);
      e.setHours(23, 59, 59, 999);
      return dt >= s && dt <= e;
    }
    return true;
  });

  const uangMasuk = transList.reduce((acc, t) => acc + num(t.total), 0);
  const totalModal = transList.reduce((acc, t) => acc + num(t.costTotal), 0);
  const totalPengeluaran = state.expenses.reduce(
    (acc, e) => acc + num(e.amount),
    0,
  );
  const labaBersih = Math.max(0, uangMasuk - totalModal - totalPengeluaran);
  const pembeliCount = transList.length;
  const barangTerjual = transList.reduce(
    (acc, t) => acc + (t.items || []).reduce((x, i) => x + i.qty, 0),
    0,
  );

  let statusPeriodeText = "Hari Ini (" + getTodayDateString() + ")";
  let badgeDurasi = "1 Hari";

  if (state.periodMode === "custom") {
    if (state.customSubmode === "single") {
      statusPeriodeText = `Tanggal ${state.singleDate}`;
      badgeDurasi = "1 Hari";
    } else if (state.customSubmode === "range") {
      statusPeriodeText = `${state.rangeStart} s/d ${state.rangeEnd}`;
      badgeDurasi = "Rentang";
    } else {
      statusPeriodeText = `Bulan ${state.filterMonth}`;
      badgeDurasi = "1 Bulan";
    }
  }

  return `
  <div class="flex flex-col w-full gap-2.5">
    <!-- Tab Periode Cepat: 2 Pilihan Bersih -->
    <div class="grid grid-cols-2 gap-1 p-1 bg-surface-sand border border-border-warm-subtle rounded-xl">
      <button class="py-2 px-2 rounded-lg text-[13.5px] font-bold shadow-xs transition-all text-center flex items-center justify-center gap-1.5 ${
        state.periodMode === "today"
          ? "bg-surface-container-lowest text-primary border border-border-warm-subtle/50"
          : "text-text-muted-ink hover:text-text-primary-ink"
      }" id="tab-btn-today" onclick="window.pilihHariIni()" type="button">
        <span class="material-symbols-outlined text-[17px]">today</span>
        <span>Hari Ini</span>
      </button>
      <button class="py-2 px-2 rounded-lg text-[13.5px] font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
        state.periodMode === "custom"
          ? "bg-surface-container-lowest text-primary border border-border-warm-subtle/50 shadow-xs"
          : "text-text-muted-ink hover:text-text-primary-ink"
      }" id="tab-btn-kustom" onclick="window.bukaModalKustom()" type="button">
        <span class="material-symbols-outlined text-[17px]">tune</span>
        <span>Kustom Periode</span>
      </button>
    </div>

    <!-- Indikator Status Periode Aktif -->
    <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-sand/80 border border-border-warm-subtle/70">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="material-symbols-outlined text-primary text-[16px] shrink-0">event_available</span>
        <span class="text-[12px] text-text-primary-ink truncate">Data: <span class="font-bold text-primary">${statusPeriodeText}</span></span>
      </div>
      <button class="px-2 py-0.5 rounded-full bg-green-badge-bg hover:opacity-90 text-green-badge-text text-[11px] font-bold shrink-0 flex items-center gap-0.5" onclick="window.bukaModalKustom()" type="button">
        <span>${badgeDurasi}</span>
        <span class="material-symbols-outlined text-[13px]">expand_more</span>
      </button>
    </div>

    <!-- 3 Kartu Ringkasan Angka Besar -->
    <div class="flex flex-col gap-2">
      <div class="p-2.5 rounded-xl bg-surface-container-lowest border border-border-warm-subtle shadow-xs flex items-center justify-between">
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1 text-primary text-[12px] font-semibold">
            <span class="material-symbols-outlined text-[17px]">arrow_downward_alt</span>
            <span>Uang Masuk (Omzet)</span>
          </div>
          <span class="text-[16.5px] text-primary font-bold mt-0.5">${money(uangMasuk)}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full bg-green-badge-bg text-green-badge-text text-[11px] font-bold shrink-0">${pembeliCount} Pembeli</span>
      </div>

      <div class="p-2.5 rounded-xl bg-surface-sand border border-border-warm-subtle shadow-xs flex items-center justify-between">
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1 text-text-primary-ink text-[12px] font-semibold">
            <span class="material-symbols-outlined text-[17px]">inventory</span>
            <span>Modal (HPP)</span>
          </div>
          <span class="text-[16.5px] text-text-primary-ink font-bold mt-0.5">${money(totalModal)}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full bg-surface-container-high text-text-muted-ink text-[11px] font-semibold shrink-0">Kulakan</span>
      </div>

      <div class="p-2.5 rounded-xl bg-tertiary-fixed border border-secondary-fixed shadow-xs flex items-center justify-between">
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1 text-on-tertiary-fixed text-[12px] font-semibold">
            <span class="material-symbols-outlined text-[17px] text-tertiary-container" style="font-variation-settings: 'FILL' 1;">savings</span>
            <span class="truncate">Keuntungan / Laba Bersih</span>
          </div>
          <span class="text-[16.5px] text-tertiary-container font-bold mt-0.5">${money(labaBersih)}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary text-[11px] font-bold shrink-0">Laba</span>
      </div>
    </div>

    <!-- Catat Pengeluaran Toko Sederhana -->
    <div class="p-3 rounded-xl bg-surface-container-lowest border border-border-warm-subtle shadow-xs flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-tertiary-container text-[20px]">receipt_long</span>
          <h2 class="text-[13.5px] text-text-primary-ink font-bold">Catat Pengeluaran</h2>
        </div>
      </div>
      <form class="flex flex-col gap-1.5" onsubmit="event.preventDefault(); window.simpanBiaya();">
        <div class="flex gap-1.5">
          <input class="flex-1 h-10 px-2.5 rounded-lg bg-surface-sand text-text-primary-ink border border-border-warm text-[13px] placeholder:text-text-muted-ink outline-none focus:border-tertiary-container focus:bg-surface-cream transition-colors min-w-0" id="nama-pengeluaran" placeholder="Keperluan (misal: Kresek)" required type="text">
          <div class="relative flex items-center w-32 shrink-0">
            <span class="absolute left-2 text-[12px] font-semibold text-text-muted-ink select-none">Rp</span>
            <input class="w-full h-10 pl-7 pr-2 rounded-lg bg-surface-sand text-text-primary-ink border border-border-warm text-[13px] font-bold placeholder:text-text-muted-ink outline-none focus:border-tertiary-container focus:bg-surface-cream transition-colors" id="nominal-pengeluaran" placeholder="0" required type="number" min="0">
          </div>
        </div>
        <button class="h-9 rounded-lg bg-tertiary-container hover:opacity-95 text-on-tertiary text-[12.5px] font-bold flex items-center justify-center gap-1 shadow-xs active:translate-y-0.5 transition-all" type="submit">
          <span class="material-symbols-outlined text-[17px]">add_circle</span>
          <span>Simpan Pengeluaran</span>
        </button>
      </form>
    </div>

    <!-- Ringkasan Transaksi & Barang Terjual -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-0.5">
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-primary text-[19px]">summarize</span>
          <h3 class="text-[13.5px] text-text-primary-ink font-bold">Ringkasan Operasional</h3>
        </div>
      </div>
      <div class="p-2.5 rounded-xl bg-surface-container-lowest border border-border-warm-subtle shadow-xs grid grid-cols-2 gap-2">
        <div class="flex flex-col min-w-0 p-2 rounded-lg bg-surface-sand/80 border border-border-warm-subtle/50">
          <span class="text-[11.5px] text-text-muted-ink font-medium">Total Transaksi</span>
          <span class="text-[18px] text-text-primary-ink font-bold mt-0.5">${pembeliCount}</span>
        </div>
        <div class="flex flex-col min-w-0 p-2 rounded-lg bg-surface-sand/80 border border-border-warm-subtle/50">
          <span class="text-[11.5px] text-text-muted-ink font-medium">Barang Terjual</span>
          <span class="text-[18px] text-primary font-bold mt-0.5">${barangTerjual}</span>
        </div>
      </div>
    </div>

    <!-- Tombol Aksi Cepat Laporan -->
    <div class="flex flex-col gap-1.5 pt-0.5">
      <button class="h-10.5 rounded-xl bg-green-badge-bg border border-green-fresh-vibrant/30 text-green-badge-text text-[12.5px] font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.99] transition-all hover:bg-green-fresh-vibrant/20" onclick="window.exportExcel()" type="button">
        <span class="material-symbols-outlined text-green-fresh-vibrant text-[18px]">table_view</span>
        <span>Export ke Excel (.xlsx / .csv)</span>
      </button>
      <div class="grid grid-cols-2 gap-1.5">
        <button class="h-10 rounded-xl bg-primary hover:opacity-95 text-on-primary text-[12.5px] font-bold flex items-center justify-center gap-1 shadow-xs active:scale-[0.99] transition-all" onclick="window.cetakLaporanKeuangan()" type="button">
          <span class="material-symbols-outlined text-[17px]">print</span>
          <span>Cetak Laporan</span>
        </button>
        <button class="h-10 rounded-xl bg-surface-sand border border-border-warm text-text-primary-ink hover:bg-surface-container-warm text-[12.5px] font-semibold flex items-center justify-center gap-1 shadow-xs transition-all" onclick="window.bagikanWALaporan()" type="button">
          <span class="material-symbols-outlined text-primary text-[17px]" style="font-variation-settings: 'FILL' 1;">send</span>
          <span>Kirim WA</span>
        </button>
      </div>
    </div>

    <!-- Riwayat Transaksi -->
    <div class="flex flex-col gap-1.5 pt-1">
      <h3 class="text-[13.5px] text-text-primary-ink font-bold px-0.5">Riwayat Transaksi Terakhir</h3>
      <div class="flex flex-col gap-1.5">
        ${
          transList.length
            ? transList
                .slice(0, 10)
                .map(
                  (t) => `
          <div class="trans-item p-2.5 bg-surface-container-lowest border border-border-warm-subtle rounded-xl flex items-center justify-between shadow-xs hover:border-primary/50 transition-colors cursor-pointer" onclick="window.bukaNotaModal(${JSON.stringify(t).replace(/"/g, "&quot;")})">
            <div class="flex flex-col min-w-0 pr-2">
              <span class="font-bold text-[12.5px] text-text-primary-ink">${esc(t.number)}</span>
              <span class="text-[11px] text-text-muted-ink">${dateFmt(t.createdAt)} · ${(t.items || []).length} item</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="font-extrabold text-[13px] text-primary">${money(t.total)}</span>
              <span class="material-symbols-outlined text-text-muted-ink text-[16px]">chevron_right</span>
            </div>
          </div>`,
                )
                .join("")
            : `<div class="py-5 text-center text-text-muted-ink text-[12.5px]">Belum ada transaksi pada periode ini.</div>`
        }
      </div>
    </div>
  </div>`;
}

// Keuangan Handlers
window.pilihHariIni = () => {
  state.periodMode = "today";
  render();
};

window.bukaModalKustom = () => {
  const modalRoot = $("#modal-root");
  if (!modalRoot) return;

  modalRoot.innerHTML = `
  <div class="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex flex-col justify-end p-margin-mobile" id="modal-periode-kustom">
    <div class="bg-surface-cream rounded-2xl p-4 flex flex-col gap-3 border border-border-warm shadow-2xl max-w-lg mx-auto w-full max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-border-warm-subtle/60 pb-1">
        <div class="flex items-center gap-1.5">
          <div class="w-8 h-8 rounded-full bg-surface-sand flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[19px]">calendar_month</span>
          </div>
          <div>
            <h3 class="text-[14.5px] font-bold text-text-primary-ink leading-tight">Pilih Periode</h3>
            <p class="text-[11.5px] text-text-muted-ink">Rentang data laporan keuangan</p>
          </div>
        </div>
        <button class="w-8 h-8 rounded-full bg-surface-sand border border-border-warm flex items-center justify-center text-text-primary-ink" onclick="window.tutupModalKustom()">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-1 p-1 bg-surface-sand border border-border-warm-subtle rounded-xl text-center">
        <button class="py-1.5 px-1 rounded-lg text-[12.5px] font-bold shadow-xs transition-all ${
          state.customSubmode === "single"
            ? "bg-surface-container-lowest text-primary"
            : "text-text-muted-ink"
        }" id="subtab-single" onclick="window.gantiSubtabKustom('single')">Per Tanggal</button>
        <button class="py-1.5 px-1 rounded-lg text-[12.5px] font-bold transition-all ${
          state.customSubmode === "range"
            ? "bg-surface-container-lowest text-primary shadow-xs"
            : "text-text-muted-ink"
        }" id="subtab-range" onclick="window.gantiSubtabKustom('range')">Rentang</button>
        <button class="py-1.5 px-1 rounded-lg text-[12.5px] font-bold transition-all ${
          state.customSubmode === "month"
            ? "bg-surface-container-lowest text-primary shadow-xs"
            : "text-text-muted-ink"
        }" id="subtab-month" onclick="window.gantiSubtabKustom('month')">Per Bulan</button>
      </div>

      <div class="flex flex-col gap-1 ${state.customSubmode === "single" ? "flex" : "hidden"}" id="form-mode-single">
        <label class="text-[12.5px] font-semibold text-text-primary-ink flex items-center gap-1" for="input-single-date">
          <span class="material-symbols-outlined text-primary text-[16px]">event</span> Tanggal Spesifik:
        </label>
        <input class="h-10 px-3 rounded-lg bg-surface-sand text-text-primary-ink border border-border-warm text-[13px] outline-none focus:border-primary focus:bg-surface-cream" id="input-single-date" type="date" value="${state.singleDate}">
      </div>

      <div class="flex-col gap-1 ${state.customSubmode === "range" ? "flex" : "hidden"}" id="form-mode-range">
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-0.5">
            <label class="text-[11.5px] text-text-muted-ink font-semibold" for="input-range-mulai">Mulai:</label>
            <input class="h-10 px-2 rounded-lg bg-surface-sand text-text-primary-ink border border-border-warm text-[12.5px] outline-none focus:border-primary focus:bg-surface-cream" id="input-range-mulai" type="date" value="${state.rangeStart}">
          </div>
          <div class="flex flex-col gap-0.5">
            <label class="text-[11.5px] text-text-muted-ink font-semibold" for="input-range-sampai">Sampai:</label>
            <input class="h-10 px-2 rounded-lg bg-surface-sand text-text-primary-ink border border-border-warm text-[12.5px] outline-none focus:border-primary focus:bg-surface-cream" id="input-range-sampai" type="date" value="${state.rangeEnd}">
          </div>
        </div>
      </div>

      <div class="flex-col gap-1 ${state.customSubmode === "month" ? "flex" : "hidden"}" id="form-mode-month">
        <label class="text-[12.5px] font-semibold text-text-primary-ink" for="select-filter-bulan">Pilih Bulan & Tahun:</label>
        <select class="h-10 px-3 rounded-lg bg-surface-sand text-text-primary-ink border border-border-warm text-[13px] outline-none focus:border-primary focus:bg-surface-cream" id="select-filter-bulan">
          <option selected value="Oktober 2026">Oktober 2026 (Bulan Berjalan)</option>
          <option value="September 2026">September 2026</option>
          <option value="Agustus 2026">Agustus 2026</option>
        </select>
      </div>

      <div class="flex gap-2 pt-1 border-t border-border-warm-subtle/60">
        <button class="flex-1 h-10.5 rounded-xl bg-surface-sand border border-border-warm text-text-primary-ink text-[13px] font-semibold" onclick="window.tutupModalKustom()">Batal</button>
        <button class="flex-[2] h-10.5 rounded-xl bg-primary text-on-primary text-[13px] font-bold flex items-center justify-center gap-1 shadow-xs active:translate-y-0.5" onclick="window.terapkanPeriodeKustom()">
          <span class="material-symbols-outlined text-[17px]">check_circle</span>
          <span>Terapkan Periode</span>
        </button>
      </div>
    </div>
  </div>`;
};

window.tutupModalKustom = () => {
  const modalRoot = $("#modal-root");
  if (modalRoot) modalRoot.innerHTML = "";
};

window.gantiSubtabKustom = (mode) => {
  state.customSubmode = mode;
  window.bukaModalKustom();
};

window.terapkanPeriodeKustom = () => {
  state.periodMode = "custom";
  const single = $("#input-single-date")?.value;
  const rStart = $("#input-range-mulai")?.value;
  const rEnd = $("#input-range-sampai")?.value;
  const m = $("#select-filter-bulan")?.value;

  if (single) state.singleDate = single;
  if (rStart) state.rangeStart = rStart;
  if (rEnd) state.rangeEnd = rEnd;
  if (m) state.filterMonth = m;

  window.tutupModalKustom();
  render();
};

window.simpanBiaya = async () => {
  const nama = $("#nama-pengeluaran")?.value.trim();
  const nominal = num($("#nominal-pengeluaran")?.value);
  if (!nama || nominal <= 0)
    return alert("Mohon lengkapi keperluan dan nominal pengeluaran.");

  const exp = {
    name: nama,
    amount: nominal,
    category: "Operasional Toko",
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, "expenses"), exp);
    state.expenses.unshift({ id: ref.id, ...exp, createdAt: new Date() });
  } catch (err) {
    state.expenses.unshift({
      id: `local-exp-${Date.now()}`,
      ...exp,
      createdAt: new Date(),
    });
  }

  toast("Pengeluaran berhasil dicatat!");
  $("#nama-pengeluaran").value = "";
  $("#nominal-pengeluaran").value = "";
  render();
};

window.exportExcel = () => {
  const rows = [
    ["No", "Nomor Transaksi", "Tanggal", "Total", "Pembayaran", "Status"],
    ...state.transactions.map((t, idx) => [
      idx + 1,
      t.number,
      dateFmt(t.createdAt),
      t.total,
      t.paymentMethod || "Tunai",
      t.status || "selesai",
    ]),
  ];
  const csvContent =
    "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `Laporan_Toko_Dani_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast("Laporan Excel/CSV berhasil diunduh!");
};

window.cetakLaporanKeuangan = () => {
  const printRoot = $("#print-root");
  if (!printRoot) return;
  const uangMasuk = state.transactions.reduce(
    (acc, t) => acc + num(t.total),
    0,
  );
  const modal = state.transactions.reduce(
    (acc, t) => acc + num(t.costTotal),
    0,
  );
  const biaya = state.expenses.reduce((acc, e) => acc + num(e.amount), 0);
  const laba = Math.max(0, uangMasuk - modal - biaya);

  printRoot.innerHTML = `
    <div style="max-width:280px;margin:0 auto;text-align:center;">
      <h3 style="margin:0;">${esc(state.settings.storeName || "Toko Dani")}</h3>
      <p style="margin:3px 0;font-size:11px;">LAPORAN KEUANGAN · ${getTodayDateString()}</p>
      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;">
      <table class="receipt-table" style="text-align:left;font-size:12px;">
        <tr><td>Total Omzet:</td><td style="text-align:right;"><b>${money(uangMasuk)}</b></td></tr>
        <tr><td>Total Modal (HPP):</td><td style="text-align:right;">${money(modal)}</td></tr>
        <tr><td>Pengeluaran Toko:</td><td style="text-align:right;">${money(biaya)}</td></tr>
        <tr><td colspan="2"><hr style="border:none;border-top:1px dashed #000;margin:4px 0;"></td></tr>
        <tr><td><b>Laba Bersih:</b></td><td style="text-align:right;font-size:13px;"><b>${money(laba)}</b></td></tr>
        <tr><td>Total Transaksi:</td><td style="text-align:right;">${state.transactions.length}</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;">
      <p style="font-size:10.5px;">Dicetak otomatis melalui Kasir Toko Dani</p>
    </div>
  `;
  window.print();
};

window.bagikanWALaporan = () => {
  const uangMasuk = state.transactions.reduce(
    (acc, t) => acc + num(t.total),
    0,
  );
  const modal = state.transactions.reduce(
    (acc, t) => acc + num(t.costTotal),
    0,
  );
  const biaya = state.expenses.reduce((acc, e) => acc + num(e.amount), 0);
  const laba = Math.max(0, uangMasuk - modal - biaya);

  const text = encodeURIComponent(
    `*Laporan Keuangan ${state.settings.storeName || "Toko Dani"}*\n` +
      `Tanggal: ${getTodayDateString()}\n\n` +
      `• Omzet Penjualan: ${money(uangMasuk)} (${state.transactions.length} transaksi)\n` +
      `• Modal Kulakan: ${money(modal)}\n` +
      `• Pengeluaran: ${money(biaya)}\n` +
      `• *Estimasi Laba Bersih: ${money(laba)}*\n\n` +
      `Alhamdulillah, operasional toko lancar!`,
  );
  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
};

// ========================================================
// MODAL NOTA / STRUK DETAIL - MOBILE TUNED
// ========================================================
window.bukaNotaModal = (t) => {
  const modalRoot = $("#modal-root");
  if (!modalRoot) return;

  const itemsHtml = (t.items || [])
    .map(
      (i) => `
    <div class="flex justify-between text-[12.5px] text-text-primary-ink py-0.5">
      <span>${esc(i.name)} (${i.qty}×)</span>
      <span class="font-bold">${money(i.price * i.qty)}</span>
    </div>`,
    )
    .join("");

  modalRoot.innerHTML = `
  <div class="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex flex-col justify-end p-margin-mobile" id="modal-nota">
    <div class="bg-surface-cream rounded-2xl p-3.5 flex flex-col gap-2.5 border border-border-warm shadow-2xl max-w-md mx-auto w-full">
      <div class="flex items-center justify-between pb-1 border-b border-border-warm-subtle">
        <div class="flex flex-col">
          <span class="text-[14.5px] text-text-primary-ink font-bold">Nota #${esc(t.number || "000")}</span>
          <span class="text-[11.5px] text-text-muted-ink">${esc(state.settings.storeName || "Toko Dani")} · Kasir</span>
        </div>
        <button class="w-8 h-8 rounded-full bg-surface-sand border border-border-warm flex items-center justify-center text-text-primary-ink" onclick="window.tutupModalRoot()">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div class="p-2.5 rounded-xl bg-surface-container-lowest border border-border-warm-subtle flex flex-col gap-1 text-[12.5px]">
        <div class="flex flex-col border-b border-border-warm-subtle/70 pb-1.5 mb-0.5">
          ${itemsHtml}
        </div>
        <div class="flex justify-between text-text-muted-ink text-[12px]">
          <span>Subtotal:</span>
          <span>${money(t.subtotal || t.total)}</span>
        </div>
        ${
          num(t.discount) > 0
            ? `<div class="flex justify-between text-secondary text-[12px] font-semibold">
          <span>Diskon:</span>
          <span>- ${money(t.discount)}</span>
        </div>`
            : ""
        }
        <div class="flex justify-between text-text-primary-ink text-[14.5px] font-extrabold pt-1 border-t border-border-warm-subtle">
          <span>Total Belanja:</span>
          <span class="text-primary font-bold">${money(t.total)}</span>
        </div>
        <div class="flex justify-between text-text-muted-ink text-[12px]">
          <span>Bayar (Tunai):</span>
          <span>${money(t.received || t.total)}</span>
        </div>
        <div class="flex justify-between text-text-muted-ink text-[12px]">
          <span>Kembalian:</span>
          <span class="font-bold text-primary">${money(t.change || 0)}</span>
        </div>
        <div class="flex justify-between text-text-muted-ink text-[11px] pt-0.5">
          <span>Waktu:</span>
          <span>${dateFmt(t.createdAt)}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <button class="flex-1 h-10 rounded-xl bg-surface-sand border border-border-warm text-text-primary-ink text-[12.5px] font-semibold" onclick="window.tutupModalRoot()">
          Tutup
        </button>
        <button class="flex-1 h-10 rounded-xl bg-primary text-on-primary text-[12.5px] font-bold flex items-center justify-center gap-1 shadow-xs" onclick="window.cetakNotaThermal(${JSON.stringify(t).replace(/"/g, "&quot;")})">
          <span class="material-symbols-outlined text-[17px]">print</span>
          <span>Cetak Struk</span>
        </button>
      </div>
    </div>
  </div>`;
};

window.tutupModalRoot = () => {
  const modalRoot = $("#modal-root");
  if (modalRoot) modalRoot.innerHTML = "";
};

window.cetakNotaThermal = (t) => {
  const printRoot = $("#print-root");
  if (!printRoot) return;

  const itemsHtml = (t.items || [])
    .map(
      (i) => `
    <tr>
      <td colspan="2">${esc(i.name)}</td>
    </tr>
    <tr>
      <td>${i.qty} × ${money(i.price)}</td>
      <td style="text-align:right;">${money(i.qty * i.price)}</td>
    </tr>`,
    )
    .join("");

  printRoot.innerHTML = `
    <div style="max-width:280px;margin:0 auto;text-align:center;">
      <h3 style="margin:0;">${esc(state.settings.storeName || "Toko Dani")}</h3>
      <p style="margin:2px 0;font-size:11px;">${esc(state.settings.address || "Toko Kelontong & Sembako")}</p>
      <p style="margin:2px 0;font-size:10.5px;">Nota: ${esc(t.number)} · ${dateFmt(t.createdAt)}</p>
      <hr style="border:none;border-top:1px dashed #000;margin:5px 0;">
      <table class="receipt-table" style="text-align:left;font-size:11.5px;">
        ${itemsHtml}
        <tr><td colspan="2"><hr style="border:none;border-top:1px dashed #000;margin:3px 0;"></td></tr>
        <tr><td>Subtotal</td><td style="text-align:right;">${money(t.subtotal || t.total)}</td></tr>
        ${num(t.discount) > 0 ? `<tr><td>Diskon</td><td style="text-align:right;">-${money(t.discount)}</td></tr>` : ""}
        <tr><td><b>Total</b></td><td style="text-align:right;"><b>${money(t.total)}</b></td></tr>
        <tr><td>Tunai</td><td style="text-align:right;">${money(t.received || t.total)}</td></tr>
        <tr><td>Kembali</td><td style="text-align:right;">${money(t.change || 0)}</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed #000;margin:5px 0;">
      <p style="font-size:10.5px;margin:3px 0;">${esc(state.settings.receiptFooter || "Terima kasih telah berbelanja!")}</p>
    </div>
  `;
  window.print();
};

// ========================================================
// BARCODE SCANNER MODAL (Camera & Simulated fallback)
// ========================================================
window.startBarcodeScanner = async (targetInputId = "pos-search-input") => {
  const modalRoot = $("#modal-root");
  if (!modalRoot) return;

  modalRoot.innerHTML = `
  <div class="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex flex-col justify-end p-margin-mobile" id="modal-scanner">
    <div class="bg-surface-cream rounded-2xl p-4 flex flex-col gap-3 border border-border-warm shadow-2xl max-w-md mx-auto w-full">
      <div class="flex items-center justify-between pb-1 border-b border-border-warm-subtle">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-primary text-[20px]">barcode_scanner</span>
          <h3 class="text-[14.5px] font-bold text-text-primary-ink">Scan Barcode</h3>
        </div>
        <button class="w-8 h-8 rounded-full bg-surface-sand border border-border-warm flex items-center justify-center text-text-primary-ink" onclick="window.stopBarcodeScanner()">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div class="flex flex-col items-center gap-1.5">
        <video id="scanner-video" class="scanner-video-preview" autoplay playsinline muted></video>
        <p class="text-[12px] text-text-muted-ink text-center">Arahkan kamera ke barcode produk:</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex gap-1.5">
          <input type="text" id="manual-barcode-input" placeholder="Ketik barcode..." class="flex-1 h-10 px-2.5 rounded-lg bg-surface-sand border border-border-warm text-[13px] focus:outline-none focus:border-primary">
          <button type="button" class="h-10 px-3.5 rounded-lg bg-primary text-on-primary font-bold text-[12.5px]" onclick="window.submitManualBarcode('${targetInputId}')">
            Pakai
          </button>
        </div>
        <button type="button" class="h-9 rounded-lg bg-surface-sand border border-border-warm text-text-primary-ink font-semibold text-[12px] hover:bg-surface-container-warm" onclick="window.simulateScanProduct('${targetInputId}')">
          Coba Barcode Contoh
        </button>
      </div>

      <button class="h-10 rounded-xl bg-surface-sand border border-border-warm text-text-primary-ink text-[12.5px] font-semibold" onclick="window.stopBarcodeScanner()">
        Tutup
      </button>
    </div>
  </div>`;

  const video = $("#scanner-video");
  if (navigator.mediaDevices?.getUserMedia && video) {
    try {
      state.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = state.scannerStream;
    } catch (e) {
      console.warn("Camera preview not permitted or unavailable:", e);
    }
  }
};

window.stopBarcodeScanner = () => {
  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach((track) => track.stop());
    state.scannerStream = null;
  }
  window.tutupModalRoot();
};

window.submitManualBarcode = (targetInputId) => {
  const val = $("#manual-barcode-input")?.value.trim();
  if (val) {
    window.processBarcodeScanned(val, targetInputId);
  }
};

window.simulateScanProduct = (targetInputId) => {
  const sample = state.products[0]?.code || "8992775211012";
  window.processBarcodeScanned(sample, targetInputId);
};

window.processBarcodeScanned = (code, targetInputId) => {
  window.stopBarcodeScanner();
  if (targetInputId === "pos-search-input") {
    state.search = code;
    toast(`Barcode: ${code}`);
    render();
    // Auto add if exactly matched
    const matched = state.products.find((p) => p.code === code);
    if (matched) {
      window.tambahKeKeranjang(matched.id);
    }
  } else {
    const el = $(`#${targetInputId}`);
    if (el) el.value = code;
    toast(`Barcode terisi: ${code}`);
  }
};

// ========================================================
// PENGATURAN TOKO MODAL - MOBILE TUNED
// ========================================================
window.bukaPengaturanToko = () => {
  const modalRoot = $("#modal-root");
  if (!modalRoot) return;

  modalRoot.innerHTML = `
  <div class="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex flex-col justify-end p-margin-mobile" id="modal-settings">
    <div class="bg-surface-cream rounded-2xl p-4 flex flex-col gap-2.5 border border-border-warm shadow-2xl max-w-md mx-auto w-full">
      <div class="flex items-center justify-between pb-1 border-b border-border-warm-subtle">
        <h3 class="text-[14.5px] font-bold text-text-primary-ink">Pengaturan Toko</h3>
        <button class="w-8 h-8 rounded-full bg-surface-sand border border-border-warm flex items-center justify-center text-text-primary-ink" onclick="window.tutupModalRoot()">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div class="flex flex-col gap-2 text-[12.5px]">
        <div class="flex flex-col gap-0.5">
          <label class="font-bold text-[12px]">Nama Toko</label>
          <input type="text" id="setting-store-name" value="${esc(state.settings.storeName || "Toko Dani")}" class="h-10 px-2.5 rounded-lg bg-surface-sand border border-border-warm text-[13px]">
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="font-bold text-[12px]">Alamat Toko</label>
          <input type="text" id="setting-store-address" value="${esc(state.settings.address || "")}" placeholder="Jl. Pasar No. 12" class="h-10 px-2.5 rounded-lg bg-surface-sand border border-border-warm text-[13px]">
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="font-bold text-[12px]">Catatan Bawah Struk</label>
          <input type="text" id="setting-store-footer" value="${esc(state.settings.receiptFooter || "Terima kasih telah berbelanja")}" class="h-10 px-2.5 rounded-lg bg-surface-sand border border-border-warm text-[13px]">
        </div>
      </div>

      <div class="flex gap-2 pt-1">
        <button class="flex-1 h-10 rounded-xl bg-surface-sand border border-border-warm text-[12.5px] font-semibold" onclick="window.tutupModalRoot()">
          Batal
        </button>
        <button class="flex-1 h-10 rounded-xl bg-primary text-on-primary text-[12.5px] font-bold" onclick="window.simpanPengaturan()">
          Simpan
        </button>
      </div>
    </div>
  </div>`;
};

window.simpanPengaturan = async () => {
  const storeName = $("#setting-store-name")?.value.trim() || "Toko Dani";
  const address = $("#setting-store-address")?.value.trim() || "";
  const receiptFooter =
    $("#setting-store-footer")?.value.trim() || "Terima kasih telah berbelanja";

  state.settings.storeName = storeName;
  state.settings.address = address;
  state.settings.receiptFooter = receiptFooter;

  try {
    await setDoc(doc(db, "settings", "main"), state.settings, { merge: true });
  } catch (_) {}

  toast("Pengaturan berhasil disimpan!");
  window.tutupModalRoot();
  updateTopBar();
  render();
};

// ========================================================
// MAIN RENDER ROUTER
// ========================================================
function render() {
  const app = $("#app");
  if (!app) return;

  switch (state.page) {
    case "kasir":
      app.innerHTML = renderKasir();
      break;
    case "tambah-barang":
      app.innerHTML = renderTambahBarang();
      window.recalculateMargin();
      break;
    case "stok-barang":
      app.innerHTML = renderStokBarang();
      break;
    case "keuangan":
      app.innerHTML = renderKeuangan();
      break;
    default:
      app.innerHTML = renderKasir();
  }
}

// Global Event Listeners for Bottom Navigation
document.addEventListener("DOMContentLoaded", () => {
  $$("#bottom-nav .nav-tab-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const path = btn.dataset.path;
      if (path) window.pindahHalaman(path);
    });
  });
});

// Auto initialize app
loadAll();
