const STORAGE_KEY = "personal-trading-journal-v1";
const API_URL = "/api/journal";

const navItems = [
  ["dashboard", "Dashboard"],
  ["trades", "Trade Log"],
  ["calendar", "Calendar"],
  ["daily", "Daily Journal"],
  ["weekly", "Weekly Review"],
  ["playbook", "Playbook"],
  ["reports", "Reports"],
  ["risk", "Risk"],
  ["mistakes", "Mistakes"],
  ["notebook", "Notebook"],
  ["blocked", "Blocked Trades"],
  ["settings", "Settings"],
];

const defaultStrategies = [
  {
    id: crypto.randomUUID(),
    name: "Opening Range Breakout",
    rules: "Trade after range forms. Confirm volume expansion. Stop goes below range. Take partials at 1R.",
    checklist: ["Range formed", "Volume expansion confirmed", "Stop below range", "Partial at 1R"],
  },
  {
    id: crypto.randomUUID(),
    name: "Pullback Continuation",
    rules: "Trend must be intact. Wait for controlled pullback. Enter only after reclaim. Avoid extended entries.",
    checklist: ["Trend intact", "Controlled pullback", "Reclaim confirmed", "Entry not extended"],
  },
  {
    id: crypto.randomUUID(),
    name: "Reversal At Key Level",
    rules: "Level marked before session. Wait for rejection candle. Risk must be defined. No chasing.",
    checklist: ["Level planned before session", "Rejection confirmed", "Risk defined", "No chasing"],
  },
  {
    id: crypto.randomUUID(),
    name: "Long Call",
    rules: "Define thesis, expiry, strike, premium risk, and invalidation before entry. Avoid chasing inflated premium.",
    checklist: ["Directional thesis defined", "Expiry selected", "Premium risk accepted", "Invalidation level set"],
  },
  {
    id: crypto.randomUUID(),
    name: "Long Put",
    rules: "Define bearish thesis, expiry, strike, premium risk, and invalidation before entry. Avoid entering after IV expansion without a plan.",
    checklist: ["Bearish thesis defined", "Expiry selected", "Premium risk accepted", "Invalidation level set"],
  },
  {
    id: crypto.randomUUID(),
    name: "Cash Secured Put",
    rules: "Sell puts only on tickers you are willing to own. Confirm cash available, assignment plan, and max risk.",
    checklist: ["Willing to own shares", "Cash available", "Assignment plan defined", "Max risk reviewed"],
  },
];

const requiredOptionStrategies = ["Long Call", "Long Put", "Cash Secured Put"];

const today = new Date().toISOString().slice(0, 10);

const sampleTrades = [
  {
    id: crypto.randomUUID(),
    date: today,
    exitDate: today,
    entryTime: "09:43",
    exitTime: "10:18",
    symbol: "AAPL",
    assetClass: "Stocks",
    account: "Main",
    direction: "Long",
    strategy: "Opening Range Breakout",
    entry: 184.2,
    exit: 187.1,
    size: 60,
    fees: 1.2,
    stop: 182.9,
    target: 188.2,
    plannedEntry: 184,
    plannedStop: 182.9,
    plannedTarget: 188.2,
    plannedRisk: 78,
    actualRisk: 78,
    session: "Open",
    quality: "A",
    emotion: "Patient",
    mistake: "None",
    market: "Trending",
    image: "",
    customTags: "opening-range, volume",
    partials: "",
    notes: "Clean reclaim above morning range. Took partial too late but followed the plan.",
    ruleChecks: ["Range formed", "Volume expansion confirmed", "Stop below range"],
    followedRules: true,
    reviewed: true,
  },
  {
    id: crypto.randomUUID(),
    date: today,
    exitDate: today,
    entryTime: "11:07",
    exitTime: "11:28",
    symbol: "TSLA",
    assetClass: "Stocks",
    account: "Main",
    direction: "Short",
    strategy: "Reversal At Key Level",
    entry: 171.5,
    exit: 172.25,
    size: 80,
    fees: 1.4,
    stop: 172.4,
    target: 169.9,
    plannedEntry: 171.1,
    plannedStop: 172.4,
    plannedTarget: 169.9,
    plannedRisk: 104,
    actualRisk: 72,
    session: "Midday",
    quality: "C",
    emotion: "Impatient",
    mistake: "FOMO",
    market: "Choppy",
    image: "",
    customTags: "key-level, chase",
    partials: "",
    notes: "Entered before confirmation. This was not aligned with the reversal checklist.",
    ruleChecks: ["Level planned before session"],
    followedRules: false,
    reviewed: false,
  },
  {
    id: crypto.randomUUID(),
    date: offsetDate(-2),
    exitDate: offsetDate(-2),
    entryTime: "14:10",
    exitTime: "15:02",
    symbol: "NVDA",
    assetClass: "Stocks",
    account: "Main",
    direction: "Long",
    strategy: "Pullback Continuation",
    entry: 912.4,
    exit: 926.8,
    size: 12,
    fees: 1,
    stop: 904.9,
    target: 930,
    plannedEntry: 912,
    plannedStop: 904.9,
    plannedTarget: 930,
    plannedRisk: 90,
    actualRisk: 90,
    session: "Power hour",
    quality: "A+",
    emotion: "Calm",
    mistake: "None",
    market: "Trending",
    image: "",
    customTags: "pullback, trend",
    partials: "920@6, 926.8@6",
    notes: "Best trade of the week. Waited for pullback and let the target work.",
    ruleChecks: ["Trend intact", "Controlled pullback", "Reclaim confirmed", "Entry not extended"],
    followedRules: true,
    reviewed: true,
  },
  {
    id: crypto.randomUUID(),
    date: offsetDate(-5),
    exitDate: offsetDate(-5),
    entryTime: "10:52",
    exitTime: "11:11",
    symbol: "MSFT",
    assetClass: "Stocks",
    account: "Main",
    direction: "Long",
    strategy: "Opening Range Breakout",
    entry: 420.3,
    exit: 418.8,
    size: 50,
    fees: 1,
    stop: 418.7,
    target: 424,
    plannedEntry: 420.3,
    plannedStop: 418.7,
    plannedTarget: 424,
    plannedRisk: 80,
    actualRisk: 80,
    session: "Open",
    quality: "B",
    emotion: "Anxious",
    mistake: "Exited early",
    market: "Volatile",
    image: "",
    customTags: "volatility, early-exit",
    partials: "",
    notes: "Premature exit during normal pullback. Need to size smaller on volatile sessions.",
    ruleChecks: ["Range formed", "Volume expansion confirmed"],
    followedRules: true,
    reviewed: true,
  },
];

let state = createDefaultState();
let activeView = "dashboard";
let selectedTradeId = state.trades[0]?.id ?? null;
let selectedDay = today;
let editingTradeId = null;
let lastDeletedTrade = null;
let shellEventsBound = false;
let syncStatus = { text: "Saved locally", mode: "" };

const appView = document.querySelector("#appView");
const viewTitle = document.querySelector("#viewTitle");
const viewEyebrow = document.querySelector("#viewEyebrow");
const navList = document.querySelector("#navList");
const tradeDialog = document.querySelector("#tradeDialog");
const tradeForm = document.querySelector("#tradeForm");
const deleteTradeButton = document.querySelector("#deleteTradeButton");

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return normalizeState(JSON.parse(stored));
  return createDefaultState();
}

function createDefaultState() {
  return {
    trades: sampleTrades,
    strategies: defaultStrategies,
    dayNotes: {
      [today]: {
        plan: "Trade only A setups. Max two losses. No entries before confirmation.",
        recap: "Good patience on AAPL. TSLA was a reminder to wait for confirmation.",
        mental: "Focused",
        rules: {
          premarket: true,
          maxLoss: true,
          screenshots: false,
          recap: true,
        },
      },
    },
    weeklyReviews: {},
    notebook: [
      {
        id: crypto.randomUUID(),
        date: today,
        title: "Process note",
        body: "Review A+ setups separately from forced trades.",
      },
    ],
    blockedTrades: [],
    settings: {
      maxDailyLoss: 500,
      defaultRisk: 100,
      accountName: "Main",
      darkMode: false,
    },
  };
}

function normalizeState(nextState) {
  const defaults = createDefaultState();
  nextState.trades ||= [];
  nextState.strategies ||= defaults.strategies;
  nextState.strategies = nextState.strategies.map((strategy) => ({
    ...strategy,
    checklist: strategy.checklist || String(strategy.rules || "").split(".").map((rule) => rule.trim()).filter(Boolean),
  }));
  const existingStrategyNames = new Set(nextState.strategies.map((strategy) => strategy.name));
  defaultStrategies
    .filter((strategy) => requiredOptionStrategies.includes(strategy.name) && !existingStrategyNames.has(strategy.name))
    .forEach((strategy) => nextState.strategies.push({ ...strategy }));
  nextState.dayNotes ||= {};
  nextState.weeklyReviews ||= {};
  nextState.notebook ||= [];
  nextState.blockedTrades ||= [];
  nextState.settings = { ...defaults.settings, ...(nextState.settings || {}) };
  nextState.trades = nextState.trades.map((trade) => ({
    assetClass: "Stocks",
    account: nextState.settings.accountName || "Main",
    exitDate: trade.date || today,
    plannedEntry: trade.entry || 0,
    plannedStop: trade.stop || 0,
    plannedTarget: trade.target || 0,
    plannedRisk: 0,
    actualRisk: 0,
    session: "Open",
    customTags: "",
    partials: "",
    ruleChecks: [],
    ...trade,
  })).map((trade) => ({
    ...trade,
    entry: Number(trade.entry || 0),
    exit: Number(trade.exit || 0),
    size: Number(trade.size || 0),
    fees: Number(trade.fees || 0),
    stop: Number(trade.stop || 0),
    target: Number(trade.target || 0),
    plannedEntry: Number(trade.plannedEntry || 0),
    plannedStop: Number(trade.plannedStop || 0),
    plannedTarget: Number(trade.plannedTarget || 0),
    plannedRisk: Number(trade.plannedRisk || 0),
    actualRisk: Number(trade.actualRisk || 0),
    exitDate: trade.exitDate || trade.date,
    followedRules: trade.followedRules === true || trade.followedRules === "true",
    reviewed: trade.reviewed === true || trade.reviewed === "true",
    ruleChecks: Array.isArray(trade.ruleChecks) ? trade.ruleChecks : String(trade.ruleChecks || "").split("|").filter(Boolean),
  }));
  return nextState;
}

async function loadPersistedState() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      state = normalizeState(await response.json());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      syncStatus = { text: "Saved to file", mode: "" };
      return;
    }
    if (response.status === 404) {
      state = loadState();
      await saveStateToServer();
      return;
    }
  } catch {
    // Direct file usage has no API server, so browser storage remains available.
  }
  state = loadState();
}

async function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const savedToFile = await saveStateToServer();
  updateSidebar();
  return savedToFile;
}

async function saveStateToServer() {
  setSyncStatus("Saving", "saving");
  try {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state, null, 2),
    });
    if (!response.ok) throw new Error("Journal file save failed");
    setSyncStatus("Saved to file");
    return true;
  } catch {
    setSyncStatus("Saved in browser", "offline");
    // The app still persists locally when opened without the local server.
    return false;
  }
}

function setSyncStatus(text, mode = "") {
  syncStatus = { text, mode };
  const element = document.querySelector("#syncStatus");
  if (!element) return;
  element.textContent = text;
  element.className = `sync-pill ${mode}`.trim();
}

function money(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function number(value, digits = 2) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function tradePnl(trade) {
  const partials = parsePartials(trade.partials);
  let gross;
  if (partials.length) {
    const closedSize = partials.reduce((sum, item) => sum + item.size, 0);
    const partialGross = partials.reduce((sum, item) => {
      return sum + (trade.direction === "Long"
        ? (item.price - trade.entry) * item.size
        : (trade.entry - item.price) * item.size);
    }, 0);
    const remaining = Math.max(0, trade.size - closedSize);
    const remainingGross = trade.direction === "Long"
      ? (trade.exit - trade.entry) * remaining
      : (trade.entry - trade.exit) * remaining;
    gross = partialGross + remainingGross;
  } else {
    gross = trade.direction === "Long"
      ? (trade.exit - trade.entry) * trade.size
      : (trade.entry - trade.exit) * trade.size;
  }
  return gross - (Number(trade.fees) || 0);
}

function tradeR(trade) {
  const actualRisk = Number(trade.actualRisk || 0);
  if (actualRisk > 0) return tradePnl(trade) / actualRisk;
  const riskPerUnit = trade.direction === "Long"
    ? trade.entry - trade.stop
    : trade.stop - trade.entry;
  const risk = riskPerUnit * trade.size;
  if (!risk || risk <= 0) return 0;
  return tradePnl(trade) / risk;
}

function parsePartials(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [price, size] = item.split("@").map(Number);
      return Number.isFinite(price) && Number.isFinite(size) ? { price, size } : null;
    })
    .filter(Boolean);
}

function tradeTags(trade) {
  return String(trade.customTags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function strategyForTrade(trade) {
  return state.strategies.find((strategy) => strategy.name === trade.strategy);
}

function ruleScore(trade) {
  const checklist = strategyForTrade(trade)?.checklist || [];
  if (!checklist.length) return trade.followedRules ? 100 : 0;
  return Math.round((trade.ruleChecks || []).filter((rule) => checklist.includes(rule)).length / checklist.length * 100);
}

function executionScore(trade) {
  let score = 100;
  if (!trade.followedRules) score -= 25;
  if (trade.mistake && trade.mistake !== "None") score -= 20;
  if (!trade.reviewed) score -= 10;
  if (Number(trade.actualRisk || 0) > Number(trade.plannedRisk || 0) && Number(trade.plannedRisk || 0) > 0) score -= 15;
  if (trade.quality === "C") score -= 10;
  if (trade.quality === "Forced") score -= 25;
  return Math.max(0, Math.min(100, score));
}

function tradeDurationMinutes(trade) {
  if (!trade.entryTime || !trade.exitTime) return 0;
  const exitDate = trade.exitDate || trade.date;
  const entry = new Date(`${trade.date}T${trade.entryTime}`);
  const exit = new Date(`${exitDate}T${trade.exitTime}`);
  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) return 0;
  return Math.max(0, Math.round((exit - entry) / 60000));
}

function tradeDurationLabel(trade) {
  const minutes = tradeDurationMinutes(trade);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days}d ${hours}h ${mins}m`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

function dayName(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" });
}

function tradeDateLabel(trade) {
  const exitDate = trade.exitDate || trade.date;
  return exitDate && exitDate !== trade.date ? `${trade.date} to ${exitDate}` : trade.date;
}

function tradeTimeLabel(trade) {
  const end = trade.exitTime ? `${trade.exitDate && trade.exitDate !== trade.date ? `${trade.exitDate} ` : ""}${trade.exitTime}` : "Open";
  return `${trade.date} ${trade.entryTime || ""} - ${end}`.trim();
}

function tradeRealizedDate(trade) {
  return trade.exitDate || trade.date;
}

function metrics(trades = state.trades) {
  const total = trades.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const wins = trades.filter((trade) => tradePnl(trade) > 0);
  const losses = trades.filter((trade) => tradePnl(trade) < 0);
  const grossWin = wins.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + tradePnl(trade), 0));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = trades.length ? ((wins.length / trades.length) * avgWin) - ((losses.length / trades.length) * avgLoss) : 0;
  return {
    total,
    count: trades.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? grossWin : 0,
    avgR: trades.length ? trades.reduce((sum, trade) => sum + tradeR(trade), 0) / trades.length : 0,
    reviewed: trades.length ? (trades.filter((trade) => trade.reviewed).length / trades.length) * 100 : 0,
    avgWin,
    avgLoss,
    expectancy,
  };
}

function renderShell() {
  document.body.classList.toggle("dark-mode", Boolean(state.settings?.darkMode));
  navList.innerHTML = navItems.map(([id, label]) => `
    <button class="nav-button ${id === activeView ? "active" : ""}" data-view="${id}" type="button">
      <span>${navIcon(id)}</span>${label}
    </button>
  `).join("");

  navList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.view;
      render();
    });
  });

  if (shellEventsBound) return;
  shellEventsBound = true;
  setSyncStatus(syncStatus.text, syncStatus.mode);
  document.querySelector("#newTradeButton").addEventListener("click", () => openTradeDialog());
  document.querySelector("#exportButton").addEventListener("click", exportData);
  document.querySelector("#importInput").addEventListener("change", importData);
  tradeForm.addEventListener("submit", saveTradeFromForm);
  deleteTradeButton.addEventListener("click", deleteCurrentTrade);
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => tradeDialog.close());
  });
}

function navIcon(id) {
  return {
    dashboard: "◫",
    trades: "≡",
    calendar: "▦",
    daily: "□",
    weekly: "◧",
    playbook: "✓",
    reports: "↗",
    risk: "◇",
    mistakes: "!",
    notebook: "✎",
    blocked: "⊘",
    settings: "⚙",
  }[id];
}

function render() {
  const title = navItems.find(([id]) => id === activeView)?.[1] ?? "Dashboard";
  viewTitle.textContent = title;
  viewEyebrow.textContent = activeView === "dashboard" ? "Journal overview" : "Trading journal";
  renderShell();
  updateSidebar();

  if (activeView === "dashboard") renderDashboard();
  if (activeView === "trades") renderTrades();
  if (activeView === "calendar") renderCalendar();
  if (activeView === "daily") renderDaily();
  if (activeView === "weekly") renderWeekly();
  if (activeView === "playbook") renderPlaybook();
  if (activeView === "reports") renderReports();
  if (activeView === "risk") renderRisk();
  if (activeView === "mistakes") renderMistakes();
  if (activeView === "notebook") renderNotebook();
  if (activeView === "blocked") renderBlockedTrades();
  if (activeView === "settings") renderSettings();
}

function updateSidebar() {
  const todaysTrades = state.trades.filter((trade) => tradeRealizedDate(trade) === today);
  const total = todaysTrades.reduce((sum, trade) => sum + tradePnl(trade), 0);
  document.querySelector("#sidebarPnl").textContent = money(total);
  document.querySelector("#sidebarPnl").className = total >= 0 ? "positive" : "negative";
  document.querySelector("#sidebarMeta").textContent = `${todaysTrades.length} trade${todaysTrades.length === 1 ? "" : "s"} today`;
}

function renderDashboard() {
  const m = metrics();
  const recent = [...state.trades].sort((a, b) => `${b.date}${b.entryTime}`.localeCompare(`${a.date}${a.entryTime}`)).slice(0, 8);
  appView.innerHTML = `
    ${renderKpis(m)}
    <div class="layout-two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Equity Pulse</h2>
            <p class="muted">Last twelve logged sessions by realized P&L.</p>
          </div>
        </div>
        ${renderPnlBars()}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Review Queue</h2>
            <p class="muted">Trades that still need notes or a final read.</p>
          </div>
        </div>
        ${renderReviewQueue()}
      </section>
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-header">
        <div>
          <h2>Equity Curve</h2>
          <p class="muted">Cumulative P&L by logged session.</p>
        </div>
      </div>
      ${renderLineChart("equity")}
    </section>
    <section class="panel" style="margin-top:18px">
      <div class="panel-header">
        <h2>Recent Trades</h2>
        <button class="ghost-button" data-view-link="trades" type="button">Open Log</button>
      </div>
      ${renderTradeTable(recent)}
    </section>
  `;
  attachTradeRows();
  attachViewLinks();
}

function renderKpis(m) {
  return `
    <section class="kpi-grid">
      <div class="kpi"><span>Net P&L</span><strong class="${m.total >= 0 ? "positive" : "negative"}">${money(m.total)}</strong></div>
      <div class="kpi"><span>Win Rate</span><strong>${number(m.winRate, 1)}%</strong></div>
      <div class="kpi"><span>Profit Factor</span><strong>${number(m.profitFactor, 2)}</strong></div>
      <div class="kpi"><span>Average R</span><strong>${number(m.avgR, 2)}R</strong></div>
      <div class="kpi"><span>Reviewed</span><strong>${number(m.reviewed, 0)}%</strong></div>
    </section>
  `;
}

function renderPnlBars() {
  const byDate = groupByDate(state.trades).slice(-12);
  if (!byDate.length) return `<div class="empty-state">Log trades to see session performance.</div>`;
  const max = Math.max(...byDate.map((day) => Math.abs(day.pnl)), 1);
  return `
    <div class="chart" aria-label="Session P&L bar chart">
      ${byDate.map((day) => `
        <div class="bar-slot">
          <div class="bar-value ${day.pnl < 0 ? "negative" : "positive"}">${money(day.pnl)}</div>
          <div class="bar ${day.pnl < 0 ? "loss" : ""}" style="height:${Math.max(10, Math.abs(day.pnl) / max * 100)}%" title="${day.date}: ${money(day.pnl)}"></div>
          <span>${day.date.slice(5)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderReviewQueue() {
  const queue = state.trades.filter((trade) => !trade.reviewed).slice(0, 6);
  if (!queue.length) return `<div class="empty-state">No open reviews. Nice and tidy.</div>`;
  return `<div class="day-list">${queue.map((trade) => `
    <button class="day-item click-row" data-trade-id="${trade.id}" type="button">
      <div class="day-row"><strong>${trade.symbol} ${trade.direction}</strong><span class="${tradePnl(trade) >= 0 ? "positive" : "negative"}">${money(tradePnl(trade))}</span></div>
      <span class="muted">${tradeDateLabel(trade)} · ${daysSince(trade.date)} days old · ${trade.mistake} · ${trade.quality}</span>
    </button>
  `).join("")}</div>`;
}

function daysSince(date) {
  return Math.max(0, Math.floor((new Date(`${today}T00:00:00`) - new Date(`${date}T00:00:00`)) / 86400000));
}

function renderTrades() {
  appView.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Trade Log</h2>
          <p class="muted">Search, filter, open, and review every manual trade.</p>
        </div>
      </div>
      <div class="filter-row">
        <input id="tradeSearch" type="search" placeholder="Search symbol, notes, strategy" />
        <select id="assetFilter"><option value="">All assets</option>${unique("assetClass").map((v) => `<option>${v}</option>`).join("")}</select>
        <select id="sessionFilter"><option value="">All sessions</option>${unique("session").map((v) => `<option>${v}</option>`).join("")}</select>
        <select id="strategyFilter"><option value="">All strategies</option>${state.strategies.map((s) => `<option>${s.name}</option>`).join("")}</select>
        <select id="mistakeFilter"><option value="">All mistakes</option>${unique("mistake").map((v) => `<option>${v}</option>`).join("")}</select>
        <select id="reviewFilter"><option value="">Any review status</option><option value="reviewed">Reviewed</option><option value="open">Needs review</option></select>
      </div>
      <div id="tradeTableMount"></div>
    </section>
    <section id="tradeDetailMount" style="margin-top:18px"></section>
  `;

  ["tradeSearch", "assetFilter", "sessionFilter", "strategyFilter", "mistakeFilter", "reviewFilter"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("input", renderFilteredTrades);
  });
  renderFilteredTrades();
}

function renderFilteredTrades() {
  const search = document.querySelector("#tradeSearch")?.value.toLowerCase() ?? "";
  const strategy = document.querySelector("#strategyFilter")?.value ?? "";
  const asset = document.querySelector("#assetFilter")?.value ?? "";
  const session = document.querySelector("#sessionFilter")?.value ?? "";
  const mistake = document.querySelector("#mistakeFilter")?.value ?? "";
  const review = document.querySelector("#reviewFilter")?.value ?? "";
  const filtered = state.trades.filter((trade) => {
    const text = `${trade.symbol} ${trade.notes} ${trade.strategy} ${trade.market} ${trade.customTags}`.toLowerCase();
    return (!search || text.includes(search))
      && (!asset || trade.assetClass === asset)
      && (!session || trade.session === session)
      && (!strategy || trade.strategy === strategy)
      && (!mistake || trade.mistake === mistake)
      && (!review || (review === "reviewed" ? trade.reviewed : !trade.reviewed));
  }).sort((a, b) => `${b.date}${b.entryTime}`.localeCompare(`${a.date}${a.entryTime}`));

  document.querySelector("#tradeTableMount").innerHTML = renderTradeTable(filtered);
  renderTradeDetail();
  attachTradeRows();
}

function renderTradeTable(trades) {
  if (!trades.length) return `<div class="empty-state">No trades match this view.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Dates</th><th>Symbol</th><th>Asset</th><th>Side</th><th>Session</th><th>Strategy</th><th>Score</th><th>Quality</th><th>Mistake</th><th>R</th><th>P&L</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${trades.map((trade) => `
            <tr class="click-row" data-trade-id="${trade.id}">
              <td>${tradeDateLabel(trade)}</td>
              <td><strong>${trade.symbol}</strong></td>
              <td>${trade.assetClass}</td>
              <td>${trade.direction}</td>
              <td>${trade.session}</td>
              <td>${trade.strategy}</td>
              <td>${executionScore(trade)}%</td>
              <td><span class="tag good">${trade.quality}</span></td>
              <td><span class="tag ${trade.mistake !== "None" ? "warn" : ""}">${trade.mistake}</span></td>
              <td>${number(tradeR(trade), 2)}R</td>
              <td class="${tradePnl(trade) >= 0 ? "positive" : "negative"}">${money(tradePnl(trade))}</td>
              <td>${trade.reviewed ? "Reviewed" : "Open"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTradeDetail() {
  const mount = document.querySelector("#tradeDetailMount");
  if (!mount) return;
  const trade = state.trades.find((item) => item.id === selectedTradeId) ?? state.trades[0];
  if (!trade) {
    mount.innerHTML = "";
    return;
  }
  selectedTradeId = trade.id;
  mount.innerHTML = `
    <section class="panel trade-detail">
      <div class="panel-header">
        <div>
          <span class="eyebrow">${tradeTimeLabel(trade)}</span>
          <h2>${trade.symbol} ${trade.direction}</h2>
        </div>
        <div class="inline-actions">
          <button class="ghost-button" data-edit-trade="${trade.id}" type="button">Edit</button>
          <button class="primary-button" data-toggle-review="${trade.id}" type="button">${trade.reviewed ? "Reopen" : "Mark Reviewed"}</button>
        </div>
      </div>
      ${trade.image ? `<img class="trade-image" src="${trade.image}" alt="${trade.symbol} trade screenshot" />` : ""}
      <div class="layout-two">
        <div>
          <p>${trade.notes || "No notes yet."}</p>
          ${renderRuleChecklistSummary(trade)}
          <div class="inline-actions">
            ${renderTag(trade.strategy)}
            ${renderTag(trade.assetClass)}
            ${renderTag(trade.session)}
            ${renderTag(trade.market)}
            ${renderTag(trade.emotion)}
            ${renderTag(trade.mistake, trade.mistake !== "None" ? "warn" : "good")}
            ${tradeTags(trade).map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
        </div>
        <div>
          <div class="metric-line"><span>P&L</span><strong class="${tradePnl(trade) >= 0 ? "positive" : "negative"}">${money(tradePnl(trade))}</strong></div>
          <div class="metric-line"><span>Execution Score</span><strong>${executionScore(trade)}%</strong></div>
          <div class="metric-line"><span>Rule Score</span><strong>${ruleScore(trade)}%</strong></div>
          <div class="metric-line"><span>R Multiple</span><strong>${number(tradeR(trade), 2)}R</strong></div>
          <div class="metric-line"><span>Duration</span><strong>${tradeDurationLabel(trade)}</strong></div>
          <div class="metric-line"><span>Entry / Exit</span><strong>${trade.entry} / ${trade.exit}</strong></div>
          <div class="metric-line"><span>Planned Entry / Stop</span><strong>${trade.plannedEntry || "—"} / ${trade.plannedStop || "—"}</strong></div>
          <div class="metric-line"><span>Stop / Target</span><strong>${trade.stop || "—"} / ${trade.target || "—"}</strong></div>
          <div class="metric-line"><span>Risk Planned / Actual</span><strong>${money(Number(trade.plannedRisk || 0))} / ${money(Number(trade.actualRisk || 0))}</strong></div>
          <div class="metric-line"><span>Partials</span><strong>${trade.partials || "—"}</strong></div>
          <div class="metric-line"><span>Rules</span><strong>${trade.followedRules ? "Followed" : "Broken"}</strong></div>
        </div>
      </div>
    </section>
  `;
  mount.querySelector("[data-edit-trade]")?.addEventListener("click", () => openTradeDialog(trade.id));
  mount.querySelector("[data-toggle-review]")?.addEventListener("click", () => {
    trade.reviewed = !trade.reviewed;
    saveState();
    render();
  });
}

function renderTag(value, className = "") {
  if (!value) return "";
  return `<span class="tag ${className}">${value}</span>`;
}

function renderRuleChecklistSummary(trade) {
  const checklist = strategyForTrade(trade)?.checklist || [];
  if (!checklist.length) return "";
  return `
    <div class="rule-summary">
      ${checklist.map((rule) => `
        <span class="rule-chip ${trade.ruleChecks?.includes(rule) ? "checked" : ""}">${trade.ruleChecks?.includes(rule) ? "✓" : "×"} ${rule}</span>
      `).join("")}
    </div>
  `;
}

function renderDaily() {
  const days = groupByDate(state.trades);
  if (!days.some((day) => day.date === selectedDay)) {
    days.unshift({ date: selectedDay, pnl: 0, trades: [] });
  }
  const note = getDayNote(selectedDay);
  const selectedTrades = state.trades.filter((trade) => tradeRealizedDate(trade) === selectedDay);
  appView.innerHTML = `
    <div class="journal-grid">
      <section class="panel">
        <div class="panel-header"><h2>Sessions</h2></div>
        <div class="calendar-list">
          ${days.map((day) => `
            <button class="${day.date === selectedDay ? "active" : ""}" data-day="${day.date}" type="button">
              <strong>${day.date}</strong><br />
              <span class="${day.pnl >= 0 ? "positive" : "negative"}">${money(day.pnl)}</span>
            </button>
          `).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <span class="eyebrow">${selectedDay}</span>
            <h2>Daily Review</h2>
          </div>
          <button class="primary-button" id="saveDayButton" type="button">Save Day</button>
        </div>
        <label class="mini-label" for="planInput">Pre-market plan</label>
        <textarea class="journal-input" id="planInput">${note.plan}</textarea>
        <label class="mini-label" for="recapInput">End-of-day recap</label>
        <textarea class="journal-input" id="recapInput">${note.recap}</textarea>
        <label class="mini-label" for="mentalInput">Mental state</label>
        <input class="journal-input" id="mentalInput" value="${note.mental}" />
        <div class="checklist">
          ${renderDayCheck("premarket", "Pre-market plan complete", note)}
          ${renderDayCheck("maxLoss", "Respected max daily loss", note)}
          ${renderDayCheck("screenshots", "Captured screenshots", note)}
          ${renderDayCheck("recap", "Finished end-of-day recap", note)}
        </div>
        <h3 style="margin-top:24px">Trades This Day</h3>
        ${renderTradeTable(selectedTrades)}
      </section>
    </div>
  `;
  document.querySelectorAll("[data-day]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDay = button.dataset.day;
      renderDaily();
    });
  });
  document.querySelector("#saveDayButton").addEventListener("click", () => saveDay(true));
  ["planInput", "recapInput", "mentalInput"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("input", debounce(() => saveDay(false), 700));
  });
  document.querySelectorAll("[data-day-rule]").forEach((input) => {
    input.addEventListener("change", () => saveDay(false));
  });
  attachTradeRows();
}

function renderDayCheck(key, label, note) {
  return `<label><input type="checkbox" data-day-rule="${key}" ${note.rules?.[key] ? "checked" : ""} /> ${label}</label>`;
}

function getDayNote(date) {
  state.dayNotes[date] ||= { plan: "", recap: "", mental: "", rules: {} };
  return state.dayNotes[date];
}

function saveDay(shouldRender = true) {
  const note = getDayNote(selectedDay);
  note.plan = document.querySelector("#planInput").value;
  note.recap = document.querySelector("#recapInput").value;
  note.mental = document.querySelector("#mentalInput").value;
  note.rules = {};
  document.querySelectorAll("[data-day-rule]").forEach((input) => {
    note.rules[input.dataset.dayRule] = input.checked;
  });
  saveState();
  if (shouldRender) renderDaily();
}

function renderCalendar() {
  const monthStart = new Date(`${selectedDay.slice(0, 7)}-01T00:00:00`);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstCell = new Date(year, month, 1 - monthStart.getDay());
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    const iso = date.toISOString().slice(0, 10);
    const trades = state.trades.filter((trade) => tradeRealizedDate(trade) === iso);
    const pnl = trades.reduce((sum, trade) => sum + tradePnl(trade), 0);
    return { iso, date, trades, pnl, inMonth: date.getMonth() === month };
  });
  appView.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>${monthStart.toLocaleString(undefined, { month: "long", year: "numeric" })}</h2>
          <p class="muted">Monthly P&L, trade count, and session review shortcuts.</p>
        </div>
        <div class="inline-actions">
          <button class="ghost-button" data-month="-1" type="button">Previous</button>
          <button class="ghost-button" data-month="1" type="button">Next</button>
        </div>
      </div>
      <div class="calendar-grid calendar-head">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="calendar-grid">
        ${cells.map((cell) => `
          <button class="calendar-cell ${cell.inMonth ? "" : "muted-cell"} ${cell.pnl > 0 ? "win-day" : cell.pnl < 0 ? "loss-day" : ""}" data-calendar-day="${cell.iso}" type="button">
            <span>${cell.date.getDate()}</span>
            <strong class="${cell.pnl >= 0 ? "positive" : "negative"}">${cell.trades.length ? money(cell.pnl) : ""}</strong>
            <small>${cell.trades.length ? `${cell.trades.length} trade${cell.trades.length === 1 ? "" : "s"}` : ""}</small>
          </button>
        `).join("")}
      </div>
    </section>
  `;
  document.querySelectorAll("[data-month]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = new Date(`${selectedDay}T00:00:00`);
      next.setMonth(next.getMonth() + Number(button.dataset.month));
      selectedDay = next.toISOString().slice(0, 10);
      renderCalendar();
    });
  });
  document.querySelectorAll("[data-calendar-day]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDay = button.dataset.calendarDay;
      activeView = "daily";
      render();
    });
  });
}

function renderWeekly() {
  const week = getWeekRange(selectedDay);
  const trades = state.trades.filter((trade) => tradeRealizedDate(trade) >= week.start && tradeRealizedDate(trade) <= week.end);
  const m = metrics(trades);
  const review = state.weeklyReviews[week.key] ||= { best: "", worst: "", mistake: "", setup: "", improvement: "" };
  appView.innerHTML = `
    ${renderKpis(m)}
    <div class="layout-two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <span class="eyebrow">${week.start} to ${week.end}</span>
            <h2>Weekly Review</h2>
          </div>
          <div class="inline-actions">
          <button class="ghost-button" data-week="-7" type="button">Previous</button>
          <button class="ghost-button" data-week="7" type="button">Next</button>
          <button class="ghost-button" id="printWeeklyButton" type="button">Print</button>
          <button class="primary-button" id="saveWeeklyButton" type="button">Save Week</button>
          </div>
        </div>
        ${weeklyInput("best", "Best trade", review.best)}
        ${weeklyInput("worst", "Worst trade", review.worst)}
        ${weeklyInput("mistake", "Biggest mistake", review.mistake)}
        ${weeklyInput("setup", "Best setup", review.setup)}
        ${weeklyInput("improvement", "One improvement for next week", review.improvement)}
      </section>
      <section class="panel">
        <h2>Week Stats</h2>
        <div class="metric-line"><span>Trades</span><strong>${trades.length}</strong></div>
        <div class="metric-line"><span>Rule-following score</span><strong>${trades.length ? number(trades.filter((trade) => trade.followedRules).length / trades.length * 100, 0) : 0}%</strong></div>
        <div class="metric-line"><span>Expectancy</span><strong>${money(m.expectancy)}</strong></div>
        <div class="metric-line"><span>Average Winner</span><strong>${money(m.avgWin)}</strong></div>
        <div class="metric-line"><span>Average Loser</span><strong>${money(m.avgLoss)}</strong></div>
        <h3 style="margin-top:18px">Trades This Week</h3>
        ${renderTradeTable(trades)}
      </section>
    </div>
  `;
  document.querySelectorAll("[data-week]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = new Date(`${selectedDay}T00:00:00`);
      next.setDate(next.getDate() + Number(button.dataset.week));
      selectedDay = next.toISOString().slice(0, 10);
      renderWeekly();
    });
  });
  document.querySelector("#saveWeeklyButton").addEventListener("click", () => {
    ["best", "worst", "mistake", "setup", "improvement"].forEach((key) => {
      review[key] = document.querySelector(`[data-weekly="${key}"]`).value;
    });
    saveState();
    showToast("Weekly review saved");
  });
  document.querySelector("#printWeeklyButton").addEventListener("click", () => window.print());
  document.querySelectorAll("[data-weekly]").forEach((input) => {
    input.addEventListener("input", debounce(() => {
      ["best", "worst", "mistake", "setup", "improvement"].forEach((key) => {
        review[key] = document.querySelector(`[data-weekly="${key}"]`).value;
      });
      saveState();
      showToast("Weekly review autosaved");
    }, 700));
  });
  attachTradeRows();
}

function weeklyInput(key, label, value) {
  return `
    <label class="mini-label" for="weekly-${key}">${label}</label>
    <textarea class="journal-input compact-input" id="weekly-${key}" data-weekly="${key}">${value || ""}</textarea>
  `;
}

function getWeekRange(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    key: start.toISOString().slice(0, 10),
  };
}

function renderRisk() {
  const days = groupByDate(state.trades);
  const riskValues = state.trades.map((trade) => Number(trade.actualRisk || 0)).filter(Boolean);
  const largestWin = Math.max(0, ...state.trades.map(tradePnl));
  const largestLoss = Math.min(0, ...state.trades.map(tradePnl));
  const maxDrawdown = calculateMaxDrawdown(days);
  const maxDailyLoss = Number(state.settings?.maxDailyLoss || 0);
  appView.innerHTML = `
    <section class="kpi-grid">
      <div class="kpi"><span>Avg Risk</span><strong>${money(riskValues.length ? riskValues.reduce((a, b) => a + b, 0) / riskValues.length : 0)}</strong></div>
      <div class="kpi"><span>Expectancy</span><strong>${money(metrics().expectancy)}</strong></div>
      <div class="kpi"><span>Max Drawdown</span><strong class="negative">${money(maxDrawdown)}</strong></div>
      <div class="kpi"><span>Biggest Win</span><strong class="positive">${money(largestWin)}</strong></div>
      <div class="kpi"><span>Biggest Loss</span><strong class="negative">${money(largestLoss)}</strong></div>
    </section>
    <div class="report-grid">
      <section class="panel">
        <h2>Daily Loss Guard</h2>
        <p class="muted">Flags days that breached your configured max daily loss.</p>
        <div class="rank-list">
          ${days.filter((day) => maxDailyLoss && day.pnl <= -maxDailyLoss).map((day) => `
            <div class="rank-item">
              <div class="rank-row"><strong>${day.date}</strong><span class="negative">${money(day.pnl)}</span></div>
              <span class="muted">${day.trades.length} trades · limit ${money(maxDailyLoss)}</span>
            </div>
          `).join("") || `<div class="empty-state">No max-loss breaches logged.</div>`}
        </div>
      </section>
      <section class="panel">
        <h2>Drawdown Curve</h2>
        <p class="muted">Cumulative drawdown from prior equity peaks.</p>
        ${renderLineChart("drawdown")}
      </section>
      ${renderBreakdown("P&L By Session", "session")}
      ${renderBreakdown("P&L By Asset", "assetClass")}
      ${renderBreakdown("P&L By Account", "account")}
    </div>
  `;
}

function calculateMaxDrawdown(days) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  days.forEach((day) => {
    equity += day.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
  });
  return maxDrawdown;
}

function renderLineChart(type) {
  const days = groupByDate(state.trades);
  if (!days.length) return `<div class="empty-state">Log trades to see this chart.</div>`;
  let equity = 0;
  let peak = 0;
  const values = days.map((day) => {
    equity += day.pnl;
    peak = Math.max(peak, equity);
    return type === "drawdown" ? equity - peak : equity;
  });
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = days.length === 1 ? 50 : (index / (days.length - 1)) * 100;
    const y = 92 - ((value - min) / range) * 84;
    return `${x},${y}`;
  }).join(" ");
  return `
    <div class="line-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="${points}" />
      </svg>
      <div class="line-chart-meta">
        <span>${days[0].date}</span>
        <strong class="${values.at(-1) >= 0 ? "positive" : "negative"}">${money(values.at(-1))}</strong>
        <span>${days.at(-1).date}</span>
      </div>
    </div>
  `;
}

function renderMistakes() {
  const noMistakes = state.trades.filter((trade) => trade.mistake === "None");
  const mistakeTrades = state.trades.filter((trade) => trade.mistake !== "None");
  const mAll = metrics(state.trades);
  const mClean = metrics(noMistakes);
  appView.innerHTML = `
    <section class="kpi-grid">
      <div class="kpi"><span>Mistake Cost</span><strong class="negative">${money(mAll.total - mClean.total)}</strong></div>
      <div class="kpi"><span>Mistake Trades</span><strong>${mistakeTrades.length}</strong></div>
      <div class="kpi"><span>Clean Trade P&L</span><strong class="${mClean.total >= 0 ? "positive" : "negative"}">${money(mClean.total)}</strong></div>
      <div class="kpi"><span>No-Mistake Win Rate</span><strong>${number(mClean.winRate, 1)}%</strong></div>
      <div class="kpi"><span>Most Common</span><strong>${mostCommon(mistakeTrades, "mistake") || "None"}</strong></div>
    </section>
    <div class="report-grid">
      ${renderBreakdown("Mistake Cost", "mistake")}
      ${renderBreakdown("Mistakes By Emotion", "emotion")}
      ${renderBreakdown("Mistakes By Session", "session")}
      ${renderTagBreakdown()}
    </div>
  `;
}

function mostCommon(trades, key) {
  const counts = trades.reduce((acc, trade) => {
    acc[trade[key]] = (acc[trade[key]] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function renderNotebook() {
  appView.innerHTML = `
    <div class="layout-two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Notebook</h2>
            <p class="muted">Lessons, observations, and recurring patterns outside individual trades.</p>
          </div>
        </div>
        <form class="strategy-editor" id="noteForm">
          <input name="title" placeholder="Note title" required />
          <textarea name="body" placeholder="Write the lesson or observation" required></textarea>
          <button class="primary-button" type="submit">Add Note</button>
        </form>
      </section>
      <section class="panel">
        <div class="filter-row"><input id="noteSearch" type="search" placeholder="Search notebook" /></div>
        <div class="strategy-list" id="notesMount"></div>
      </section>
    </div>
  `;
  const renderNotes = () => {
    const search = document.querySelector("#noteSearch").value.toLowerCase();
    const notes = state.notebook.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(search));
    document.querySelector("#notesMount").innerHTML = notes.map((note) => `
      <article class="strategy-item">
        <div class="day-row"><strong>${note.title}</strong><button class="danger-button" data-delete-note="${note.id}" type="button">Delete</button></div>
        <span class="muted">${note.date}</span>
        <p>${note.body}</p>
      </article>
    `).join("") || `<div class="empty-state">No notes yet.</div>`;
    document.querySelectorAll("[data-delete-note]").forEach((button) => {
      button.addEventListener("click", () => {
        state.notebook = state.notebook.filter((note) => note.id !== button.dataset.deleteNote);
        saveState();
        renderNotes();
      });
    });
  };
  document.querySelector("#noteForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.notebook.unshift({ id: crypto.randomUUID(), date: today, title: data.title, body: data.body });
    event.currentTarget.reset();
    saveState();
    renderNotes();
    showToast("Note saved");
  });
  document.querySelector("#noteSearch").addEventListener("input", renderNotes);
  renderNotes();
}

function renderBlockedTrades() {
  appView.innerHTML = `
    <div class="layout-two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Blocked Trades</h2>
            <p class="muted">Log trades you skipped because they violated your plan.</p>
          </div>
        </div>
        <form class="strategy-editor" id="blockedForm">
          <input name="symbol" placeholder="Symbol" required />
          <input name="reason" placeholder="No-trade rule or reason" required />
          <textarea name="notes" placeholder="What did you notice?"></textarea>
          <button class="primary-button" type="submit">Log Blocked Trade</button>
        </form>
      </section>
      <section class="panel">
        <div class="strategy-list">
          ${state.blockedTrades.map((item) => `
            <article class="strategy-item">
              <div class="day-row"><strong>${item.symbol}</strong><button class="danger-button" data-delete-blocked="${item.id}" type="button">Delete</button></div>
              <span class="muted">${item.date} · ${item.reason}</span>
              <p>${item.notes || ""}</p>
            </article>
          `).join("") || `<div class="empty-state">No blocked trades logged.</div>`}
        </div>
      </section>
    </div>
  `;
  document.querySelector("#blockedForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.blockedTrades.unshift({ id: crypto.randomUUID(), date: today, symbol: data.symbol.toUpperCase(), reason: data.reason, notes: data.notes });
    saveState();
    showToast("Blocked trade logged");
    renderBlockedTrades();
  });
  document.querySelectorAll("[data-delete-blocked]").forEach((button) => {
    button.addEventListener("click", () => {
      state.blockedTrades = state.blockedTrades.filter((item) => item.id !== button.dataset.deleteBlocked);
      saveState();
      renderBlockedTrades();
    });
  });
}

function renderPlaybook() {
  appView.innerHTML = `
    <div class="layout-two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Strategies</h2>
            <p class="muted">Define setups, then attach them to trades for rule and performance review.</p>
          </div>
        </div>
        <form class="strategy-editor" id="strategyForm">
          <input name="name" placeholder="Strategy name" required />
          <textarea name="rules" placeholder="Rules, entry criteria, invalidation, target plan" required></textarea>
          <textarea name="checklist" placeholder="Checklist rules, one per line" required></textarea>
          <button class="primary-button" type="submit">Add Strategy</button>
        </form>
        <div class="strategy-list">
          ${state.strategies.map((strategy) => {
            const related = state.trades.filter((trade) => trade.strategy === strategy.name);
            const m = metrics(related);
            return `
              <article class="strategy-item">
                <div class="day-row">
                  <strong>${strategy.name}</strong>
                  <button class="danger-button" data-delete-strategy="${strategy.id}" type="button">Delete</button>
                </div>
                <p class="muted">${strategy.rules}</p>
                <div class="rule-summary">
                  ${(strategy.checklist || []).map((rule) => `<span class="rule-chip checked">${rule}</span>`).join("")}
                </div>
                <div class="inline-actions">
                  <span class="tag">${related.length} trades</span>
                  <span class="tag ${m.total >= 0 ? "good" : "warn"}">${money(m.total)}</span>
                  <span class="tag">${number(m.winRate, 1)}% win</span>
                  <span class="tag">${related.length ? Math.round(related.reduce((sum, trade) => sum + ruleScore(trade), 0) / related.length) : 0}% rule score</span>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
      <section class="panel">
        <h2>Rule Adherence</h2>
        <p class="muted">This shows how much of your P&L came from trades that followed the plan.</p>
        ${renderRuleAdherence()}
      </section>
    </div>
  `;
  document.querySelector("#strategyForm").addEventListener("submit", addStrategy);
  document.querySelectorAll("[data-delete-strategy]").forEach((button) => {
    button.addEventListener("click", () => {
      state.strategies = state.strategies.filter((strategy) => strategy.id !== button.dataset.deleteStrategy);
      saveState();
      renderPlaybook();
    });
  });
}

function renderRuleAdherence() {
  const followed = state.trades.filter((trade) => trade.followedRules);
  const broken = state.trades.filter((trade) => !trade.followedRules);
  return `
    <div class="rank-list">
      ${[
        ["Followed Rules", followed],
        ["Broke Rules", broken],
      ].map(([label, trades]) => {
        const m = metrics(trades);
        return `
          <div class="rank-item">
            <div class="rank-row"><strong>${label}</strong><span class="${m.total >= 0 ? "positive" : "negative"}">${money(m.total)}</span></div>
            <div class="progress-track"><div class="progress-bar" style="width:${Math.min(100, Math.abs(m.total) / Math.max(1, Math.abs(metrics().total), 1) * 100)}%"></div></div>
            <span class="muted">${trades.length} trades · ${number(m.avgR, 2)}R avg</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderReports() {
  appView.innerHTML = `
    ${renderKpis(metrics())}
    <div class="report-grid">
      ${renderBreakdown("Strategy", "strategy")}
      ${renderBreakdown("Mistakes", "mistake")}
      ${renderBreakdown("Emotion", "emotion")}
      ${renderBreakdown("Market Condition", "market")}
      ${renderBreakdown("Session", "session")}
      ${renderBreakdown("Symbol", "symbol")}
      ${renderDayOfWeekBreakdown()}
      ${renderDurationBreakdown()}
      ${renderTagBreakdown()}
    </div>
  `;
}

function renderBreakdown(title, key) {
  const rows = Object.entries(state.trades.reduce((acc, trade) => {
    const label = breakdownLabel(trade[key], key);
    acc[label] ||= [];
    acc[label].push(trade);
    return acc;
  }, {})).map(([label, trades]) => ({ label, trades, ...metrics(trades) }))
    .sort((a, b) => b.total - a.total);
  const max = Math.max(...rows.map((row) => Math.abs(row.total)), 1);
  return `
    <section class="panel">
      <div class="panel-header"><h2>${title}</h2></div>
      <div class="rank-list">
        ${rows.map((row) => `
          <div class="rank-item">
            <div class="rank-row">
              <strong>${row.label}</strong>
              <span class="${row.total >= 0 ? "positive" : "negative"}">${money(row.total)}</span>
            </div>
            <div class="progress-track"><div class="progress-bar" style="width:${Math.max(4, Math.abs(row.total) / max * 100)}%"></div></div>
            <span class="muted">${row.count} trades · ${number(row.winRate, 1)}% win · ${number(row.avgR, 2)}R avg</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function breakdownLabel(value, key = "") {
  const text = String(value ?? "").trim();
  if (text) return text;
  if (key === "emotion") return "Not logged";
  if (key === "mistake") return "None";
  return "Unspecified";
}

function renderTagBreakdown() {
  const groups = {};
  state.trades.forEach((trade) => {
    tradeTags(trade).forEach((tag) => {
      groups[tag] ||= [];
      groups[tag].push(trade);
    });
  });
  const rows = Object.entries(groups).map(([label, trades]) => ({ label, trades, ...metrics(trades) }))
    .sort((a, b) => b.total - a.total);
  const max = Math.max(...rows.map((row) => Math.abs(row.total)), 1);
  return `
    <section class="panel">
      <div class="panel-header"><h2>Custom Tags</h2></div>
      <div class="rank-list">
        ${rows.length ? rows.map((row) => `
          <div class="rank-item">
            <div class="rank-row">
              <strong>${row.label}</strong>
              <span class="${row.total >= 0 ? "positive" : "negative"}">${money(row.total)}</span>
            </div>
            <div class="progress-track"><div class="progress-bar" style="width:${Math.max(4, Math.abs(row.total) / max * 100)}%"></div></div>
            <span class="muted">${row.count} trades · ${number(row.winRate, 1)}% win · ${number(row.avgR, 2)}R avg</span>
          </div>
        `).join("") : `<div class="empty-state">Add custom tags to trades to see tag analytics.</div>`}
      </div>
    </section>
  `;
}

function renderDayOfWeekBreakdown() {
  return renderComputedBreakdown("Day Of Week", (trade) => dayName(tradeRealizedDate(trade)));
}

function renderDurationBreakdown() {
  return renderComputedBreakdown("Holding Duration", (trade) => {
    const minutes = tradeDurationMinutes(trade);
    if (minutes <= 15) return "0-15 min";
    if (minutes <= 60) return "16-60 min";
    if (minutes <= 240) return "1-4 hours";
    return "4+ hours";
  });
}

function renderComputedBreakdown(title, getLabel) {
  const groups = state.trades.reduce((acc, trade) => {
    const label = getLabel(trade);
    acc[label] ||= [];
    acc[label].push(trade);
    return acc;
  }, {});
  const rows = Object.entries(groups).map(([label, trades]) => ({ label, trades, ...metrics(trades) }))
    .sort((a, b) => b.total - a.total);
  const max = Math.max(...rows.map((row) => Math.abs(row.total)), 1);
  return `
    <section class="panel">
      <div class="panel-header"><h2>${title}</h2></div>
      <div class="rank-list">
        ${rows.map((row) => `
          <div class="rank-item">
            <div class="rank-row"><strong>${row.label}</strong><span class="${row.total >= 0 ? "positive" : "negative"}">${money(row.total)}</span></div>
            <div class="progress-track"><div class="progress-bar" style="width:${Math.max(4, Math.abs(row.total) / max * 100)}%"></div></div>
            <span class="muted">${row.count} trades · ${number(row.winRate, 1)}% win · ${number(row.avgR, 2)}R avg</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSettings() {
  appView.innerHTML = `
    <div class="layout-two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Settings</h2>
            <p class="muted">Local-only preferences for risk defaults and data tools.</p>
          </div>
        </div>
        <form class="strategy-editor" id="settingsForm">
          <label class="mini-label">Default Account</label>
          <input name="accountName" value="${state.settings.accountName || "Main"}" />
          <label class="mini-label">Default Risk $</label>
          <input name="defaultRisk" type="number" step="0.01" value="${state.settings.defaultRisk || 0}" />
          <label class="mini-label">Max Daily Loss $</label>
          <input name="maxDailyLoss" type="number" step="0.01" value="${state.settings.maxDailyLoss || 0}" />
          <label class="checkbox-label settings-check">
            <input name="darkMode" type="checkbox" ${state.settings.darkMode ? "checked" : ""} />
            Dark mode
          </label>
          <button class="primary-button" type="submit">Save Settings</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Data Management</h2></div>
        <div class="settings-actions">
          <button class="ghost-button" id="exportCsvButton" type="button">Export CSV</button>
          <button class="ghost-button" id="importCsvButton" type="button">Import CSV</button>
          <button class="ghost-button" id="blankJournalButton" type="button">New Blank Journal</button>
          <button class="danger-button" id="resetSampleButton" type="button">Reset Sample Data</button>
        </div>
        <p class="muted">JSON export keeps every field. CSV is useful for spreadsheets and basic migration.</p>
      </section>
    </div>
  `;
  document.querySelector("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.settings = {
      accountName: data.accountName,
      defaultRisk: Number(data.defaultRisk || 0),
      maxDailyLoss: Number(data.maxDailyLoss || 0),
      darkMode: Boolean(data.darkMode),
    };
    saveState();
    showToast("Settings saved");
    renderShell();
  });
  document.querySelector("#exportCsvButton").addEventListener("click", exportCsv);
  document.querySelector("#importCsvButton").addEventListener("click", importCsv);
  document.querySelector("#blankJournalButton").addEventListener("click", () => {
    if (!confirm("Create a new blank journal? Export a backup first if you need this data.")) return;
    state = { ...createDefaultState(), trades: [], dayNotes: {}, weeklyReviews: {}, notebook: [], blockedTrades: [] };
    selectedTradeId = null;
    saveState();
    showToast("Blank journal created");
    render();
  });
  document.querySelector("#resetSampleButton").addEventListener("click", () => {
    if (!confirm("Reset to sample data? This replaces your current local journal.")) return;
    state = createDefaultState();
    selectedTradeId = state.trades[0]?.id ?? null;
    saveState();
    showToast("Sample data restored");
    render();
  });
}

function groupByDate(trades) {
  const grouped = trades.reduce((acc, trade) => {
    const date = tradeRealizedDate(trade);
    acc[date] ||= [];
    acc[date].push(trade);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([date, items]) => ({ date, trades: items, pnl: items.reduce((sum, trade) => sum + tradePnl(trade), 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function unique(key) {
  return [...new Set(state.trades.map((trade) => trade[key]).filter(Boolean))].sort();
}

function attachTradeRows() {
  document.querySelectorAll("[data-trade-id]").forEach((row) => {
    row.addEventListener("click", () => {
      selectedTradeId = row.dataset.tradeId;
      activeView = "trades";
      render();
    });
  });
}

function attachViewLinks() {
  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.viewLink;
      render();
    });
  });
}

function openTradeDialog(id = null) {
  editingTradeId = id;
  const trade = id ? state.trades.find((item) => item.id === id) : null;
  document.querySelector("#dialogMode").textContent = trade ? "Edit Trade" : "New Trade";
  deleteTradeButton.style.visibility = trade ? "visible" : "hidden";
  const strategySelect = tradeForm.elements.strategy;
  strategySelect.innerHTML = state.strategies.map((strategy) => `<option>${strategy.name}</option>`).join("");
  strategySelect.onchange = () => renderStrategyRuleChecks();
  const values = trade ?? {
    date: today,
    exitDate: today,
    entryTime: "09:30",
    exitTime: "",
    symbol: "",
    assetClass: "Stocks",
    account: state.settings?.accountName || "Main",
    direction: "Long",
    strategy: state.strategies[0]?.name ?? "",
    entry: "",
    exit: "",
    size: "",
    fees: 0,
    stop: "",
    target: "",
    plannedEntry: "",
    plannedStop: "",
    plannedTarget: "",
    plannedRisk: state.settings?.defaultRisk || "",
    actualRisk: "",
    session: "Open",
    quality: "A",
    emotion: "Calm",
    mistake: "None",
    market: "Trending",
    image: "",
    customTags: "",
    partials: "",
    notes: "",
    followedRules: true,
    reviewed: false,
    ruleChecks: [],
  };
  values.exitDate ||= values.date;
  Object.entries(values).forEach(([key, value]) => {
    const field = tradeForm.elements[key];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  });
  renderStrategyRuleChecks(values.ruleChecks || []);
  tradeDialog.showModal();
}

function renderStrategyRuleChecks(checked = []) {
  const mount = document.querySelector("#strategyRuleChecks");
  if (!mount) return;
  const strategy = state.strategies.find((item) => item.name === tradeForm.elements.strategy.value);
  const checklist = strategy?.checklist || [];
  mount.innerHTML = checklist.length ? checklist.map((rule) => `
    <label class="check-row">
      <input name="ruleChecks" type="checkbox" value="${escapeHtml(rule)}" ${checked.includes(rule) ? "checked" : ""} />
      ${rule}
    </label>
  `).join("") : `<span class="muted">No checklist rules for this strategy.</span>`;
}

async function saveTradeFromForm(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(tradeForm));
  const existing = editingTradeId ? state.trades.find((item) => item.id === editingTradeId) : null;
  const uploadedImage = await readImageFile(tradeForm.elements.imageFile.files?.[0]);
  const validation = validateTradeInput(data);
  if (validation) {
    showToast(validation);
    return;
  }
  const trade = {
    id: editingTradeId ?? crypto.randomUUID(),
    date: data.date,
    exitDate: data.exitDate || data.date,
    entryTime: data.entryTime,
    exitTime: data.exitTime,
    symbol: data.symbol.trim().toUpperCase(),
    assetClass: data.assetClass,
    account: data.account || state.settings?.accountName || "Main",
    direction: data.direction,
    strategy: data.strategy,
    entry: Number(data.entry),
    exit: Number(data.exit),
    size: Number(data.size),
    fees: Number(data.fees || 0),
    stop: Number(data.stop || 0),
    target: Number(data.target || 0),
    plannedEntry: Number(data.plannedEntry || 0),
    plannedStop: Number(data.plannedStop || 0),
    plannedTarget: Number(data.plannedTarget || 0),
    plannedRisk: Number(data.plannedRisk || 0),
    actualRisk: Number(data.actualRisk || 0),
    session: data.session,
    quality: data.quality,
    emotion: data.emotion,
    mistake: data.mistake,
    market: data.market,
    image: await persistUploadedImage(uploadedImage) || data.image || existing?.image || "",
    customTags: data.customTags,
    partials: data.partials,
    notes: data.notes,
    ruleChecks: new FormData(tradeForm).getAll("ruleChecks"),
    followedRules: Boolean(data.followedRules),
    reviewed: Boolean(data.reviewed),
  };
  if (editingTradeId) {
    state.trades = state.trades.map((item) => item.id === editingTradeId ? trade : item);
  } else {
    state.trades.unshift(trade);
  }
  selectedTradeId = trade.id;
  selectedDay = tradeRealizedDate(trade);
  const savedToFile = await saveState();
  showToast(savedToFile ? (editingTradeId ? "Trade updated" : "Trade saved") : "Saved in browser only. Start the local server to save to file.");
  tradeDialog.close();
  activeView = "trades";
  render();
}

function validateTradeInput(data) {
  if (data.exitDate && data.exitDate < data.date) return "Close date cannot be before open date";
  const partials = parsePartials(data.partials);
  if (data.partials && !partials.length) return "Use partial format like 186.20@20";
  const partialSize = partials.reduce((sum, item) => sum + item.size, 0);
  if (partialSize > Number(data.size || 0)) return "Partial exits exceed position size";
  const duplicate = state.trades.find((trade) => trade.id !== editingTradeId
    && trade.date === data.date
    && trade.symbol === data.symbol.trim().toUpperCase()
    && trade.entryTime === data.entryTime);
  if (duplicate && !confirm("This looks like a duplicate trade. Save anyway?")) return "Duplicate trade cancelled";
  return "";
}

async function persistUploadedImage(dataUrl) {
  if (!dataUrl) return "";
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataUrl }),
    });
    if (response.ok) return (await response.json()).path;
  } catch {
    return dataUrl;
  }
  return dataUrl;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function readImageFile(file) {
  if (!file || !file.size) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function deleteCurrentTrade() {
  if (!editingTradeId) return;
  if (!confirm("Delete this trade? This cannot be undone.")) return;
  lastDeletedTrade = state.trades.find((trade) => trade.id === editingTradeId);
  state.trades = state.trades.filter((trade) => trade.id !== editingTradeId);
  selectedTradeId = state.trades[0]?.id ?? null;
  saveState();
  showToast("Trade deleted", "Undo", () => {
    if (!lastDeletedTrade) return;
    state.trades.unshift(lastDeletedTrade);
    selectedTradeId = lastDeletedTrade.id;
    lastDeletedTrade = null;
    saveState();
    render();
  });
  tradeDialog.close();
  render();
}

function addStrategy(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  state.strategies.push({
    id: crypto.randomUUID(),
    name: data.name.trim(),
    rules: data.rules.trim(),
    checklist: String(data.checklist || "").split(/\r?\n/).map((rule) => rule.trim()).filter(Boolean),
  });
  form.reset();
  saveState();
  renderPlaybook();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `trading-journal-${today}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      state = normalizeState(JSON.parse(reader.result));
      selectedTradeId = state.trades[0]?.id ?? null;
      const savedToFile = await saveState();
      showToast(savedToFile ? "Journal imported and saved to file" : "Journal imported in browser only. Start the local server to save to file.");
      render();
    } catch {
      showToast("Import failed. Choose a valid journal JSON file.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function exportCsv() {
  const fields = ["date", "exitDate", "entryTime", "exitTime", "symbol", "assetClass", "account", "direction", "strategy", "entry", "exit", "size", "fees", "stop", "target", "plannedRisk", "actualRisk", "session", "quality", "emotion", "mistake", "market", "customTags", "partials", "notes", "followedRules", "reviewed"];
  const rows = [
    fields.join(","),
    ...state.trades.map((trade) => fields.map((field) => csvEscape(trade[field] ?? "")).join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `trading-journal-${today}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV exported");
}

function importCsv() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const [headerLine, ...lines] = String(reader.result).trim().split(/\r?\n/);
      const headers = parseCsvLine(headerLine).map(normalizeCsvHeader);
      const trades = lines.filter(Boolean).map((line) => {
        const values = parseCsvLine(line);
        const trade = headers.reduce((acc, header, index) => ({ ...acc, [header]: values[index] ?? "" }), {});
        return normalizeState({ trades: [{ ...trade, id: crypto.randomUUID() }], strategies: state.strategies, dayNotes: {}, weeklyReviews: {}, settings: state.settings }).trades[0];
      });
      state.trades = [...trades, ...state.trades];
      const savedToFile = await saveState();
      showToast(savedToFile ? `${trades.length} CSV trades imported and saved to file` : `${trades.length} CSV trades imported in browser only. Start the local server to save to file.`);
      activeView = "trades";
      render();
    };
    reader.readAsText(file);
  });
  input.click();
}

function csvEscape(value) {
  const text = String(value).replaceAll('"', '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function normalizeCsvHeader(header) {
  const key = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    datetime: "date",
    tradedate: "date",
    openingdate: "date",
    opendate: "date",
    closingdate: "exitDate",
    closedate: "exitDate",
    exitdate: "exitDate",
    ticker: "symbol",
    instrument: "symbol",
    side: "direction",
    qty: "size",
    quantity: "size",
    entryprice: "entry",
    exitprice: "exit",
    commission: "fees",
    commissions: "fees",
    stoploss: "stop",
    targetprice: "target",
    risk: "actualRisk",
    plannedrisk: "plannedRisk",
    tags: "customTags",
  }[key] || header;
}

function debounce(callback, wait = 500) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}

function showToast(message, actionLabel = "", action = null) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.innerHTML = `${message}${actionLabel ? ` <button type="button">${actionLabel}</button>` : ""}`;
  toast.querySelector("button")?.addEventListener("click", () => {
    action?.();
    toast.classList.remove("visible");
  });
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

async function startApp() {
  await loadPersistedState();
  selectedTradeId = state.trades[0]?.id ?? null;
  renderShell();
  render();
}

startApp();
