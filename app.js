const STORAGE_KEY = "personal-trading-journal-v1";
const API_URL = "/api/journal";

const navItems = [
  ["dashboard", "Dashboard"],
  ["trades", "Trade Log"],
  ["daily", "Daily Journal"],
  ["playbook", "Playbook"],
  ["reports", "Reports"],
];

const defaultStrategies = [
  {
    id: crypto.randomUUID(),
    name: "Opening Range Breakout",
    rules: "Trade after range forms. Confirm volume expansion. Stop goes below range. Take partials at 1R.",
  },
  {
    id: crypto.randomUUID(),
    name: "Pullback Continuation",
    rules: "Trend must be intact. Wait for controlled pullback. Enter only after reclaim. Avoid extended entries.",
  },
  {
    id: crypto.randomUUID(),
    name: "Reversal At Key Level",
    rules: "Level marked before session. Wait for rejection candle. Risk must be defined. No chasing.",
  },
];

const today = new Date().toISOString().slice(0, 10);

const sampleTrades = [
  {
    id: crypto.randomUUID(),
    date: today,
    entryTime: "09:43",
    exitTime: "10:18",
    symbol: "AAPL",
    direction: "Long",
    strategy: "Opening Range Breakout",
    entry: 184.2,
    exit: 187.1,
    size: 60,
    fees: 1.2,
    stop: 182.9,
    target: 188.2,
    quality: "A",
    emotion: "Patient",
    mistake: "None",
    market: "Trending",
    image: "",
    notes: "Clean reclaim above morning range. Took partial too late but followed the plan.",
    followedRules: true,
    reviewed: true,
  },
  {
    id: crypto.randomUUID(),
    date: today,
    entryTime: "11:07",
    exitTime: "11:28",
    symbol: "TSLA",
    direction: "Short",
    strategy: "Reversal At Key Level",
    entry: 171.5,
    exit: 172.25,
    size: 80,
    fees: 1.4,
    stop: 172.4,
    target: 169.9,
    quality: "C",
    emotion: "Impatient",
    mistake: "FOMO",
    market: "Choppy",
    image: "",
    notes: "Entered before confirmation. This was not aligned with the reversal checklist.",
    followedRules: false,
    reviewed: false,
  },
  {
    id: crypto.randomUUID(),
    date: offsetDate(-2),
    entryTime: "14:10",
    exitTime: "15:02",
    symbol: "NVDA",
    direction: "Long",
    strategy: "Pullback Continuation",
    entry: 912.4,
    exit: 926.8,
    size: 12,
    fees: 1,
    stop: 904.9,
    target: 930,
    quality: "A+",
    emotion: "Calm",
    mistake: "None",
    market: "Trending",
    image: "",
    notes: "Best trade of the week. Waited for pullback and let the target work.",
    followedRules: true,
    reviewed: true,
  },
  {
    id: crypto.randomUUID(),
    date: offsetDate(-5),
    entryTime: "10:52",
    exitTime: "11:11",
    symbol: "MSFT",
    direction: "Long",
    strategy: "Opening Range Breakout",
    entry: 420.3,
    exit: 418.8,
    size: 50,
    fees: 1,
    stop: 418.7,
    target: 424,
    quality: "B",
    emotion: "Anxious",
    mistake: "Exited early",
    market: "Volatile",
    image: "",
    notes: "Premature exit during normal pullback. Need to size smaller on volatile sessions.",
    followedRules: true,
    reviewed: true,
  },
];

let state = createDefaultState();
let activeView = "dashboard";
let selectedTradeId = state.trades[0]?.id ?? null;
let selectedDay = today;
let editingTradeId = null;
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
  if (stored) return JSON.parse(stored);
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
  };
}

async function loadPersistedState() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      state = await response.json();
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

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveStateToServer();
  updateSidebar();
}

async function saveStateToServer() {
  setSyncStatus("Saving", "saving");
  try {
    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state, null, 2),
    });
    setSyncStatus("Saved to file");
  } catch {
    setSyncStatus("Saved in browser", "offline");
    // The app still persists locally when opened without the local server.
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
  const gross = trade.direction === "Long"
    ? (trade.exit - trade.entry) * trade.size
    : (trade.entry - trade.exit) * trade.size;
  return gross - (Number(trade.fees) || 0);
}

function tradeR(trade) {
  const riskPerUnit = trade.direction === "Long"
    ? trade.entry - trade.stop
    : trade.stop - trade.entry;
  const risk = riskPerUnit * trade.size;
  if (!risk || risk <= 0) return 0;
  return tradePnl(trade) / risk;
}

function metrics(trades = state.trades) {
  const total = trades.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const wins = trades.filter((trade) => tradePnl(trade) > 0);
  const losses = trades.filter((trade) => tradePnl(trade) < 0);
  const grossWin = wins.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + tradePnl(trade), 0));
  return {
    total,
    count: trades.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? grossWin : 0,
    avgR: trades.length ? trades.reduce((sum, trade) => sum + tradeR(trade), 0) / trades.length : 0,
    reviewed: trades.length ? (trades.filter((trade) => trade.reviewed).length / trades.length) * 100 : 0,
  };
}

function renderShell() {
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
    daily: "□",
    playbook: "✓",
    reports: "↗",
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
  if (activeView === "daily") renderDaily();
  if (activeView === "playbook") renderPlaybook();
  if (activeView === "reports") renderReports();
}

function updateSidebar() {
  const todaysTrades = state.trades.filter((trade) => trade.date === today);
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
  const queue = state.trades.filter((trade) => !trade.reviewed).slice(0, 5);
  if (!queue.length) return `<div class="empty-state">No open reviews. Nice and tidy.</div>`;
  return `<div class="day-list">${queue.map((trade) => `
    <button class="day-item click-row" data-trade-id="${trade.id}" type="button">
      <div class="day-row"><strong>${trade.symbol} ${trade.direction}</strong><span class="${tradePnl(trade) >= 0 ? "positive" : "negative"}">${money(tradePnl(trade))}</span></div>
      <span class="muted">${trade.date} · ${trade.mistake} · ${trade.quality}</span>
    </button>
  `).join("")}</div>`;
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
        <select id="strategyFilter"><option value="">All strategies</option>${state.strategies.map((s) => `<option>${s.name}</option>`).join("")}</select>
        <select id="mistakeFilter"><option value="">All mistakes</option>${unique("mistake").map((v) => `<option>${v}</option>`).join("")}</select>
        <select id="reviewFilter"><option value="">Any review status</option><option value="reviewed">Reviewed</option><option value="open">Needs review</option></select>
      </div>
      <div id="tradeTableMount"></div>
    </section>
    <section id="tradeDetailMount" style="margin-top:18px"></section>
  `;

  ["tradeSearch", "strategyFilter", "mistakeFilter", "reviewFilter"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("input", renderFilteredTrades);
  });
  renderFilteredTrades();
}

function renderFilteredTrades() {
  const search = document.querySelector("#tradeSearch")?.value.toLowerCase() ?? "";
  const strategy = document.querySelector("#strategyFilter")?.value ?? "";
  const mistake = document.querySelector("#mistakeFilter")?.value ?? "";
  const review = document.querySelector("#reviewFilter")?.value ?? "";
  const filtered = state.trades.filter((trade) => {
    const text = `${trade.symbol} ${trade.notes} ${trade.strategy} ${trade.market}`.toLowerCase();
    return (!search || text.includes(search))
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
            <th>Date</th><th>Symbol</th><th>Side</th><th>Strategy</th><th>Quality</th><th>Mistake</th><th>R</th><th>P&L</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${trades.map((trade) => `
            <tr class="click-row" data-trade-id="${trade.id}">
              <td>${trade.date}</td>
              <td><strong>${trade.symbol}</strong></td>
              <td>${trade.direction}</td>
              <td>${trade.strategy}</td>
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
          <span class="eyebrow">${trade.date} · ${trade.entryTime} - ${trade.exitTime || "Open"}</span>
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
          <div class="inline-actions">
            <span class="tag">${trade.strategy}</span>
            <span class="tag">${trade.market}</span>
            <span class="tag">${trade.emotion}</span>
            <span class="tag ${trade.mistake !== "None" ? "warn" : "good"}">${trade.mistake}</span>
          </div>
        </div>
        <div>
          <div class="metric-line"><span>P&L</span><strong class="${tradePnl(trade) >= 0 ? "positive" : "negative"}">${money(tradePnl(trade))}</strong></div>
          <div class="metric-line"><span>R Multiple</span><strong>${number(tradeR(trade), 2)}R</strong></div>
          <div class="metric-line"><span>Entry / Exit</span><strong>${trade.entry} / ${trade.exit}</strong></div>
          <div class="metric-line"><span>Stop / Target</span><strong>${trade.stop || "—"} / ${trade.target || "—"}</strong></div>
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

function renderDaily() {
  const days = groupByDate(state.trades);
  if (!days.some((day) => day.date === selectedDay)) {
    days.unshift({ date: selectedDay, pnl: 0, trades: [] });
  }
  const note = getDayNote(selectedDay);
  const selectedTrades = state.trades.filter((trade) => trade.date === selectedDay);
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
  document.querySelector("#saveDayButton").addEventListener("click", saveDay);
  attachTradeRows();
}

function renderDayCheck(key, label, note) {
  return `<label><input type="checkbox" data-day-rule="${key}" ${note.rules?.[key] ? "checked" : ""} /> ${label}</label>`;
}

function getDayNote(date) {
  state.dayNotes[date] ||= { plan: "", recap: "", mental: "", rules: {} };
  return state.dayNotes[date];
}

function saveDay() {
  const note = getDayNote(selectedDay);
  note.plan = document.querySelector("#planInput").value;
  note.recap = document.querySelector("#recapInput").value;
  note.mental = document.querySelector("#mentalInput").value;
  note.rules = {};
  document.querySelectorAll("[data-day-rule]").forEach((input) => {
    note.rules[input.dataset.dayRule] = input.checked;
  });
  saveState();
  renderDaily();
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
                <div class="inline-actions">
                  <span class="tag">${related.length} trades</span>
                  <span class="tag ${m.total >= 0 ? "good" : "warn"}">${money(m.total)}</span>
                  <span class="tag">${number(m.winRate, 1)}% win</span>
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
    </div>
  `;
}

function renderBreakdown(title, key) {
  const rows = Object.entries(state.trades.reduce((acc, trade) => {
    acc[trade[key]] ||= [];
    acc[trade[key]].push(trade);
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

function groupByDate(trades) {
  const grouped = trades.reduce((acc, trade) => {
    acc[trade.date] ||= [];
    acc[trade.date].push(trade);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([date, items]) => ({ date, trades: items, pnl: items.reduce((sum, trade) => sum + tradePnl(trade), 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function unique(key) {
  return [...new Set(state.trades.map((trade) => trade[key]))].sort();
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
  const values = trade ?? {
    date: today,
    entryTime: "09:30",
    exitTime: "",
    symbol: "",
    direction: "Long",
    strategy: state.strategies[0]?.name ?? "",
    entry: "",
    exit: "",
    size: "",
    fees: 0,
    stop: "",
    target: "",
    quality: "A",
    emotion: "Calm",
    mistake: "None",
    market: "Trending",
    image: "",
    notes: "",
    followedRules: true,
    reviewed: false,
  };
  Object.entries(values).forEach(([key, value]) => {
    const field = tradeForm.elements[key];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  });
  tradeDialog.showModal();
}

function saveTradeFromForm(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(tradeForm));
  const trade = {
    id: editingTradeId ?? crypto.randomUUID(),
    date: data.date,
    entryTime: data.entryTime,
    exitTime: data.exitTime,
    symbol: data.symbol.trim().toUpperCase(),
    direction: data.direction,
    strategy: data.strategy,
    entry: Number(data.entry),
    exit: Number(data.exit),
    size: Number(data.size),
    fees: Number(data.fees || 0),
    stop: Number(data.stop || 0),
    target: Number(data.target || 0),
    quality: data.quality,
    emotion: data.emotion,
    mistake: data.mistake,
    market: data.market,
    image: data.image,
    notes: data.notes,
    followedRules: Boolean(data.followedRules),
    reviewed: Boolean(data.reviewed),
  };
  if (editingTradeId) {
    state.trades = state.trades.map((item) => item.id === editingTradeId ? trade : item);
  } else {
    state.trades.unshift(trade);
  }
  selectedTradeId = trade.id;
  selectedDay = trade.date;
  saveState();
  tradeDialog.close();
  activeView = "trades";
  render();
}

function deleteCurrentTrade() {
  if (!editingTradeId) return;
  state.trades = state.trades.filter((trade) => trade.id !== editingTradeId);
  selectedTradeId = state.trades[0]?.id ?? null;
  saveState();
  tradeDialog.close();
  render();
}

function addStrategy(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  state.strategies.push({ id: crypto.randomUUID(), name: data.name.trim(), rules: data.rules.trim() });
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
  reader.onload = () => {
    state = JSON.parse(reader.result);
    selectedTradeId = state.trades[0]?.id ?? null;
    saveState();
    render();
  };
  reader.readAsText(file);
}

async function startApp() {
  await loadPersistedState();
  selectedTradeId = state.trades[0]?.id ?? null;
  renderShell();
  render();
}

startApp();
