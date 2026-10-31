// Shared interface pieces: icons, panels, tiles and small controls.

const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  trades: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  positions: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 4.5 9-4.5" opacity=".45"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  journal: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1-2-1.5Zm0 0A2 2 0 0 1 6 17h14"/><path d="M9 8h7"/>',
  playbook: '<path d="M9 11l2 2 4-4"/><path d="M8 4h8v3H8z"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
  analytics: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V7M18 17v-8"/>',
  income: '<circle cx="12" cy="12" r="9"/><path d="M15 8.8c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.3 0 3.2 6 1.6 6 4.8 0 1.4-1.3 2.3-3 2.3-1.3 0-2.4-.5-3-1.5M12 5.5v13"/>',
  risk: '<path d="M12 3 4.5 6v5.5c0 4.7 3.1 8 7.5 9.5 4.4-1.5 7.5-4.8 7.5-9.5V6L12 3Z"/><path d="M12 8.5v4M12 15.5h.01"/>',
  watchlist: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  flow: '<path d="M7 20V5M3 9l4-4 4 4"/><path d="M17 4v15M13 15l4 4 4-4"/>',
  gex: '<path d="M4 5h16M4 12h10M4 19h6"/><path d="M4 3v18"/>',
  volatility: '<path d="M2 12h4l3-8 5 16 3-8h5"/>',
  tools: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.3L3 9.5M3 4v5.5h5.5"/><path d="M4 13a8 8 0 0 0 14.3 4.3L21 14.5M21 20v-5.5h-5.5"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  alert: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  critical: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  roll: '<path d="M17 2.5 21 6.5l-4 4"/><path d="M3 11.5v-1a4 4 0 0 1 4-4h14"/><path d="M7 21.5 3 17.5l4-4"/><path d="M21 12.5v1a4 4 0 0 1-4 4H3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 16V4M7 8.5 12 3.5l5 5M4 21h16"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>',
  command: '<path d="M9 9h6v6H9zM9 9V6a3 3 0 1 0-3 3h3ZM15 9h3a3 3 0 1 0-3-3v3ZM15 15v3a3 3 0 1 0 3-3h-3ZM9 15H6a3 3 0 1 0 3 3v-3Z"/>',
};

function icon(name, size = 16) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

function panel({ title, subtitle = "", actions = "", body = "", className = "", eyebrow = "" }) {
  return `
    <section class="card ${className}">
      ${title || actions ? `<header class="card-head">
        <div>
          ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
          ${title ? `<h2>${title}</h2>` : ""}
          ${subtitle ? `<p>${subtitle}</p>` : ""}
        </div>
        ${actions ? `<div class="card-actions">${actions}</div>` : ""}
      </header>` : ""}
      ${body}
    </section>
  `;
}

function statTile({ label, value, tone = "", sub = "", spark = "", meter = null, id = "" }) {
  const meterMarkup = meter === null ? "" : `<div class="meter ${meter > 100 ? "is-over" : ""}"><span style="width:${Math.max(0, Math.min(100, meter))}%"></span></div>`;
  return `
    <article class="tile" ${id ? `id="${id}"` : ""}>
      <span class="tile-label">${label}</span>
      <strong class="tile-value ${tone}">${value}</strong>
      ${sub ? `<span class="tile-sub">${sub}</span>` : ""}
      ${meterMarkup}
      ${spark ? `<div class="tile-spark">${spark}</div>` : ""}
    </article>
  `;
}

function segmentedControl(name, options, current, label = name) {
  return `<div class="seg" role="group" aria-label="${escapeHtml(label)}">${options.map(([value, text]) => `
    <button type="button" data-seg="${name}" data-value="${value}" class="${value === current ? "active" : ""}" aria-pressed="${value === current}">${text}</button>
  `).join("")}</div>`;
}

function emptyBlock(title, detail = "", action = "") {
  return `<div class="empty-block"><strong>${title}</strong>${detail ? `<p>${detail}</p>` : ""}${action}</div>`;
}

function statusChip(text, tone = "") {
  return `<span class="chip ${tone}">${escapeHtml(text)}</span>`;
}

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Remembered view choices are a convenience only.
  }
}

function positionLabel(trade) {
  if (isOptionTrade(trade)) return optionContractLabel(trade);
  return `${number(trade.size, 4)} shares`;
}

function tradeStatusChip(trade) {
  if (trade.assignedTradeId) return statusChip("Assigned", "info");
  if (isTradeOpen(trade)) return statusChip("Open", "accent");
  const pnl = tradePnl(trade);
  return statusChip(pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Flat", pnl > 0 ? "gain" : pnl < 0 ? "loss" : "");
}

function dteChip(dte) {
  if (dte === null) return `<span class="muted">—</span>`;
  const tone = dte < 0 ? "loss" : dte <= 7 ? "warn" : "";
  return statusChip(dte < 0 ? `${Math.abs(dte)}d past` : `${dte}d`, tone);
}
