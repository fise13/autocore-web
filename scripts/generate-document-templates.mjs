import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/lib/documents/templates/html");

const themes = {
  classic: {
    label: "CLASSIC",
    brand: "#1f2937",
    ink: "#111827",
    muted: "#6b7280",
    line: "#d1d5db",
    bg: "#ffffff",
    panel: "#f8fafc",
    soft: "#f3f4f6",
    accentText: "#ffffff",
    radius: "6px",
    font: "Inter, Arial, sans-serif",
    note: "Строгий официальный стиль для дилерского сервиса и СТО.",
  },
  premium: {
    label: "PREMIUM",
    brand: "#8b5a2b",
    ink: "#171717",
    muted: "#737373",
    line: "#e7e5e4",
    bg: "#fffdf9",
    panel: "#ffffff",
    soft: "#f6f1ea",
    accentText: "#ffffff",
    radius: "10px",
    font: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    note: "Премиальная карточная подача с теплым бренд-акцентом.",
  },
  modern: {
    label: "MODERN",
    brand: "#2563eb",
    ink: "#0f172a",
    muted: "#64748b",
    line: "#dbe3ef",
    bg: "#ffffff",
    panel: "#f8fbff",
    soft: "#eef4ff",
    accentText: "#ffffff",
    radius: "8px",
    font: "Inter, ui-sans-serif, system-ui, sans-serif",
    note: "Минималистичная SaaS-структура с высокой плотностью информации.",
  },
};

const docs = {
  "work-order": {
    ru: "Заказ-наряд",
    num: "ZN-2026-004821",
    tag: "Открыт",
    lead: "Документ фиксирует прием автомобиля, согласованные работы, материалы и расчет стоимости.",
    primary: "Итог к оплате",
    warrantyBlock: "Гарантия на работы: 12 месяцев или 20 000 км, в зависимости от того, что наступит раньше.",
    footer: "Заказ-наряд сформирован системой AutoCore и действителен при наличии подписей сторон.",
  },
  warranty: {
    ru: "Гарантийный талон",
    num: "GT-2026-001392",
    tag: "Гарантия активна",
    lead: "Подтверждает гарантийные обязательства по выполненным работам и установленным запчастям.",
    primary: "Срок гарантии",
    warrantyBlock:
      "Период гарантии: 12 месяцев. Исключения: естественный износ, нарушение эксплуатации, внешние повреждения.",
    footer: "Гарантийный талон применяется только к позициям, указанным в документе.",
  },
  "completion-act": {
    ru: "Акт выполненных работ",
    num: "AVR-2026-003074",
    tag: "Работы завершены",
    lead: "Подтверждает выполнение работ, передачу автомобиля клиенту и отсутствие претензий на момент выдачи.",
    primary: "Принято клиентом",
    warrantyBlock: "Клиент ознакомлен с перечнем работ, рекомендациями и гарантийными условиями.",
    footer: "Акт сформирован системой AutoCore после финального контроля качества.",
  },
};

const rows = {
  client: [
    ["Клиент", "{{client.fullName}}"],
    ["Телефон", "{{client.phone}}"],
    ["Email", "{{client.email}}"],
    ["Документ", "{{client.identityDocument}}"],
  ],
  car: [
    ["Марка", "{{vehicle.make}}"],
    ["Модель", "{{vehicle.model}}"],
    ["VIN", "{{vehicle.vin}}"],
    ["Гос. номер", "{{vehicle.plateNumber}}"],
    ["Пробег", "{{vehicle.mileage}} км"],
    ["Двигатель", "{{vehicle.engine.type}}, {{vehicle.engine.volume}}, {{vehicle.engine.power}}"],
  ],
};

const works = [
  ["Компьютерная диагностика", "1", "{{currency}} 18 000"],
  ["Замена двигателя", "1", "{{currency}} 320 000"],
  ["Замена масла и фильтров", "1", "{{currency}} 42 500"],
  ["Финальный контроль и тест-драйв", "1", "{{currency}} 15 000"],
];

const parts = [
  ["Двигатель контрактный", "{{part.engine.sku}}", "1", "{{currency}} 1 850 000"],
  ["Масло моторное 5W-30", "{{part.oil.sku}}", "6 л", "{{currency}} 54 000"],
  ["Фильтр масляный", "{{part.filter.sku}}", "1", "{{currency}} 9 500"],
  ["Комплект прокладок", "{{part.gasket.sku}}", "1", "{{currency}} 28 000"],
];

const timeline = [
  "Поступление автомобиля",
  "Диагностика",
  "Замена двигателя",
  "Замена масла",
  "Ремонт",
  "Выдача клиенту",
];

function infoCards(items) {
  return items.map(([k, v]) => `<div class="field"><span>${k}</span><strong>${v}</strong></div>`).join("\n");
}

function listItems(items, type) {
  return items
    .map(
      (i, idx) => `
        <div class="line-item">
          <div class="li-index">${String(idx + 1).padStart(2, "0")}</div>
          <div class="li-main">
            <strong>${i[0]}</strong>
            <span>${type === "parts" ? `Артикул: ${i[1]}` : "Сервисная операция AutoCore"}</span>
          </div>
          <div class="li-meta">${type === "parts" ? i[2] : `${i[1]} ед.`}</div>
          <div class="li-price">${type === "parts" ? i[3] : i[2]}</div>
        </div>`,
    )
    .join("\n");
}

function qr() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0,
    0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0,
    1, 1, 0, 1, 0, 1, 1,
  ];
  return `<div class="qr" aria-label="QR код документа">${cells
    .map((v) => `<i class="${v ? "on" : ""}"></i>`)
    .join("")}</div>`;
}

function template(themeKey, docKey) {
  const t = themes[themeKey];
  const d = docs[docKey];
  const timelineHtml = timeline
    .map(
      (item, idx) => `
        <div class="step">
          <div class="dot">${idx + 1}</div>
          <div>
            <strong>${item}</strong>
            <span>{{history.${idx}.date}} · {{history.${idx}.responsible}}</span>
          </div>
        </div>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${d.ru} · AutoCore · ${t.label}</title>
  <style>
    :root {
      --brand: ${t.brand};
      --brand: {{company.brandColor}};
      --ink: ${t.ink};
      --muted: ${t.muted};
      --line: ${t.line};
      --bg: ${t.bg};
      --panel: ${t.panel};
      --soft: ${t.soft};
      --accent-text: ${t.accentText};
      --radius: ${t.radius};
      color-scheme: light dark;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #e5e7eb; color: var(--ink); font-family: ${t.font}; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 0; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm; background: var(--bg); position: relative; overflow: hidden; }
    .page::before { content: ""; position: absolute; inset: 0 0 auto 0; height: ${themeKey === "classic" ? "4mm" : "7mm"}; background: var(--brand); }
    header { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; padding-top: 7mm; }
    .brand { display: flex; gap: 14px; align-items: center; }
    .logo { width: 42mm; max-height: 18mm; object-fit: contain; object-position: left center; }
    .company h1 { margin: 0; font-size: 20px; line-height: 1.15; letter-spacing: 0; }
    .company p, .meta p, .small { margin: 3px 0 0; color: var(--muted); font-size: 10px; line-height: 1.45; }
    .docbox { min-width: 58mm; border: 1px solid var(--line); border-radius: var(--radius); padding: 12px; background: ${themeKey === "premium" ? "linear-gradient(180deg,#ffffff,#fff8ef)" : "var(--panel)"}; }
    .docbox span { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: var(--soft); color: var(--brand); font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .docbox h2 { margin: 10px 0 4px; font-size: 19px; line-height: 1.1; }
    .docbox strong { font-size: 12px; }
    .hero { margin-top: 12mm; display: grid; grid-template-columns: 1.45fr .55fr; gap: 12px; align-items: stretch; }
    .summary { padding: 16px; border-radius: var(--radius); background: ${themeKey === "modern" ? "linear-gradient(135deg,#f8fbff,#ffffff)" : "var(--panel)"}; border: 1px solid var(--line); }
    .summary h3 { margin: 0; font-size: 24px; line-height: 1.05; }
    .summary p { margin: 8px 0 0; color: var(--muted); font-size: 11px; line-height: 1.55; max-width: 118mm; }
    .total-card { border-radius: var(--radius); background: var(--brand); color: var(--accent-text); padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 36mm; }
    .total-card span { opacity: .82; font-size: 10px; text-transform: uppercase; font-weight: 700; }
    .total-card strong { font-size: 22px; line-height: 1; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .section { margin-top: 11px; break-inside: avoid; }
    .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
    .section-title h3 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--brand); }
    .section-title span { color: var(--muted); font-size: 9px; }
    .card { border: 1px solid var(--line); border-radius: var(--radius); background: #fff; padding: 10px; }
    .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
    .field { min-height: 15mm; padding: 8px; border-radius: calc(var(--radius) - 2px); background: var(--panel); border: 1px solid ${themeKey === "classic" ? "transparent" : "var(--line)"}; }
    .field span { display: block; color: var(--muted); font-size: 8.5px; margin-bottom: 3px; }
    .field strong { display: block; font-size: 10.5px; line-height: 1.25; overflow-wrap: anywhere; }
    .line-list { display: grid; gap: 6px; }
    .line-item { display: grid; grid-template-columns: 9mm 1fr 22mm 30mm; gap: 8px; align-items: center; padding: 8px; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
    .li-index { width: 8mm; height: 8mm; border-radius: 50%; display: grid; place-items: center; background: var(--soft); color: var(--brand); font-size: 8px; font-weight: 800; }
    .li-main strong { display: block; font-size: 10.5px; }
    .li-main span, .li-meta { color: var(--muted); font-size: 9px; }
    .li-price { text-align: right; font-size: 10.5px; font-weight: 800; }
    .timeline { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: #fff; }
    .step { min-height: 26mm; padding: 9px 7px; position: relative; background: linear-gradient(180deg,#fff,var(--panel)); border-right: 1px solid var(--line); }
    .step:last-child { border-right: 0; }
    .step:not(:last-child)::after { content: ""; position: absolute; right: -5px; top: 50%; width: 9px; height: 9px; border-top: 1px solid var(--line); border-right: 1px solid var(--line); background: var(--panel); transform: translateY(-50%) rotate(45deg); z-index: 2; }
    .dot { width: 8mm; height: 8mm; border-radius: 50%; display: grid; place-items: center; background: var(--brand); color: #fff; font-size: 9px; font-weight: 800; margin-bottom: 7px; }
    .step strong { display: block; font-size: 9.5px; line-height: 1.22; }
    .step span { display: block; margin-top: 4px; color: var(--muted); font-size: 8px; line-height: 1.3; }
    .money { display: grid; grid-template-columns: 1fr 44mm; gap: 10px; align-items: stretch; }
    .note { padding: 10px; border-radius: var(--radius); background: var(--soft); color: var(--ink); font-size: 10px; line-height: 1.45; }
    .totals { border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: #fff; }
    .totals div { display: flex; justify-content: space-between; gap: 12px; padding: 7px 9px; border-bottom: 1px solid var(--line); font-size: 10px; }
    .totals div:last-child { border-bottom: 0; background: var(--brand); color: #fff; font-weight: 900; }
    .bottom { margin-top: 12px; display: grid; grid-template-columns: 1fr 30mm; gap: 12px; align-items: end; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .signature { min-height: 24mm; border: 1px solid var(--line); border-radius: var(--radius); padding: 9px; background: #fff; display: flex; flex-direction: column; justify-content: space-between; }
    .signature span { color: var(--muted); font-size: 9px; }
    .signature b { display: block; padding-top: 8px; border-top: 1px solid var(--line); font-size: 10px; }
    .qr { width: 30mm; height: 30mm; border: 1px solid var(--line); border-radius: ${themeKey === "premium" ? "8px" : "4px"}; padding: 3mm; display: grid; grid-template-columns: repeat(9, 1fr); gap: 1px; background: #fff; }
    .qr i { display: block; border-radius: 1px; background: #fff; }
    .qr i.on { background: var(--ink); }
    footer { margin-top: 9px; padding-top: 7px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 8.5px; line-height: 1.35; }
    @media print {
      html, body { background: #fff; }
      .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
      .section, .card, .line-item, .signature, .timeline { break-inside: avoid; }
    }
    @media screen {
      .page { box-shadow: 0 20px 70px rgba(15, 23, 42, .18); }
      @media (prefers-color-scheme: dark) {
        html, body { background: #0f172a; }
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div class="brand">
        <img class="logo" src="{{company.logoUrl}}" alt="{{company.name}}" />
        <div class="company">
          <h1>{{company.name}}</h1>
          <p>{{company.address}}</p>
          <p>{{company.phone}} · {{company.email}}</p>
        </div>
      </div>
      <aside class="docbox">
        <span>${d.tag}</span>
        <h2>${d.ru}</h2>
        <strong>${d.num}</strong>
        <p>Дата: {{document.date}}</p>
      </aside>
    </header>

    <section class="hero">
      <div class="summary">
        <h3>${d.ru}</h3>
        <p>${d.lead}</p>
        <p>${t.note}</p>
      </div>
      <div class="total-card">
        <span>${d.primary}</span>
        <strong>{{currency}} {{totals.grandTotal}}</strong>
        <small>Исполнитель: {{employee.fullName}}</small>
      </div>
    </section>

    <section class="grid-2">
      <div class="section">
        <div class="section-title"><h3>Данные клиента</h3><span>{{client.customerId}}</span></div>
        <div class="card"><div class="fields">${infoCards(rows.client)}</div></div>
      </div>
      <div class="section">
        <div class="section-title"><h3>Данные автомобиля</h3><span>{{vehicle.profileId}}</span></div>
        <div class="card"><div class="fields">${infoCards(rows.car)}</div></div>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h3>Перечень работ</h3><span>Сервисные операции</span></div>
      <div class="line-list">${listItems(works, "works")}</div>
    </section>

    <section class="section">
      <div class="section-title"><h3>Использованные запчасти</h3><span>Склад AutoCore</span></div>
      <div class="line-list">${listItems(parts, "parts")}</div>
    </section>

    <section class="section">
      <div class="section-title"><h3>История автомобиля</h3><span>Хронология обслуживания</span></div>
      <div class="timeline">${timelineHtml}</div>
    </section>

    <section class="section money">
      <div class="note"><strong>Условия и примечания.</strong><br />${d.warrantyBlock}<br />Рекомендации мастера: {{service.recommendations}}</div>
      <div class="totals">
        <div><span>Работы</span><strong>{{currency}} {{totals.labor}}</strong></div>
        <div><span>Запчасти</span><strong>{{currency}} {{totals.parts}}</strong></div>
        <div><span>Скидка</span><strong>{{currency}} {{totals.discount}}</strong></div>
        <div><span>Итого</span><strong>{{currency}} {{totals.grandTotal}}</strong></div>
      </div>
    </section>

    <section class="bottom">
      <div class="signatures">
        <div class="signature"><span>Исполнитель</span><b>{{employee.fullName}} / подпись</b></div>
        <div class="signature"><span>Клиент</span><b>{{client.fullName}} / подпись</b></div>
      </div>
      ${qr()}
    </section>

    <footer>
      <span>${d.footer}</span>
      <span>Уникальный номер: ${d.num} · QR: {{document.qrPayload}}</span>
    </footer>
  </main>
</body>
</html>
`;
}

fs.mkdirSync(outDir, { recursive: true });

for (const themeKey of Object.keys(themes)) {
  for (const docKey of Object.keys(docs)) {
    fs.writeFileSync(path.join(outDir, `${themeKey}-${docKey}.html`), template(themeKey, docKey));
  }
}

console.log(`Generated 9 AutoCore HTML templates in ${outDir}`);
