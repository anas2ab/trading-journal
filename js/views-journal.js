// Trade log, trade detail drawer, calendar, daily journal and playbook.

const LOG_PAGE_SIZES = [25, 50, 100];
const defaultLogFilters = () => ({ search: "", status: "", asset: "", strategy: "", side: "", outcome: "", from: "", to: "", tag: "", review: "", sort: "activity", dir: -1, page: 1, pageSize: 25 });
let logFilters = defaultLogFilters();
let journalTab = "daily";
let journalDate = localDateKey();
let journalWeek = weekStartKey(localDateKey());
let playbookEditing = null;

function tradeActivityDate(trade) {
  return tradeRealizedDate(trade) || trade.date;
}

function logMatches() {
  const filters = logFilters;
  const search = filters.search.trim().toLowerCase();
  return state.trades.filter((trade) => {
    if (search) {
      const text = `${trade.symbol} ${trade.strategy} ${trade.notes} ${trade.customTags} ${positionLabel(trade)}`.toLowerCase();
      if (!search.split(/\s+/).every((word) => text.includes(word))) return false;
    }
    const open = isTradeOpen(trade);
    if (filters.status === "open" && !open) return false;
    if (filters.status === "closed" && (open || trade.assignedTradeId)) return false;
    if (filters.status === "assigned" && !trade.assignedTradeId) return false;
    if (filters.asset && trade.assetClass !== filters.asset) return false;
    if (filters.strategy && trade.strategy !== filters.strategy) return false;
    if (filters.side && trade.direction !== filters.side) return false;
    if (filters.tag && !tradeTags(trade).includes(filters.tag)) return false;
    if (filters.review === "todo" && (open || trade.assignedTradeId || trade.reviewed === true)) return false;
    if (filters.outcome === "win" && (open || tradePnl(trade) <= 0)) return false;
    if (filters.outcome === "loss" && (open || tradePnl(trade) >= 0)) return false;
    const activity = tradeActivityDate(trade);
    if (filters.from && activity < filters.from) return false;
    if (filters.to && activity > filters.to) return false;
    return true;
  });
}

function sortLogTrades(trades) {
  const { sort, dir } = logFilters;
  const value = (trade) => ({
    activity: `${tradeActivityDate(trade)}${trade.exitTime || trade.entryTime || ""}`,
    opened: trade.date,
    symbol: String(trade.symbol),
    strategy: String(trade.strategy),
    hold: holdDays(trade),
    capital: positionCapital(trade),
    pnl: isTradeOpen(trade) ? -Infinity : tradePnl(trade),
    returnPct: isTradeOpen(trade) ? -Infinity : tradeReturnPct(trade) ?? -Infinity,
  }[sort]);
  return [...trades].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    return (typeof left === "string" ? left.localeCompare(right) : left - right) * dir;
  });
}

function renderTrades() {
  const filters = logFilters;
  const select = (key, label, options) => `
    <label class="field-inline"><span class="sr-only">${label}</span>
      <select data-log-filter="${key}" aria-label="${label}">
        <option value="">${label}</option>
        ${options.map(([value, text]) => `<option value="${escapeHtml(value)}" ${filters[key] === value ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>
  `;
  const strategies = [...new Set(state.trades.map((trade) => trade.strategy).filter(Boolean))].sort();
  const tags = [...new Set(state.trades.flatMap(tradeTags))].sort();
  const hasFilters = ["search", "status", "asset", "strategy", "side", "outcome", "from", "to", "tag", "review"].some((key) => filters[key]);
  appView.innerHTML = `
    <section class="card">
      <div class="filter-bar">
        <label class="search-field">${icon("search", 15)}
          <span class="sr-only">Search trades</span>
          <input id="logSearch" type="search" placeholder="Search ticker, notes, tags" value="${escapeHtml(filters.search)}" autocomplete="off" />
        </label>
        ${select("status", "All statuses", [["open", "Open"], ["closed", "Closed"], ["assigned", "Assigned"]])}
        ${select("outcome", "Wins and losses", [["win", "Winners"], ["loss", "Losers"]])}
        ${select("strategy", "All strategies", strategies.map((value) => [value, value]))}
        ${select("asset", "All assets", [["Options", "Options"], ["Stocks", "Stocks"]])}
        ${select("side", "Long and short", [["Long", "Long"], ["Short", "Short"]])}
        ${tags.length ? select("tag", "All tags", tags.map((value) => [value, value])) : ""}
        ${select("review", "Any review state", [["todo", "Not reviewed"]])}
        <label class="field-inline date-field"><span>From</span><input type="date" data-log-filter="from" value="${filters.from}" /></label>
        <label class="field-inline date-field"><span>To</span><input type="date" data-log-filter="to" value="${filters.to}" /></label>
        ${hasFilters ? `<button class="btn btn-ghost" data-log-clear type="button">Clear</button>` : ""}
        <button class="btn filter-end" data-log-export type="button">${icon("download", 14)} Export CSV</button>
      </div>
      <div id="logMount"></div>
    </section>
  `;
  renderLogTable();
}

function logSortHeader(key, label, numeric = false) {
  const active = logFilters.sort === key;
  return `<th class="${numeric ? "num" : ""}" aria-sort="${active ? (logFilters.dir > 0 ? "ascending" : "descending") : "none"}"><button class="th-sort ${active ? "active" : ""}" data-log-sort="${key}" type="button">${label}${active ? `<i>${logFilters.dir > 0 ? "↑" : "↓"}</i>` : ""}</button></th>`;
}

function renderLogTable() {
  const mount = document.querySelector("#logMount");
  if (!mount) return;
  const matches = sortLogTrades(logMatches());
  const stats = tradeStats(matches);
  const pages = Math.max(1, Math.ceil(matches.length / logFilters.pageSize));
  logFilters.page = Math.min(logFilters.page, pages);
  const startIndex = (logFilters.page - 1) * logFilters.pageSize;
  const pageTrades = matches.slice(startIndex, startIndex + logFilters.pageSize);
  mount.innerHTML = `
    <div class="summary-strip">
      <span><small>Trades</small><strong>${matches.length}</strong></span>
      <span><small>Net P&amp;L</small><strong class="${pnlClass(stats.total)}">${signedMoney(stats.total)}</strong></span>
      <span><small>Win rate</small><strong>${stats.count ? `${number(stats.winRate, 1)}%` : "—"}</strong></span>
      <span><small>Profit factor</small><strong>${stats.profitFactor === null ? "—" : number(stats.profitFactor, 2)}</strong></span>
      <span><small>Avg win</small><strong class="${stats.avgWin ? "positive" : ""}">${money(stats.avgWin)}</strong></span>
      <span><small>Avg loss</small><strong class="${stats.avgLoss ? "negative" : ""}">${money(stats.avgLoss ? -stats.avgLoss : 0)}</strong></span>
      <span><small>Avg hold</small><strong>${number(stats.avgHold, 1)}d</strong></span>
    </div>
    ${pageTrades.length ? `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>
            ${logSortHeader("activity", "Date")}
            ${logSortHeader("symbol", "Position")}
            ${logSortHeader("strategy", "Strategy")}
            <th class="num">Entry</th>
            <th class="num">Exit</th>
            ${logSortHeader("hold", "Held", true)}
            ${logSortHeader("capital", "Capital", true)}
            ${logSortHeader("returnPct", "Return", true)}
            ${logSortHeader("pnl", "P&amp;L", true)}
            <th>Status</th>
          </tr></thead>
          <tbody>${pageTrades.map(logRow).join("")}</tbody>
        </table>
      </div>
      <div class="pager">
        <span>${startIndex + 1}-${Math.min(startIndex + logFilters.pageSize, matches.length)} of ${matches.length}</span>
        <label class="field-inline"><span class="sr-only">Rows per page</span>
          <select data-log-page-size aria-label="Rows per page">${LOG_PAGE_SIZES.map((size) => `<option value="${size}" ${size === logFilters.pageSize ? "selected" : ""}>${size} per page</option>`).join("")}</select>
        </label>
        <div class="pager-buttons">
          <button class="icon-btn" data-log-page="-1" type="button" aria-label="Previous page" ${logFilters.page <= 1 ? "disabled" : ""}>${icon("left", 15)}</button>
          <span>Page ${logFilters.page} of ${pages}</span>
          <button class="icon-btn" data-log-page="1" type="button" aria-label="Next page" ${logFilters.page >= pages ? "disabled" : ""}>${icon("right", 15)}</button>
        </div>
      </div>
    ` : emptyBlock("No trades match", "Try clearing a filter or widening the dates.")}
  `;
}

function logRow(trade) {
  const open = isTradeOpen(trade);
  const assigned = Boolean(trade.assignedTradeId);
  const pnl = open || assigned ? null : tradePnl(trade);
  const returnPct = pnl === null ? null : tradeReturnPct(trade);
  return `
    <tr class="row-link" data-open-trade="${trade.id}" tabindex="0">
      <td class="nowrap">${shortDate(tradeActivityDate(trade))}<small class="cell-sub">${open ? "Opened" : `Opened ${shortDate(trade.date)}`}</small></td>
      <td><div class="sym-cell"><strong>${escapeHtml(trade.symbol)}</strong><span>${escapeHtml(positionLabel(trade))}</span></div></td>
      <td><span class="muted">${escapeHtml(trade.strategy)}</span></td>
      <td class="num">${money(Number(trade.entry || 0))}</td>
      <td class="num">${open || assigned ? `<span class="muted">—</span>` : money(Number(trade.exit || 0))}</td>
      <td class="num">${holdDays(trade)}d</td>
      <td class="num">${positionCapital(trade) ? compactMoney(positionCapital(trade)) : `<span class="muted">—</span>`}</td>
      <td class="num">${returnPct === null ? `<span class="muted">—</span>` : `<span class="${pnlClass(returnPct)}">${signedPercent(returnPct, 1)}</span>`}</td>
      <td class="num"><strong class="${pnl === null ? "" : pnlClass(pnl)}">${pnl === null ? "—" : signedMoney(pnl)}</strong></td>
      <td>${tradeStatusChip(trade)}</td>
    </tr>
  `;
}

// Compact table for dashboards and day panels.
function renderTradeRows(trades) {
  if (!trades.length) return emptyBlock("No trades yet", "Log your first trade to start the journal.");
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Position</th><th>Strategy</th><th class="num">Held</th><th class="num">P&amp;L</th><th>Status</th></tr></thead>
        <tbody>${trades.map((trade) => {
          const pnl = isTradeOpen(trade) || trade.assignedTradeId ? null : tradePnl(trade);
          return `<tr class="row-link" data-open-trade="${trade.id}" tabindex="0">
            <td class="nowrap">${shortDate(tradeActivityDate(trade))}</td>
            <td><div class="sym-cell"><strong>${escapeHtml(trade.symbol)}</strong><span>${escapeHtml(positionLabel(trade))}</span></div></td>
            <td><span class="muted">${escapeHtml(trade.strategy)}</span></td>
            <td class="num">${holdDays(trade)}d</td>
            <td class="num"><strong class="${pnl === null ? "" : pnlClass(pnl)}">${pnl === null ? "—" : signedMoney(pnl)}</strong></td>
            <td>${tradeStatusChip(trade)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>
  `;
}

function openTradeDrawer(id) {
  selectedTradeId = id;
  renderTradeDetail();
  if (!tradeDrawer.open) tradeDrawer.showModal();
}

function factRow(label, value) {
  return `<div class="fact"><span>${label}</span><strong>${value}</strong></div>`;
}

function optionsMarkup(values, current) {
  return `<option value="">Not logged</option>${values.map((value) => `<option ${value === current ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}`;
}

function renderTradeDetail() {
  const mount = document.querySelector("#tradeDetailMount");
  if (!mount) return;
  const trade = state.trades.find((item) => item.id === selectedTradeId);
  if (!trade) {
    mount.innerHTML = "";
    if (tradeDrawer.open) tradeDrawer.close();
    return;
  }
  const open = isTradeOpen(trade);
  const assigned = Boolean(trade.assignedTradeId);
  const pnl = open ? livePnl(trade) : assigned ? null : tradePnl(trade);
  const returnPct = !open && !assigned ? tradeReturnPct(trade) : null;
  const annual = !open && !assigned ? annualizedReturnPct(trade) : null;
  const checklist = strategyForTrade(trade)?.checklist || [];
  const risk = Number(trade.actualRisk || 0);
  const logged = trade.journaled === true;
  const dte = open ? positionDte(trade) : null;
  const premium = premiumCollected(trade);
  mount.innerHTML = `
    <header class="drawer-head">
      <div>
        <div class="drawer-title"><h2>${escapeHtml(trade.symbol)}</h2>${tradeStatusChip(trade)}${trade.reviewed === true ? statusChip("Reviewed") : ""}</div>
        <p>${escapeHtml(positionLabel(trade))} · ${escapeHtml(trade.strategy)} · ${escapeHtml(trade.direction)}</p>
      </div>
      <button class="icon-btn" data-close-drawer type="button" aria-label="Close trade details">${icon("close", 16)}</button>
    </header>
    <div class="drawer-hero">
      <div>
        <small>${open ? "Unrealized P&amp;L" : assigned ? "Result" : "Realized P&amp;L"}</small>
        <strong class="${pnl === null ? "" : pnlClass(pnl)}">${pnl === null ? (assigned ? "Moved to share basis" : "—") : signedMoney(pnl)}</strong>
      </div>
      <div class="drawer-actions">
        ${open && canRoll(trade) ? `<button class="btn" data-roll-trade="${trade.id}" type="button">${icon("roll", 14)} Roll</button>` : ""}
        ${open ? `<button class="btn btn-primary" data-close-trade="${trade.id}" type="button">Close trade</button>` : ""}
        <button class="btn" data-edit-trade="${trade.id}" type="button">Edit</button>
      </div>
    </div>
    <div class="fact-grid">
      ${factRow("Opened", longDateShort(trade.date))}
      ${factRow(open ? "Status" : "Closed", open ? "Still open" : longDateShort(trade.exitDate || trade.date))}
      ${factRow("Held", `${holdDays(trade)} days`)}
      ${factRow(isAssignedShareLot(trade) ? "Adjusted avg cost" : tradeEntryExitLabel(trade).split("/")[0].trim() || "Entry", isAssignedShareLot(trade) ? money(assignedShareSummary(trade).adjustedAverageCost) : money(Number(trade.entry || 0)))}
      ${open ? factRow("Live mark", liveQuoteForTrade(trade)?.price ? money(liveQuoteForTrade(trade).price) : "—") : assigned ? "" : factRow(tradeEntryExitLabel(trade).split("/")[1]?.trim() || "Exit", money(Number(trade.exit || 0)))}
      ${factRow("Quantity", escapeHtml(String(displayQuantity(trade))))}
      ${positionCapital(trade) ? factRow("Capital", money(positionCapital(trade))) : ""}
      ${premium ? factRow("Premium sold", money(premium)) : ""}
      ${returnPct !== null ? factRow("Return", `<span class="${pnlClass(returnPct)}">${signedPercent(returnPct, 2)}</span>`) : ""}
      ${annual !== null ? factRow("Annualized", `<span class="${pnlClass(annual)}">${signedPercent(annual, 0)}</span>`) : ""}
      ${dte !== null ? factRow("Days to expiry", String(dte)) : ""}
      ${risk ? factRow("Risk", money(risk)) : ""}
      ${risk && !open ? factRow("R multiple", `${number(tradeR(trade), 2)}R`) : ""}
      ${Number(trade.fees) ? factRow("Fees", money(Number(trade.fees))) : ""}
      ${trade.partials ? factRow("Partials", escapeHtml(trade.partials)) : ""}
    </div>
    ${isAssignedShareLot(trade) ? renderAssignedShareCalls(trade) : ""}
    ${isPmccStrategy(trade.strategy) ? renderPmccWeeklyCalls(trade) : ""}
    <form class="review-form" data-review-form="${trade.id}">
      <h3>Trade review</h3>
      <div class="form-row four">
        <label>Setup quality<select name="quality">${optionsMarkup(JOURNAL_QUALITY, logged ? trade.quality : "")}</select></label>
        <label>Emotion<select name="emotion">${optionsMarkup(JOURNAL_EMOTION, logged ? trade.emotion : "")}</select></label>
        <label>Mistake<select name="mistake">${optionsMarkup(JOURNAL_MISTAKE, logged ? trade.mistake : "")}</select></label>
        <label>Market<select name="market">${optionsMarkup(JOURNAL_MARKET, logged ? trade.market : "")}</select></label>
      </div>
      <div class="form-row four">
        <label>Stop<input name="stop" type="number" step="0.01" value="${Number(trade.stop) || ""}" /></label>
        <label>Target<input name="target" type="number" step="0.01" value="${Number(trade.target) || ""}" /></label>
        <label>Risk $<input name="actualRisk" type="number" step="0.01" min="0" value="${risk || ""}" /></label>
        <label>Fees $<input name="fees" type="number" step="0.01" min="0" value="${Number(trade.fees) || ""}" /></label>
      </div>
      <label>Tags<input name="customTags" type="text" value="${escapeHtml(trade.customTags || "")}" placeholder="earnings, high-iv, wheel" autocomplete="off" /></label>
      <label>Notes<textarea name="notes" rows="4" placeholder="Thesis, what you saw, what you would do differently">${escapeHtml(trade.notes || "")}</textarea></label>
      ${checklist.length ? `
        <fieldset class="check-group">
          <legend>${escapeHtml(trade.strategy)} checklist</legend>
          ${checklist.map((rule) => `<label class="check"><input type="checkbox" name="ruleChecks" value="${escapeHtml(rule)}" ${(trade.ruleChecks || []).includes(rule) ? "checked" : ""} /><span>${escapeHtml(rule)}</span></label>`).join("")}
        </fieldset>
      ` : ""}
      <div class="shot">
        ${trade.image ? `<a href="${escapeHtml(trade.image)}" target="_blank" rel="noopener"><img src="${escapeHtml(trade.image)}" alt="${escapeHtml(trade.symbol)} chart screenshot" /></a>` : ""}
        <label class="btn btn-file">${icon("image", 14)} ${trade.image ? "Replace screenshot" : "Add screenshot"}<input type="file" accept="image/*" data-trade-image="${trade.id}" /></label>
        ${trade.image ? `<button class="btn btn-ghost" data-remove-image="${trade.id}" type="button">Remove</button>` : ""}
      </div>
      <div class="review-actions"><button class="btn btn-primary" type="submit">Save review</button></div>
    </form>
  `;
  mount.querySelector("[data-covered-call-form]")?.addEventListener("submit", addCoveredCall);
  mount.querySelectorAll("[data-close-covered-call-form]").forEach((form) => form.addEventListener("submit", closeCoveredCall));
  mount.querySelector("[data-pmcc-call-form]")?.addEventListener("submit", savePmccWeeklyCall);
  mount.querySelectorAll("[data-close-pmcc-call-form]").forEach((form) => form.addEventListener("submit", closePmccWeeklyCall));
  mount.querySelectorAll("[data-delete-pmcc-call]").forEach((button) => {
    button.addEventListener("click", () => deletePmccWeeklyCall(trade.id, button.dataset.deletePmccCall));
  });
  mount.querySelector("[data-review-form]")?.addEventListener("submit", saveTradeReview);
  mount.querySelector("[data-trade-image]")?.addEventListener("change", uploadTradeImage);
  mount.querySelector("[data-remove-image]")?.addEventListener("click", async () => {
    trade.image = "";
    await saveState();
    renderTradeDetail();
  });
}

async function saveTradeReview(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const trade = state.trades.find((item) => item.id === form.dataset.reviewForm);
  if (!trade) return;
  const data = new FormData(form);
  const value = (name) => String(data.get(name) || "").trim();
  const logged = value("quality") || value("emotion") || value("mistake") || value("market");
  // Older trades carry placeholder values the journal never asked about, so
  // they stay out of psychology analytics until a value is actually chosen.
  if (logged || trade.journaled) {
    trade.journaled = true;
    trade.quality = value("quality");
    trade.emotion = value("emotion");
    trade.mistake = value("mistake");
    trade.market = value("market");
    trade.followedRules = !trade.mistake || trade.mistake === "None";
  }
  trade.stop = Number(value("stop") || 0);
  trade.target = Number(value("target") || 0);
  trade.actualRisk = Number(value("actualRisk") || 0);
  trade.fees = Number(value("fees") || 0);
  trade.customTags = value("customTags");
  trade.notes = value("notes");
  trade.ruleChecks = data.getAll("ruleChecks").map(String);
  trade.reviewed = true;
  const saved = await saveState();
  showToast(saved ? "Review saved" : "Saved in browser only. Start the local server to save to file.");
  render();
}

async function uploadTradeImage(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  const trade = state.trades.find((item) => item.id === input.dataset.tradeImage);
  if (!file || !trade) return;
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataUrl }),
    });
    if (!response.ok) throw new Error("Upload failed");
    trade.image = (await response.json()).path;
    await saveState();
    renderTradeDetail();
    showToast("Screenshot attached");
  } catch {
    showToast("Upload failed. The local server must be running to attach screenshots.");
  }
}

function openDayInCalendar(date) {
  selectedDay = date;
  activeView = "calendar";
  render();
}

function renderCalendar() {
  const monthStart = new Date(`${selectedDay.slice(0, 7)}-01T00:00:00`);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstCell = new Date(year, month, 1 - monthStart.getDay());
  const closed = closedTrades();
  const byDay = new Map();
  closed.forEach((trade) => {
    const key = tradeRealizedDate(trade);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(trade);
  });
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    const iso = localDateKey(date);
    const trades = byDay.get(iso) || [];
    return { iso, date, trades, pnl: trades.reduce((sum, trade) => sum + tradePnl(trade), 0), inMonth: date.getMonth() === month };
  });
  const lastWeekNeeded = cells.findLastIndex((cell) => cell.inMonth);
  const weeks = [];
  for (let index = 0; index <= lastWeekNeeded; index += 7) weeks.push(cells.slice(index, index + 7));
  const monthCells = cells.filter((cell) => cell.inMonth && cell.trades.length);
  const monthTrades = monthCells.flatMap((cell) => cell.trades);
  const stats = tradeStats(monthTrades);
  const maxAbs = Math.max(1, ...monthCells.map((cell) => Math.abs(cell.pnl)));
  const goal = riskLimits().monthlyGoal;
  appView.innerHTML = `
    <div class="page-bar">
      <div class="month-nav">
        <button class="icon-btn" data-month="-1" type="button" aria-label="Previous month">${icon("left", 16)}</button>
        <h2>${monthStart.toLocaleString(undefined, { month: "long", year: "numeric" })}</h2>
        <button class="icon-btn" data-month="1" type="button" aria-label="Next month">${icon("right", 16)}</button>
        <button class="btn btn-sm" data-month-today type="button">Today</button>
      </div>
    </div>
    <div class="tile-grid">
      ${statTile({ label: "Month P&amp;L", value: signedMoney(stats.total), tone: pnlClass(stats.total), sub: goal ? `${number((stats.total / goal) * 100, 0)}% of the ${money(goal)} goal` : `${stats.count} closed trades`, meter: goal ? (stats.total / goal) * 100 : null })}
      ${statTile({ label: "Trades closed", value: String(stats.count), sub: `${number(stats.winRate, 1)}% wins` })}
      ${statTile({ label: "Green days", value: `${stats.greenDays}/${stats.tradingDays}`, sub: "Sessions with realized gains" })}
      ${statTile({ label: "Best day", value: stats.bestDay[0] ? signedMoney(stats.bestDay[1]) : "—", tone: stats.bestDay[1] > 0 ? "positive" : "", sub: stats.bestDay[0] ? shortDate(stats.bestDay[0]) : "" })}
      ${statTile({ label: "Worst day", value: stats.worstDay[0] ? signedMoney(stats.worstDay[1]) : "—", tone: stats.worstDay[1] < 0 ? "negative" : "", sub: stats.worstDay[0] ? shortDate(stats.worstDay[0]) : "" })}
      ${statTile({ label: "Avg per day", value: signedMoney(stats.avgDay), tone: pnlClass(stats.avgDay), sub: "Across trading days" })}
    </div>
    <div class="grid-12">
      <div class="span-8">
        <section class="card fill">
          <div class="cal-grid cal-head">
            ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}<span class="cal-week-col">Week</span>
          </div>
          <div class="cal-grid">
            ${weeks.map((week) => {
              const weekTrades = week.filter((cell) => cell.trades.length);
              const weekPnl = weekTrades.reduce((sum, cell) => sum + cell.pnl, 0);
              return `${week.map((cell) => {
                const tone = !cell.trades.length ? "" : cell.pnl >= 0 ? "gain" : "loss";
                const heat = cell.trades.length ? `--heat:${(0.1 + (Math.abs(cell.pnl) / maxAbs) * 0.42).toFixed(2)}` : "";
                return `<button type="button" class="cal-cell ${cell.inMonth ? "" : "is-out"} ${tone} ${cell.iso === selectedDay ? "is-selected" : ""} ${cell.iso === localDateKey() ? "is-today" : ""}" style="${heat}" data-select-day="${cell.iso}" aria-label="${longDateShort(cell.iso)}${cell.trades.length ? `, ${signedMoney(cell.pnl)}, ${cell.trades.length} trades` : ""}">
                  <span class="cal-num">${cell.date.getDate()}</span>
                  ${cell.trades.length ? `<strong class="${pnlClass(cell.pnl)}">${compactSigned(cell.pnl)}</strong><small>${cell.trades.length} trade${cell.trades.length === 1 ? "" : "s"}</small>` : ""}
                </button>`;
              }).join("")}
              <div class="cal-week cal-week-col"><strong class="${pnlClass(weekPnl)}">${weekTrades.length ? compactSigned(weekPnl) : "—"}</strong></div>`;
            }).join("")}
          </div>
        </section>
      </div>
      <div class="span-4">${renderDayPanel(selectedDay, byDay.get(selectedDay) || [])}</div>
    </div>
  `;
}

function compactSigned(value) {
  return `${value > 0 ? "+" : ""}${compactMoney(value)}`;
}

function renderDayPanel(key, closed) {
  const opened = state.trades.filter((trade) => trade.date === key && !closed.includes(trade));
  const pnl = closed.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const note = state.dayNotes?.[key];
  const rowFor = (trade, showPnl) => `
    <button type="button" class="day-trade" data-open-trade="${trade.id}">
      <span class="sym-cell"><strong>${escapeHtml(trade.symbol)}</strong><span>${escapeHtml(positionLabel(trade))}</span></span>
      ${showPnl ? `<strong class="${pnlClass(tradePnl(trade))}">${signedMoney(tradePnl(trade))}</strong>` : tradeStatusChip(trade)}
    </button>
  `;
  return panel({
    eyebrow: new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" }),
    title: shortDate(key),
    actions: closed.length ? `<strong class="head-value ${pnlClass(pnl)}">${signedMoney(pnl)}</strong>` : "",
    className: "fill",
    body: `
      ${closed.length ? `<h3 class="sub-head">Closed</h3><div class="day-trades">${closed.map((trade) => rowFor(trade, true)).join("")}</div>` : ""}
      ${opened.length ? `<h3 class="sub-head">Opened</h3><div class="day-trades">${opened.map((trade) => rowFor(trade, false)).join("")}</div>` : ""}
      ${!closed.length && !opened.length ? `<div class="viz-empty">No trades on this day.</div>` : ""}
      ${note?.recap ? `<h3 class="sub-head">Recap</h3><p class="note-preview">${escapeHtml(note.recap)}</p>` : ""}
      <button class="btn panel-foot" data-open-journal="${key}" type="button">${icon("journal", 14)} Open daily journal</button>
    `,
  });
}

function renderJournal() {
  appView.innerHTML = `
    <div class="page-bar">
      ${segmentedControl("journal-tab", [["daily", "Daily"], ["weekly", "Weekly review"], ["notebook", "Notebook"]], journalTab, "Journal section")}
    </div>
    <div id="journalMount"></div>
  `;
  ({ daily: renderDailyJournal, weekly: renderWeeklyReview, notebook: renderNotebook })[journalTab]();
}

function dayNote(key) {
  return state.dayNotes[key] || { plan: "", recap: "", mental: "", rules: {} };
}

function hasDayNote(note) {
  return Boolean(note && (note.plan || note.recap || note.mental || Object.values(note.rules || {}).some(Boolean)));
}

function renderDailyJournal() {
  const note = dayNote(journalDate);
  const closed = closedTrades().filter((trade) => tradeRealizedDate(trade) === journalDate);
  const opened = state.trades.filter((trade) => trade.date === journalDate && !closed.includes(trade));
  const pnl = closed.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const activity = new Set([
    ...Object.keys(state.dayNotes).filter((key) => hasDayNote(state.dayNotes[key])),
    ...closedTrades().map(tradeRealizedDate),
  ]);
  const recent = [...activity].sort().reverse().slice(0, 12);
  document.querySelector("#journalMount").innerHTML = `
    <div class="grid-12">
      <div class="span-8">
        <section class="card fill">
          <header class="card-head">
            <div class="month-nav">
              <button class="icon-btn" data-journal-day="-1" type="button" aria-label="Previous day">${icon("left", 16)}</button>
              <h2>${longDate(journalDate)}</h2>
              <button class="icon-btn" data-journal-day="1" type="button" aria-label="Next day">${icon("right", 16)}</button>
              ${journalDate !== localDateKey() ? `<button class="btn btn-sm" data-journal-today type="button">Today</button>` : ""}
            </div>
            ${closed.length ? `<strong class="head-value ${pnlClass(pnl)}">${signedMoney(pnl)}</strong>` : ""}
          </header>
          <form class="note-form" data-day-form>
            <label>Game plan<textarea name="plan" rows="4" placeholder="Levels, setups you are looking for, and what would keep you out">${escapeHtml(note.plan || "")}</textarea></label>
            <label>End of day recap<textarea name="recap" rows="4" placeholder="What happened, what worked, what to repeat">${escapeHtml(note.recap || "")}</textarea></label>
            <label>Mindset<textarea name="mental" rows="2" placeholder="Energy, focus, anything affecting decisions">${escapeHtml(note.mental || "")}</textarea></label>
            <fieldset class="check-group">
              <legend>Daily process</legend>
              ${DAY_RULES.map(([key, label]) => `<label class="check"><input type="checkbox" name="rule-${key}" ${note.rules?.[key] ? "checked" : ""} /><span>${label}</span></label>`).join("")}
            </fieldset>
            <p class="autosave-note">Saves automatically when you leave a field.</p>
          </form>
        </section>
      </div>
      <div class="span-4 stack">
        ${panel({
          title: "Trades this day",
          body: closed.length || opened.length ? `<div class="day-trades">
            ${closed.map((trade) => `<button type="button" class="day-trade" data-open-trade="${trade.id}"><span class="sym-cell"><strong>${escapeHtml(trade.symbol)}</strong><span>${escapeHtml(positionLabel(trade))}</span></span><strong class="${pnlClass(tradePnl(trade))}">${signedMoney(tradePnl(trade))}</strong></button>`).join("")}
            ${opened.map((trade) => `<button type="button" class="day-trade" data-open-trade="${trade.id}"><span class="sym-cell"><strong>${escapeHtml(trade.symbol)}</strong><span>${escapeHtml(positionLabel(trade))}</span></span>${tradeStatusChip(trade)}</button>`).join("")}
          </div>` : `<div class="viz-empty">No trades on this day.</div>`,
        })}
        ${panel({
          title: "Recent days",
          body: recent.length ? `<div class="day-trades">${recent.map((key) => {
            const dayPnl = pnlOnDate(key);
            return `<button type="button" class="day-trade ${key === journalDate ? "is-active" : ""}" data-open-journal="${key}">
              <span class="sym-cell"><strong>${shortDate(key)}</strong><span>${hasDayNote(state.dayNotes[key]) ? "Journal written" : "No entry yet"}</span></span>
              <strong class="${pnlClass(dayPnl)}">${dayPnl ? signedMoney(dayPnl) : ""}</strong>
            </button>`;
          }).join("")}</div>` : `<div class="viz-empty">Nothing yet.</div>`,
        })}
      </div>
    </div>
  `;
}

function renderWeeklyReview() {
  const end = shiftDateKey(journalWeek, 6);
  const trades = closedTrades().filter((trade) => {
    const key = tradeRealizedDate(trade);
    return key >= journalWeek && key <= end;
  });
  const stats = tradeStats(trades);
  const review = state.weeklyReviews[journalWeek] || {};
  const days = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(journalWeek, index);
    return { label: new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }), value: pnlOnDate(key), heading: longDateShort(key), date: key };
  });
  const sorted = [...trades].sort((a, b) => tradePnl(b) - tradePnl(a));
  document.querySelector("#journalMount").innerHTML = `
    <div class="page-bar">
      <div class="month-nav">
        <button class="icon-btn" data-journal-week="-7" type="button" aria-label="Previous week">${icon("left", 16)}</button>
        <h2>${shortDate(journalWeek)} to ${shortDate(end)}</h2>
        <button class="icon-btn" data-journal-week="7" type="button" aria-label="Next week">${icon("right", 16)}</button>
      </div>
    </div>
    <div class="tile-grid">
      ${statTile({ label: "Week P&amp;L", value: signedMoney(stats.total), tone: pnlClass(stats.total), sub: `${stats.count} closed trades` })}
      ${statTile({ label: "Win rate", value: stats.count ? `${number(stats.winRate, 1)}%` : "—", sub: `${stats.winCount} wins · ${stats.lossCount} losses` })}
      ${statTile({ label: "Profit factor", value: stats.profitFactor === null ? "—" : number(stats.profitFactor, 2), sub: `${signedMoney(stats.expectancy)} per trade` })}
      ${statTile({ label: "Best trade", value: sorted[0] ? signedMoney(tradePnl(sorted[0])) : "—", tone: sorted[0] ? pnlClass(tradePnl(sorted[0])) : "", sub: sorted[0] ? escapeHtml(sorted[0].symbol) : "" })}
      ${statTile({ label: "Worst trade", value: sorted.at(-1) ? signedMoney(tradePnl(sorted.at(-1))) : "—", tone: sorted.at(-1) ? pnlClass(tradePnl(sorted.at(-1))) : "", sub: sorted.at(-1) ? escapeHtml(sorted.at(-1).symbol) : "" })}
      ${statTile({ label: "Reviewed", value: `${trades.filter((trade) => trade.reviewed === true).length}/${trades.length}`, sub: "Trades with a review" })}
    </div>
    <div class="grid-12">
      <div class="span-7">
        ${panel({
          title: "Weekly review",
          className: "fill",
          body: `<form class="note-form" data-week-form>
            <label>What worked<textarea name="wins" rows="4" placeholder="Setups and decisions worth repeating">${escapeHtml(review.wins || "")}</textarea></label>
            <label>What to fix<textarea name="lessons" rows="4" placeholder="Mistakes and patterns to stop">${escapeHtml(review.lessons || "")}</textarea></label>
            <label>Focus for next week<textarea name="focus" rows="3" placeholder="One or two concrete commitments">${escapeHtml(review.focus || "")}</textarea></label>
            <p class="autosave-note">Saves automatically when you leave a field.</p>
          </form>`,
        })}
      </div>
      <div class="span-5 stack">
        ${panel({ title: "P&amp;L by day", body: chartSlot({ type: "bars", items: days, height: 190, label: "P&L by day this week" }) })}
        ${panel({ title: "Trades closed", body: trades.length ? `<div class="day-trades">${sorted.map((trade) => `<button type="button" class="day-trade" data-open-trade="${trade.id}"><span class="sym-cell"><strong>${escapeHtml(trade.symbol)}</strong><span>${escapeHtml(positionLabel(trade))}</span></span><strong class="${pnlClass(tradePnl(trade))}">${signedMoney(tradePnl(trade))}</strong></button>`).join("")}</div>` : `<div class="viz-empty">No trades closed this week.</div>` })}
      </div>
    </div>
  `;
}

function renderNotebook() {
  document.querySelector("#journalMount").innerHTML = `
    <div class="grid-12">
      <div class="span-5">
        ${panel({
          title: "New note",
          subtitle: "Lessons and patterns that outlive a single trade.",
          body: `<form class="note-form" id="noteForm">
            <label>Title<input name="title" required autocomplete="off" /></label>
            <label>Note<textarea name="body" rows="6" required></textarea></label>
            <button class="btn btn-primary" type="submit">Add note</button>
          </form>`,
        })}
      </div>
      <div class="span-7">
        <section class="card fill">
          <label class="search-field wide">${icon("search", 15)}<span class="sr-only">Search notes</span><input id="noteSearch" type="search" placeholder="Search notebook" /></label>
          <div id="notesMount" class="notes"></div>
        </section>
      </div>
    </div>
  `;
  const paint = () => {
    const search = document.querySelector("#noteSearch").value.toLowerCase();
    const notes = state.notebook.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(search));
    document.querySelector("#notesMount").innerHTML = notes.map((note) => `
      <article class="note">
        <header><strong>${escapeHtml(note.title)}</strong><span>${shortDate(note.date)}</span><button class="icon-btn" data-delete-note="${note.id}" type="button" aria-label="Delete note">${icon("trash", 14)}</button></header>
        <p>${escapeHtml(note.body)}</p>
      </article>
    `).join("") || `<div class="viz-empty">No notes yet.</div>`;
    document.querySelectorAll("[data-delete-note]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!confirm("Delete this note?")) return;
        state.notebook = state.notebook.filter((note) => note.id !== button.dataset.deleteNote);
        saveState();
        paint();
      });
    });
  };
  document.querySelector("#noteForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.notebook.unshift({ id: crypto.randomUUID(), date: localDateKey(), title: data.title, body: data.body });
    event.currentTarget.reset();
    saveState();
    paint();
    showToast("Note saved");
  });
  document.querySelector("#noteSearch").addEventListener("input", paint);
  paint();
}

function renderPlaybook() {
  const usage = new Map(groupStats(state.trades, (trade) => trade.strategy).map((row) => [row.label, row]));
  const cards = state.strategies.map((strategy, index) => {
    const stats = usage.get(strategy.name);
    if (playbookEditing === index) {
      return `
        <form class="card play-card" data-playbook-form="${index}">
          <label>Name<input name="name" value="${escapeHtml(strategy.name)}" required ${requiredOptionStrategies.includes(strategy.name) ? "readonly" : ""} /></label>
          <label>Rules<textarea name="rules" rows="3">${escapeHtml(strategy.rules || "")}</textarea></label>
          <label>Checklist, one item per line<textarea name="checklist" rows="5">${escapeHtml((strategy.checklist || []).join("\n"))}</textarea></label>
          <div class="review-actions">
            ${requiredOptionStrategies.includes(strategy.name) ? "" : `<button class="btn btn-ghost danger" data-playbook-delete="${index}" type="button">Delete</button>`}
            <button class="btn" data-playbook-cancel type="button">Cancel</button>
            <button class="btn btn-primary" type="submit">Save</button>
          </div>
        </form>
      `;
    }
    return `
      <article class="card play-card">
        <header class="card-head">
          <div><h2>${escapeHtml(strategy.name)}</h2></div>
          <button class="btn btn-sm" data-playbook-edit="${index}" type="button">Edit</button>
        </header>
        <div class="play-stats">
          <span><small>Net P&amp;L</small><strong class="${pnlClass(stats?.total)}">${stats ? signedMoney(stats.total) : "—"}</strong></span>
          <span><small>Trades</small><strong>${stats?.count || 0}</strong></span>
          <span><small>Win rate</small><strong>${stats ? `${number(stats.winRate, 0)}%` : "—"}</strong></span>
          <span><small>Per trade</small><strong>${stats ? signedMoney(stats.expectancy) : "—"}</strong></span>
        </div>
        ${strategy.rules ? `<p class="play-rules">${escapeHtml(strategy.rules)}</p>` : ""}
        ${strategy.checklist?.length ? `<ul class="play-list">${strategy.checklist.map((rule) => `<li>${icon("check", 13)}<span>${escapeHtml(rule)}</span></li>`).join("")}</ul>` : ""}
      </article>
    `;
  }).join("");
  appView.innerHTML = `
    <div class="page-bar">
      <p class="page-note">Your rules for each setup. Checklists appear on the trade review.</p>
      <button class="btn" data-playbook-add type="button">${icon("plus", 14)} New strategy</button>
    </div>
    <div class="play-grid">${cards}</div>
  `;
}
