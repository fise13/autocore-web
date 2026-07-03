const SEARCH_ITEMS = [
  {
    id: "engine",
    title: "Поиск двигателя",
    subtitle: "Номер, бренд, комплектация",
    query: "G4KC · Hyundai",
  },
  {
    id: "client",
    title: "Поиск клиента",
    subtitle: "Имя, телефон, email",
    query: "Иванов · +7",
  },
  {
    id: "order",
    title: "Поиск заказа",
    subtitle: "Номер наряда, авто, клиент",
    query: "WO-1042",
  },
  {
    id: "vin",
    title: "Поиск VIN",
    subtitle: "17 символов или часть номера",
    query: "KMHXX00XXXX",
  },
];

const ICONS = {
  engine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="10" rx="2"/><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M12 12v2"/></svg>`,
  client: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>`,
  order: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>`,
  vin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h10M4 17h16"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  radar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/><path d="m4.9 4.9 1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  warehouse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  docs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>`,
  orders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>`,
  sales: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9 11h6"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-8M22 20V8"/></svg>`,
};

const DASHBOARD = [
  { icon: "search", title: "Поиск", sub: "Быстрый поиск по названию, номеру и бренду" },
  { icon: "warehouse", title: "Склад", sub: "Учет запчастей и остатков на складе" },
  { icon: "docs", title: "Документы", sub: "Гарантии, счета, накладные" },
  { icon: "orders", title: "Заказ-наряды", sub: "Создание и управление нарядами" },
  { icon: "sales", title: "Продажи", sub: "Клиенты и история сделок" },
  { icon: "analytics", title: "Аналитика", sub: "Отчеты по бизнесу" },
];

const params = new URLSearchParams(window.location.search);
const autoOpen = params.get("auto") === "1";

const els = {
  input: document.getElementById("search-input"),
  panel: document.getElementById("search-panel"),
  list: document.getElementById("search-list"),
  overlay: document.getElementById("overlay"),
  dashboard: document.getElementById("dashboard"),
  tapHint: document.getElementById("tap-hint"),
};

let activeIndex = 0;
let isOpen = false;

function renderList() {
  els.list.innerHTML = SEARCH_ITEMS.map((item, index) => `
    <li>
      <button type="button" class="panel-item${index === activeIndex ? " is-active" : ""}" data-index="${index}">
        <span class="item-icon" aria-hidden="true">${ICONS[item.id]}</span>
        <span class="item-copy">
          <span class="item-title">${item.title}</span>
          <span class="item-sub">${item.subtitle}</span>
        </span>
      </button>
    </li>
  `).join("");

  els.list.querySelectorAll(".panel-item").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      selectItem(index);
    });
  });
}

function renderDashboard() {
  els.dashboard.innerHTML = DASHBOARD.map((card) => `
    <article class="dash-card">
      <span class="dash-icon" aria-hidden="true">${ICONS[card.icon]}</span>
      <div>
        <div class="dash-title">${card.title}</div>
        <div class="dash-sub">${card.sub}</div>
      </div>
    </article>
  `).join("");
}

function setOpen(next) {
  isOpen = next;
  els.panel.classList.toggle("is-visible", isOpen);
  els.overlay.classList.toggle("is-visible", isOpen);
  els.input.classList.toggle("is-open", isOpen);
  els.tapHint.classList.toggle("is-hidden", isOpen);
  els.input.setAttribute("aria-expanded", String(isOpen));
}

function selectItem(index) {
  activeIndex = index;
  const item = SEARCH_ITEMS[index];
  els.input.value = item.query;
  renderList();
  setOpen(true);
}

function openSearch() {
  if (!els.input.value) {
    els.input.value = "";
  }
  setOpen(true);
}

function closeSearch() {
  setOpen(false);
}

els.input.addEventListener("focus", openSearch);
els.input.addEventListener("click", openSearch);
els.overlay.addEventListener("click", closeSearch);

els.input.addEventListener("keydown", (event) => {
  if (!isOpen) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex = Math.min(activeIndex + 1, SEARCH_ITEMS.length - 1);
    renderList();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    renderList();
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectItem(activeIndex);
  }

  if (event.key === "Escape") {
    closeSearch();
  }
});

renderList();
renderDashboard();

if (autoOpen) {
  window.setTimeout(() => {
    openSearch();
    els.input.focus();
  }, 700);
}
