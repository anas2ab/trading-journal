// App frame: navigation, routing, theme, market strip, command palette, the
// roll dialog and the delegated event handling every view relies on.

const THEME_KEY = "personal-trading-journal-theme";
const MARKET_SYMBOLS = [["SPY", "SPY"], ["QQQ", "QQQ"], ["IWM", "IWM"], ["^VIX", "VIX"]];
const LIVE_VIEWS = new Set(["dashboard", "positions", "risk"]);
const VIEW_SUBTITLES = {
  dashboard: "Your whole book at a glance",
  positions: "Everything open, valued live",
  trades: "Every trade, searchable",
  calendar: "Results by day",
  journal: "Plans, recaps and lessons",
  playbook: "The rules for each setup",
  analytics: "Where your edge comes from",
  income: "Premium and the wheel",
  risk: "Exposure, limits and stress",
  watchlist: "Tickers you are following",
  flow: "Unusual options activity",
  gex: "Dealer positioning by strike",
  volatility: "What the market is pricing",
  tools: "Quick trade math",
  settings: "Account, limits and data",
};
let marketQuotes = new Map();
let paletteIndex = 0;
let paletteResults = [];
const tradeDrawer = document.querySelector("#tradeDrawer");
const rollDialog = document.querySelector("#rollDialog");
const paletteDialog = document.querySelector("#paletteDialog");

function applyTheme() {
  const dark = readPref(THEME_KEY, "dark") !== "light";
  document.body.classList.toggle("dark-mode", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a0c0f" : "#f4f5f2");
  const toggle = document.querySelector("#themeToggle");
  if (toggle) {
    toggle.innerHTML = icon(dark ? "sun" : "moon", 16);
    toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    toggle.title = dark ? "Light theme" : "Dark theme";
  }
}

function toggleTheme() {
  writePref(THEME_KEY, readPref(THEME_KEY, "dark") === "light" ? "dark" : "light");
  applyTheme();
}

function renderShell() {
  applyTheme();
  journalSelect.innerHTML = journals.map(([id, label]) => `<option value="${id}" ${id === activeJournalId ? "selected" : ""}>${label}</option>`).join("");
  journalSelect.closest(".journal-switcher").hidden = journals.length < 2;
  navList.innerHTML = navGroups.map(([group, items]) => `
    <div class="nav-group">
      ${group ? `<span class="nav-label">${group}</span>` : ""}
      ${items.map(([id, label]) => `
        <button class="nav-item ${id === activeView ? "active" : ""}" data-view-link="${id}" type="button" ${id === activeView ? `aria-current="page"` : ""}>
          ${icon(id, 16)}<span>${label}</span>
          ${id === "positions" ? `<em id="navOpenCount">${state.trades.filter(isTradeOpen).length || ""}</em>` : ""}
        </button>
      `).join("")}
    </div>
  `).join("");
  document.querySelector("#mobileNav").innerHTML = navItems.map(([id, label]) => `<option value="${id}" ${id === activeView ? "selected" : ""}>${label}</option>`).join("");
  if (shellEventsBound) return;
  shellEventsBound = true;
  setSyncStatus(syncStatus.text, syncStatus.mode);
  bindShellEvents();
  refreshMarketStrip();
  setInterval(refreshMarketStrip, 60000);
}

function bindShellEvents() {
  document.querySelector("#newTradeButton").addEventListener("click", () => openTradeDialog());
  document.querySelector("#themeToggle").addEventListener("click", toggleTheme);
  document.querySelector("#paletteButton").addEventListener("click", openPalette);
  document.querySelector("#mobileNav").addEventListener("change", (event) => navigate(event.currentTarget.value));
  journalSelect.addEventListener("change", switchJournal);
  tradeForm.addEventListener("submit", saveTradeFromForm);
  assignCspButton.addEventListener("click", assignCashSecuredPut);
  ["pmccLongDebit", "pmccShortCredit"].forEach((name) => tradeForm.elements[name]?.addEventListener("input", updatePmccNetDebit));
  ["entry", "exit", "contracts", "strategy", "pmccLongDebit"].forEach((name) => tradeForm.elements[name]?.addEventListener("input", updateTradeClosePreview));
  tradeForm.elements.shares?.addEventListener("input", updateTradeClosePreview);
  tradeForm.elements.assetClass?.addEventListener("change", updateTradeEntryMode);
  deleteTradeButton.addEventListener("click", deleteCurrentTrade);
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => tradeDialog.close()));
  rollDialog.querySelector("form").addEventListener("submit", saveRoll);
  [tradeDrawer, paletteDialog, rollDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("change", handleDocumentChange);
  document.addEventListener("pointermove", handleTipHover);
  paletteDialog.querySelector("input").addEventListener("input", renderPaletteResults);
  paletteDialog.querySelector("input").addEventListener("keydown", handlePaletteKeys);
  new MutationObserver(() => hydrateCharts(appView)).observe(appView, { childList: true, subtree: true });
}

function navigate(view) {
  activeView = view;
  render();
  document.querySelector(".workspace")?.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

function render() {
  const title = navItems.find(([id]) => id === activeView)?.[1] ?? "Dashboard";
  viewTitle.textContent = title;
  viewEyebrow.textContent = VIEW_SUBTITLES[activeView] || "";
  document.title = `${title} · Trading Journal`;
  renderShell();
  updateSidebar();
  hideChartTooltip();
  if (activeView !== "playbook") {
    state.strategies = state.strategies.filter((strategy) => !strategy.isNew);
    playbookEditing = null;
  }
  ({
    dashboard: renderDashboard,
    positions: renderPositions,
    trades: renderTrades,
    calendar: renderCalendar,
    journal: renderJournal,
    playbook: renderPlaybook,
    analytics: renderAnalytics,
    income: renderIncome,
    risk: renderRisk,
    watchlist: renderWatchlist,
    flow: renderFlow,
    gex: renderGex,
    volatility: renderVolatility,
    tools: renderTools,
    settings: renderSettings,
  }[activeView] || renderDashboard)();
  hydrateCharts(appView);
  if (activeView !== "gex" && gexRefreshTimer) {
    clearInterval(gexRefreshTimer);
    gexRefreshTimer = null;
  }
  if (LIVE_VIEWS.has(activeView)) {
    if (!liveQuotesUpdatedAt || Date.now() - liveQuotesUpdatedAt.getTime() > 30000) refreshLiveQuotes();
    if (!liveQuoteRefreshTimer) liveQuoteRefreshTimer = setInterval(refreshLiveQuotes, 60000);
  } else if (liveQuoteRefreshTimer) {
    clearInterval(liveQuoteRefreshTimer);
    liveQuoteRefreshTimer = null;
  }
  if (tradeDrawer.open) renderTradeDetail();
}

function updateSidebar() {
  const key = localDateKey();
  const closedToday = closedTrades().filter((trade) => tradeRealizedDate(trade) === key);
  const realized = closedToday.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const live = livePositionSummary();
  const pnlElement = document.querySelector("#sidebarPnl");
  pnlElement.textContent = signedMoney(realized);
  pnlElement.className = pnlClass(realized);
  document.querySelector("#sidebarMeta").textContent = `${closedToday.length} closed today`;
  const open = document.querySelector("#sidebarOpen");
  open.textContent = live.priced.length ? signedMoney(live.total) : "—";
  open.className = pnlClass(live.total);
  const count = document.querySelector("#navOpenCount");
  if (count) count.textContent = live.positions.length || "";
}

async function refreshMarketStrip() {
  const results = await Promise.all(MARKET_SYMBOLS.map(async ([symbol]) => {
    try {
      return [symbol, await fetchLiveQuote({ symbol })];
    } catch {
      return [symbol, null];
    }
  }));
  marketQuotes = new Map(results);
  const strip = document.querySelector("#marketStrip");
  if (!strip) return;
  const available = MARKET_SYMBOLS.filter(([symbol]) => marketQuotes.get(symbol)?.price);
  strip.innerHTML = available.map(([symbol, label]) => {
    const quote = marketQuotes.get(symbol);
    const change = quoteChangePct(quote);
    return `<span class="market-item"><small>${label}</small><strong>${number(quote.price, 2)}</strong>${change === null ? "" : `<em class="${pnlClass(change)}">${signedPercent(change, 2)}</em>`}</span>`;
  }).join("");
}

function handleTipHover(event) {
  const target = event.target.closest?.("[data-tip]");
  if (target) {
    showChartTooltip(event, [], target.dataset.tip);
    handleTipHover.active = true;
  } else if (handleTipHover.active) {
    hideChartTooltip();
    handleTipHover.active = false;
  }
}

function openSymbolInLog(symbol) {
  logFilters = { ...defaultLogFilters(), search: symbol };
  navigate("trades");
}

const segmentHandlers = {
  "dash-range": (value) => {
    dashRange = value;
    writePref("personal-trading-journal-dash-range", value);
    render();
  },
  "analytics-range": (value) => {
    analyticsRange = value;
    writePref("personal-trading-journal-analytics-range", value);
    render();
  },
  "income-range": (value) => {
    incomeRange = value;
    writePref("personal-trading-journal-income-range", value);
    render();
  },
  "journal-tab": (value) => {
    journalTab = value;
    render();
  },
};

function handleDocumentClick(event) {
  const element = event.target.closest?.("button, [data-open-trade], [data-filter-symbol], [data-open-day], summary, a");
  if (!element) return;
  const data = element.dataset;
  if (data.seg && segmentHandlers[data.seg]) return segmentHandlers[data.seg](data.value);
  if (data.viewLink) return navigate(data.viewLink);
  if ("refreshQuotes" in data) return refreshLiveQuotes();
  if (data.closeTrade) return openTradeDialog(data.closeTrade, { closeNow: true });
  if (data.editTrade) return openTradeDialog(data.editTrade);
  if (data.rollTrade) return openRollDialog(data.rollTrade);
  if ("closeDrawer" in data) return tradeDrawer.close();
  if ("closeRoll" in data) return rollDialog.close();
  if (data.positionSort) {
    positionSort = { key: data.positionSort, dir: positionSort.key === data.positionSort ? -positionSort.dir : (data.positionSort === "symbol" || data.positionSort === "dte" || data.positionSort === "cushion" ? 1 : -1) };
    return updateLiveMounts();
  }
  if (data.logSort) {
    logFilters = { ...logFilters, sort: data.logSort, dir: logFilters.sort === data.logSort ? -logFilters.dir : (data.logSort === "symbol" || data.logSort === "strategy" ? 1 : -1), page: 1 };
    return renderLogTable();
  }
  if (data.logPage) {
    logFilters.page += Number(data.logPage);
    return renderLogTable();
  }
  if ("logClear" in data) {
    logFilters = defaultLogFilters();
    return renderTrades();
  }
  if ("logExport" in data) return exportCsv(sortLogTrades(logMatches()));
  if (data.selectDay) {
    selectedDay = data.selectDay;
    return renderCalendar();
  }
  if (data.month) {
    const next = new Date(`${selectedDay.slice(0, 7)}-01T00:00:00`);
    next.setMonth(next.getMonth() + Number(data.month));
    selectedDay = localDateKey(next);
    return renderCalendar();
  }
  if ("monthToday" in data) {
    selectedDay = localDateKey();
    return renderCalendar();
  }
  if (data.openJournal) {
    journalDate = data.openJournal;
    journalTab = "daily";
    return navigate("journal");
  }
  if (data.journalDay) {
    journalDate = shiftDateKey(journalDate, Number(data.journalDay));
    return renderDailyJournal();
  }
  if ("journalToday" in data) {
    journalDate = localDateKey();
    return renderDailyJournal();
  }
  if (data.journalWeek) {
    journalWeek = shiftDateKey(journalWeek, Number(data.journalWeek));
    return renderWeeklyReview();
  }
  if (data.playbookEdit) {
    playbookEditing = Number(data.playbookEdit);
    return renderPlaybook();
  }
  if ("playbookCancel" in data) {
    if (state.strategies[playbookEditing]?.isNew) state.strategies.splice(playbookEditing, 1);
    playbookEditing = null;
    return renderPlaybook();
  }
  if ("playbookAdd" in data) {
    state.strategies.push({ id: crypto.randomUUID(), name: "", rules: "", checklist: [], isNew: true });
    playbookEditing = state.strategies.length - 1;
    return renderPlaybook();
  }
  if (data.playbookDelete) {
    const strategy = state.strategies[Number(data.playbookDelete)];
    if (!confirm(`Delete ${strategy.name || "this strategy"}? Trades keep their strategy name.`)) return undefined;
    state.strategies.splice(Number(data.playbookDelete), 1);
    playbookEditing = null;
    saveState();
    return renderPlaybook();
  }
  if (data.removeFlow) {
    if (!confirm("Remove this cash flow?")) return undefined;
    state.cashflows = state.cashflows.filter((flow) => flow.id !== data.removeFlow);
    saveState();
    return render();
  }
  if (data.watchRemove) {
    state.watchlist.splice(Number(data.watchRemove), 1);
    saveState();
    return renderWatchlist();
  }
  if (data.research) return openResearch(data.research, data.symbol);
  if (data.filterSymbol) {
    if (paletteDialog.open) paletteDialog.close();
    return openSymbolInLog(data.filterSymbol);
  }
  if (data.openDay) return openDayInCalendar(data.openDay);
  if (data.openTrade) return openTradeDrawer(data.openTrade);
  return undefined;
}

function openResearch(view, symbol) {
  if (view === "gex") {
    gexView = { ...gexView, symbol, data: null, error: "" };
  } else if (view === "volatility") {
    volView = { ...volView, symbol, data: null, error: "" };
  } else {
    writePref(FLOW_SYMBOLS_KEY, symbol);
    flowResult = null;
  }
  navigate(view);
  if (view === "flow") document.querySelector("#flowForm")?.requestSubmit();
  if (view === "volatility") document.querySelector("#volForm")?.requestSubmit();
}

function handleDocumentKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (paletteDialog.open) paletteDialog.close();
    else openPalette();
    return;
  }
  const row = event.target.closest?.("[data-open-trade], [data-filter-symbol], [data-open-day]");
  if (row && !["BUTTON", "A", "INPUT"].includes(event.target.tagName) && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    row.click();
    return;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
  if (typing || event.metaKey || event.ctrlKey || event.altKey || document.querySelector("dialog[open]")) return;
  if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    openTradeDialog();
  }
}

function handleDocumentInput(event) {
  if (event.target.id === "logSearch") {
    logFilters.search = event.target.value;
    logFilters.page = 1;
    renderLogTable();
  }
}

function handleDocumentChange(event) {
  const target = event.target;
  const data = target.dataset;
  if (data.logFilter) {
    logFilters[data.logFilter] = target.value;
    logFilters.page = 1;
    return renderTrades();
  }
  if ("logPageSize" in data) {
    logFilters.pageSize = Number(target.value);
    logFilters.page = 1;
    return renderLogTable();
  }
  if (data.analyticsFilter) {
    if (data.analyticsFilter === "asset") analyticsAsset = target.value;
    else analyticsStrategy = target.value;
    return render();
  }
  if (data.watchField) {
    const item = state.watchlist[Number(data.index)];
    if (!item) return undefined;
    item[data.watchField] = data.watchField === "note" ? target.value : Number(target.value || 0);
    saveState();
    const mount = document.querySelector("#watchMount");
    if (mount) mount.innerHTML = renderWatchTable();
    return undefined;
  }
  const dayForm = target.closest?.("[data-day-form]");
  if (dayForm) return saveDayForm(dayForm);
  const weekForm = target.closest?.("[data-week-form]");
  if (weekForm) return saveWeekForm(weekForm);
  return undefined;
}

function saveDayForm(form) {
  const data = new FormData(form);
  const rules = Object.fromEntries(DAY_RULES.map(([key]) => [key, data.has(`rule-${key}`)]));
  state.dayNotes[journalDate] = { plan: data.get("plan"), recap: data.get("recap"), mental: data.get("mental"), rules };
  saveState();
}

function saveWeekForm(form) {
  const data = new FormData(form);
  state.weeklyReviews[journalWeek] = { wins: data.get("wins"), lessons: data.get("lessons"), focus: data.get("focus") };
  saveState();
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest?.("[data-playbook-form]");
  if (!form) return;
  event.preventDefault();
  const index = Number(form.dataset.playbookForm);
  const data = new FormData(form);
  const name = String(data.get("name")).trim();
  if (state.strategies.some((strategy, other) => other !== index && strategy.name === name)) {
    showToast("A strategy with that name already exists");
    return;
  }
  const previous = state.strategies[index];
  if (previous.name && previous.name !== name) {
    state.trades.forEach((trade) => {
      if (trade.strategy === previous.name) trade.strategy = name;
    });
  }
  const { isNew, ...rest } = previous;
  state.strategies[index] = {
    ...rest,
    name,
    rules: String(data.get("rules")),
    checklist: String(data.get("checklist")).split("\n").map((line) => line.trim()).filter(Boolean),
  };
  playbookEditing = null;
  saveState();
  showToast("Strategy saved");
  renderPlaybook();
});

function openRollDialog(id) {
  const trade = state.trades.find((item) => item.id === id);
  if (!trade) return;
  const form = rollDialog.querySelector("form");
  form.reset();
  form.dataset.tradeId = id;
  rollDialog.querySelector("#rollSummary").textContent = `${trade.symbol} ${optionContractLabel(trade)}, sold for ${money(Number(trade.entry || 0))}`;
  form.elements.closeDate.value = localDateKey();
  form.elements.openDate.value = localDateKey();
  form.elements.buyback.value = liveQuoteForTrade(trade)?.price ? Number(liveQuoteForTrade(trade).price).toFixed(2) : "";
  form.elements.strike.value = Number(trade.optionStrike || 0) || "";
  form.elements.contracts.value = Number(trade.contracts || trade.size || 1);
  form.elements.contracts.max = Number(trade.contracts || trade.size || 1);
  updateRollPreview();
  form.oninput = updateRollPreview;
  rollDialog.showModal();
}

function updateRollPreview() {
  const form = rollDialog.querySelector("form");
  const buyback = Number(form.elements.buyback.value || 0);
  const credit = Number(form.elements.credit.value || 0);
  const contracts = Number(form.elements.contracts.value || 0);
  const output = rollDialog.querySelector("#rollPreview");
  if (!form.elements.buyback.value || !form.elements.credit.value) {
    output.textContent = "Enter the buy-back and new credit to see the net.";
    output.className = "roll-preview";
    return;
  }
  const net = (credit - buyback) * contracts * 100;
  output.textContent = `${net >= 0 ? "Net credit" : "Net debit"} ${money(Math.abs(net))} on this roll`;
  output.className = `roll-preview ${pnlClass(net)}`;
}

// A roll closes the current contract and opens its replacement as a linked
// trade, so each leg keeps its own realized P&L.
async function saveRoll(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const trade = state.trades.find((item) => item.id === form.dataset.tradeId);
  if (!trade) return;
  const data = Object.fromEntries(new FormData(form));
  const held = Number(trade.contracts || trade.size || 0);
  const contracts = Number(data.contracts);
  if (data.closeDate < trade.date) {
    showToast("Close date cannot be before the open date");
    return;
  }
  if (data.expiration < data.openDate) {
    showToast("New expiration cannot be before the roll date");
    return;
  }
  if (contracts !== held) {
    showToast(`Rolls apply to the whole position of ${held} contract${held === 1 ? "" : "s"}. Use Edit for partial changes.`);
    return;
  }
  const newId = crypto.randomUUID();
  const replacement = {
    ...trade,
    id: newId,
    date: data.openDate,
    entryTime: new Date().toTimeString().slice(0, 5),
    exitDate: "",
    exitTime: "",
    exit: 0,
    entry: Number(data.credit),
    plannedEntry: Number(data.credit),
    optionExpiration: data.expiration,
    optionStrike: Number(data.strike),
    fees: 0,
    reviewed: false,
    journaled: false,
    notes: "",
    image: "",
    rolledFromId: trade.id,
  };
  trade.exit = Number(data.buyback);
  trade.exitDate = data.closeDate;
  trade.exitTime = new Date().toTimeString().slice(0, 5);
  trade.rolledToId = newId;
  state.trades.unshift(replacement);
  selectedTradeId = newId;
  const saved = await saveState();
  rollDialog.close();
  liveQuotesUpdatedAt = null;
  showToast(saved ? `${trade.symbol} rolled` : "Saved in browser only. Start the local server to save to file.");
  render();
}

function paletteItems() {
  const views = navItems.map(([id, label]) => ({ label, hint: VIEW_SUBTITLES[id], iconName: id, run: () => navigate(id) }));
  const actions = [
    { label: "New trade", hint: "Log a position", iconName: "plus", run: () => openTradeDialog() },
    { label: "Toggle theme", hint: "Switch light and dark", iconName: "sun", run: toggleTheme },
    { label: "Today's journal", hint: "Plan and recap", iconName: "journal", run: () => { journalDate = localDateKey(); journalTab = "daily"; navigate("journal"); } },
    { label: "Export JSON backup", hint: "Download everything", iconName: "download", run: exportData },
  ];
  const symbols = [...new Set(state.trades.map((trade) => String(trade.symbol).toUpperCase()))].sort().map((symbol) => ({
    label: symbol,
    hint: `${state.trades.filter((trade) => String(trade.symbol).toUpperCase() === symbol).length} trades`,
    iconName: "trades",
    run: () => openSymbolInLog(symbol),
  }));
  return [...actions, ...views, ...symbols];
}

function openPalette() {
  const input = paletteDialog.querySelector("input");
  input.value = "";
  renderPaletteResults();
  paletteDialog.showModal();
  input.focus();
}

function renderPaletteResults() {
  const query = paletteDialog.querySelector("input").value.trim().toLowerCase();
  const all = paletteItems();
  paletteResults = (query ? all.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(query)) : all).slice(0, 9);
  paletteIndex = 0;
  paintPalette();
}

function paintPalette() {
  const list = paletteDialog.querySelector("#paletteList");
  list.replaceChildren(...paletteResults.map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `palette-item ${index === paletteIndex ? "active" : ""}`;
    button.innerHTML = icon(item.iconName, 15);
    const label = document.createElement("strong");
    label.textContent = item.label;
    const hint = document.createElement("span");
    hint.textContent = item.hint;
    button.append(label, hint);
    button.addEventListener("click", () => runPaletteItem(item));
    return button;
  }));
  if (!paletteResults.length) {
    const empty = document.createElement("div");
    empty.className = "viz-empty";
    empty.textContent = "No matches.";
    list.append(empty);
  }
}

function runPaletteItem(item) {
  paletteDialog.close();
  item.run();
}

function handlePaletteKeys(event) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!paletteResults.length) return;
    paletteIndex = (paletteIndex + (event.key === "ArrowDown" ? 1 : -1) + paletteResults.length) % paletteResults.length;
    paintPalette();
  } else if (event.key === "Enter" && paletteResults[paletteIndex]) {
    event.preventDefault();
    runPaletteItem(paletteResults[paletteIndex]);
  }
}
