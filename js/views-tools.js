// Watchlist, calculators and settings.

let watchQuotes = new Map();
let watchLoading = false;
let watchUpdatedAt = null;

async function refreshWatchlist() {
  const symbols = (state.watchlist || []).map((item) => item.symbol);
  if (!symbols.length || watchLoading) return;
  watchLoading = true;
  const results = await Promise.all(symbols.map(async (symbol) => {
    try {
      return [symbol, await fetchLiveQuote({ symbol })];
    } catch {
      return [symbol, null];
    }
  }));
  watchQuotes = new Map(results);
  watchUpdatedAt = new Date();
  watchLoading = false;
  const mount = document.querySelector("#watchMount");
  if (mount) mount.innerHTML = renderWatchTable();
}

function quoteChangePct(quote) {
  if (!quote?.price || !quote.previousClose) return null;
  return ((quote.price - quote.previousClose) / quote.previousClose) * 100;
}

function renderWatchlist() {
  const openSymbols = [...new Set(state.trades.filter(isTradeOpen).map((trade) => String(trade.symbol).toUpperCase()))];
  const listed = new Set((state.watchlist || []).map((item) => item.symbol));
  const missing = openSymbols.filter((symbol) => !listed.has(symbol));
  appView.innerHTML = `
    <section class="card">
      <form class="filter-bar" id="watchForm">
        <label class="search-field">${icon("plus", 15)}
          <span class="sr-only">Ticker to add</span>
          <input name="symbol" placeholder="Add ticker, for example NVDA" autocomplete="off" spellcheck="false" required />
        </label>
        <button class="btn btn-primary" type="submit">Add</button>
        ${missing.length ? `<button class="btn" data-watch-import type="button">Add ${missing.length} open position${missing.length === 1 ? "" : "s"}</button>` : ""}
      </form>
      <div id="watchMount">${renderWatchTable()}</div>
    </section>
  `;
  document.querySelector("#watchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.symbol;
    addWatchSymbols([input.value]);
    input.value = "";
  });
  document.querySelector("[data-watch-import]")?.addEventListener("click", () => addWatchSymbols(missing));
  refreshWatchlist();
}

function addWatchSymbols(symbols) {
  const existing = new Set(state.watchlist.map((item) => item.symbol));
  symbols.map((symbol) => String(symbol).trim().toUpperCase()).filter((symbol) => /^[A-Z0-9.^=$-]{1,12}$/.test(symbol) && !existing.has(symbol)).forEach((symbol) => {
    state.watchlist.push({ symbol, above: 0, below: 0, note: "" });
  });
  saveState();
  renderWatchlist();
}

function renderWatchTable() {
  const items = state.watchlist || [];
  if (!items.length) return emptyBlock("Your watchlist is empty", "Add tickers to track price, daily change and your own alert levels.");
  const results = new Map(groupStats(state.trades, (trade) => String(trade.symbol).toUpperCase()).map((row) => [row.label, row]));
  const open = new Set(state.trades.filter(isTradeOpen).map((trade) => String(trade.symbol).toUpperCase()));
  return `
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Ticker</th><th class="num">Last</th><th class="num">Change</th><th class="num">Alert above</th><th class="num">Alert below</th><th>Note</th><th class="num">Your P&amp;L</th><th>Research</th><th><span class="sr-only">Remove</span></th></tr></thead>
      <tbody>${items.map((item, index) => {
        const quote = watchQuotes.get(item.symbol);
        const change = quoteChangePct(quote);
        const hitAbove = item.above && quote?.price >= item.above;
        const hitBelow = item.below && quote?.price && quote.price <= item.below;
        const realized = results.get(item.symbol);
        return `<tr class="${hitAbove || hitBelow ? "row-hit" : ""}">
          <td><div class="watch-sym"><strong>${escapeHtml(item.symbol)}</strong>${open.has(item.symbol) ? statusChip("Open", "accent") : ""}${hitAbove || hitBelow ? statusChip("Alert hit", "warn") : ""}</div></td>
          <td class="num">${quote?.price ? money(quote.price) : `<span class="muted">${watchLoading ? "…" : "—"}</span>`}</td>
          <td class="num">${change === null ? `<span class="muted">—</span>` : `<span class="${pnlClass(change)}">${signedPercent(change, 2)}</span>`}</td>
          <td class="num"><input class="cell-input" type="number" step="0.01" data-watch-field="above" data-index="${index}" value="${item.above || ""}" aria-label="${escapeHtml(item.symbol)} alert above" /></td>
          <td class="num"><input class="cell-input" type="number" step="0.01" data-watch-field="below" data-index="${index}" value="${item.below || ""}" aria-label="${escapeHtml(item.symbol)} alert below" /></td>
          <td><input class="cell-input wide" type="text" data-watch-field="note" data-index="${index}" value="${escapeHtml(item.note || "")}" aria-label="${escapeHtml(item.symbol)} note" /></td>
          <td class="num">${realized ? `<button class="link-btn ${pnlClass(realized.total)}" data-filter-symbol="${escapeHtml(item.symbol)}" type="button">${signedMoney(realized.total)}</button>` : `<span class="muted">—</span>`}</td>
          <td class="nowrap">
            <button class="btn btn-sm" data-research="flow" data-symbol="${escapeHtml(item.symbol)}" type="button">Flow</button>
            <button class="btn btn-sm" data-research="gex" data-symbol="${escapeHtml(item.symbol)}" type="button">GEX</button>
            <button class="btn btn-sm" data-research="volatility" data-symbol="${escapeHtml(item.symbol)}" type="button">IV</button>
          </td>
          <td><button class="icon-btn" data-watch-remove="${index}" type="button" aria-label="Remove ${escapeHtml(item.symbol)}">${icon("close", 14)}</button></td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
    <p class="table-more">Delayed quotes${watchUpdatedAt ? `, updated ${watchUpdatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}. Alert levels highlight here while this page is open.</p>
  `;
}

// Each calculator: inputs with defaults, and a pure compute() returning rows.
const CALCULATORS = [
  {
    id: "sizer",
    title: "Position size",
    subtitle: "Shares to buy so a stop-out costs what you planned.",
    fields: () => [
      ["account", "Account $", Math.round(accountBalance()) || 10000],
      ["riskPct", "Risk per trade %", 1],
      ["entry", "Entry $", 100],
      ["stop", "Stop $", 95],
    ],
    compute: ({ account, riskPct, entry, stop }) => {
      const riskDollars = (account * riskPct) / 100;
      const perShare = Math.abs(entry - stop);
      if (!perShare) return [["Enter a stop that differs from entry", ""]];
      const shares = Math.floor(riskDollars / perShare);
      return [
        ["Shares", number(shares, 0), true],
        ["Dollar risk", money(shares * perShare)],
        ["Position value", money(shares * entry)],
        ["Share of account", account ? `${number(((shares * entry) / account) * 100, 1)}%` : "—"],
      ];
    },
  },
  {
    id: "premium",
    title: "Premium yield",
    subtitle: "Return, breakeven and cushion on a cash-secured put.",
    fields: () => [
      ["strike", "Strike $", 100],
      ["premium", "Credit $", 1.5],
      ["dte", "Days to expiry", 30],
      ["spot", "Stock price $", 105],
      ["contracts", "Contracts", 1],
    ],
    compute: ({ strike, premium, dte, spot, contracts }) => {
      const collateral = strike * 100 * contracts;
      const yieldPct = strike ? (premium / strike) * 100 : 0;
      const breakeven = strike - premium;
      return [
        ["Annualized return", `${number((yieldPct * 365) / Math.max(1, dte), 1)}%`, true],
        ["Return if it expires", `${number(yieldPct, 2)}%`],
        ["Premium", money(premium * 100 * contracts)],
        ["Collateral", money(collateral)],
        ["Breakeven", money(breakeven)],
        ["Cushion to breakeven", spot ? `${number(((spot - breakeven) / spot) * 100, 1)}%` : "—"],
      ];
    },
  },
  {
    id: "spread",
    title: "Credit spread",
    subtitle: "Risk, reward and the win rate needed to break even.",
    fields: () => [
      ["shortStrike", "Short strike $", 100],
      ["longStrike", "Long strike $", 95],
      ["credit", "Net credit $", 1.25],
      ["contracts", "Contracts", 1],
    ],
    compute: ({ shortStrike, longStrike, credit, contracts }) => {
      const width = Math.abs(shortStrike - longStrike);
      const maxLoss = Math.max(0, width - credit);
      if (!width) return [["Enter two different strikes", ""]];
      return [
        ["Return on risk", maxLoss ? `${number((credit / maxLoss) * 100, 1)}%` : "—", true],
        ["Max profit", money(credit * 100 * contracts)],
        ["Max loss", money(maxLoss * 100 * contracts)],
        ["Breakeven win rate", `${number((maxLoss / width) * 100, 1)}%`],
      ];
    },
  },
  {
    id: "recovery",
    title: "Compounding and recovery",
    subtitle: "Where a steady return leads, and what a loss takes to repair.",
    fields: () => [
      ["balance", "Balance $", Math.round(accountBalance()) || 10000],
      ["monthly", "Monthly return %", 2],
      ["months", "Months", 12],
      ["loss", "Drawdown %", 20],
    ],
    compute: ({ balance, monthly, months, loss }) => {
      const future = balance * (1 + monthly / 100) ** months;
      return [
        ["Projected balance", money(future), true],
        ["Projected gain", signedMoney(future - balance)],
        ["Gain needed after drawdown", loss >= 100 ? "—" : `${number((loss / (100 - loss)) * 100, 1)}%`],
        ["Months to recover", loss >= 100 || monthly <= 0 ? "—" : number(Math.log(100 / (100 - loss)) / Math.log(1 + monthly / 100), 1)],
      ];
    },
  },
];

function calculatorResults(calculator, values) {
  return calculator.compute(values).map(([label, value, primary]) => `
    <div class="${primary ? "calc-primary" : "calc-row"}"><span>${label}</span><strong>${value}</strong></div>
  `).join("");
}

function renderTools() {
  appView.innerHTML = `<div class="grid-12">${CALCULATORS.map((calculator) => {
    const fields = calculator.fields();
    const values = Object.fromEntries(fields.map(([key, , value]) => [key, Number(value)]));
    return `<div class="span-6">${panel({
      title: calculator.title,
      subtitle: calculator.subtitle,
      className: "fill",
      body: `<form class="calc" data-calculator="${calculator.id}">
        <div class="calc-inputs">${fields.map(([key, label, value]) => `<label>${label}<input name="${key}" type="number" step="any" value="${value}" /></label>`).join("")}</div>
        <div class="calc-output" data-calc-output aria-live="polite">${calculatorResults(calculator, values)}</div>
      </form>`,
    })}</div>`;
  }).join("")}</div>`;
  document.querySelectorAll("[data-calculator]").forEach((form) => {
    const calculator = CALCULATORS.find((item) => item.id === form.dataset.calculator);
    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("input", () => {
      const values = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, Number(value) || 0]));
      form.querySelector("[data-calc-output]").innerHTML = calculatorResults(calculator, values);
    });
  });
}

function renderSettings() {
  const settings = state.settings;
  const flows = [...(state.cashflows || [])].sort((a, b) => b.date.localeCompare(a.date));
  const field = (name, label, value, hint = "", attrs = `type="number" step="0.01" min="0"`) => `
    <label>${label}<input name="${name}" ${attrs} value="${escapeHtml(value ?? "")}" />${hint ? `<small>${hint}</small>` : ""}</label>
  `;
  appView.innerHTML = `
    <div class="grid-12">
      <div class="span-6">${panel({
        title: "Account",
        className: "fill",
        body: `<form class="settings-form" id="settingsForm">
          ${field("accountName", "Account name", settings.accountName || "", "", `type="text" autocomplete="off"`)}
          ${field("startingBalance", "Starting balance $", settings.startingBalance || 0)}
          ${field("monthlyGoal", "Monthly P&amp;L goal $", settings.monthlyGoal || "", "Shown on the dashboard and calendar.")}
          <h3 class="sub-head">Risk limits</h3>
          <div class="form-row">
            ${field("maxDailyLoss", "Max daily loss $", settings.maxDailyLoss || "")}
            ${field("maxDeployedPct", "Max capital deployed %", settings.maxDeployedPct || "")}
          </div>
          <div class="form-row">
            ${field("maxPositionPct", "Max per ticker %", settings.maxPositionPct || "")}
            ${field("profitTargetPct", "Premium profit target %", settings.profitTargetPct || "", "Flags short options ready to close.")}
          </div>
          <div class="review-actions"><button class="btn btn-primary" type="submit">Save settings</button></div>
        </form>`,
      })}</div>
      <div class="span-6">${panel({
        title: "Deposits and withdrawals",
        subtitle: "Cash flows move the balance without counting as P&amp;L.",
        className: "fill",
        body: `<form class="flow-form" id="cashflowForm">
          <label>Date<input name="date" type="date" value="${localDateKey()}" required /></label>
          <label>Amount $<input name="amount" type="number" step="0.01" placeholder="Minus to withdraw" required /></label>
          <label>Note<input name="note" type="text" autocomplete="off" /></label>
          <button class="btn" type="submit">Add</button>
        </form>
        ${flows.length ? `<div class="table-scroll"><table class="data-table">
          <thead><tr><th>Date</th><th>Note</th><th class="num">Amount</th><th><span class="sr-only">Remove</span></th></tr></thead>
          <tbody>${flows.map((flow) => `<tr><td class="nowrap">${longDateShort(flow.date)}</td><td>${escapeHtml(flow.note || "")}</td><td class="num">${signedMoney(Number(flow.amount))}</td><td><button class="icon-btn" data-remove-flow="${flow.id}" type="button" aria-label="Remove cash flow">${icon("trash", 14)}</button></td></tr>`).join("")}</tbody>
        </table></div>` : `<div class="viz-empty">No cash flows logged.</div>`}`,
      })}</div>
      <div class="span-12">${panel({
        title: "Data",
        subtitle: "JSON keeps every field. CSV is for spreadsheets. The server also keeps automatic backups in the data folder.",
        body: `<div class="data-actions">
          <button class="btn" id="exportButton" type="button">${icon("download", 14)} Export JSON</button>
          <label class="btn btn-file">${icon("upload", 14)} Import JSON<input id="importInput" type="file" accept="application/json" /></label>
          <button class="btn" id="exportCsvButton" type="button">${icon("download", 14)} Export CSV</button>
          <button class="btn" id="importCsvButton" type="button">${icon("upload", 14)} Import CSV</button>
        </div>
        <details class="danger-zone">
          <summary>Danger zone</summary>
          <p>These replace everything in the current journal. Export a backup first.</p>
          <div class="data-actions">
            <button class="btn danger" id="blankJournalButton" type="button">Start a blank journal</button>
            <button class="btn danger" id="resetSampleButton" type="button">Replace with sample data</button>
          </div>
        </details>`,
      })}</div>
    </div>
  `;
  document.querySelector("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.settings = {
      ...state.settings,
      accountName: data.accountName,
      startingBalance: Number(data.startingBalance || 0),
      monthlyGoal: Number(data.monthlyGoal || 0),
      maxDailyLoss: Number(data.maxDailyLoss || 0),
      maxDeployedPct: Number(data.maxDeployedPct || 0),
      maxPositionPct: Number(data.maxPositionPct || 0),
      profitTargetPct: Number(data.profitTargetPct || 0),
    };
    saveState();
    showToast("Settings saved");
    render();
  });
  document.querySelector("#cashflowForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const amount = Number(data.amount);
    if (!amount) {
      showToast("Enter an amount other than zero");
      return;
    }
    state.cashflows.push({ id: crypto.randomUUID(), date: data.date, amount, note: data.note });
    saveState();
    showToast("Cash flow added");
    render();
  });
  document.querySelector("#exportButton").addEventListener("click", exportData);
  document.querySelector("#importInput").addEventListener("change", importData);
  document.querySelector("#exportCsvButton").addEventListener("click", () => exportCsv());
  document.querySelector("#importCsvButton").addEventListener("click", importCsv);
  document.querySelector("#blankJournalButton").addEventListener("click", () => {
    if (!confirm("Start a blank journal? This removes every trade in the current journal. Export a backup first if you need this data.")) return;
    state = normalizeState(createBlankState(activeJournal()[1]));
    selectedTradeId = null;
    saveState();
    showToast("Blank journal created");
    render();
  });
  document.querySelector("#resetSampleButton").addEventListener("click", () => {
    if (!confirm("Replace this journal with sample data? This removes every trade in the current journal.")) return;
    state = normalizeState(createDefaultState());
    selectedTradeId = null;
    saveState();
    showToast("Sample data restored");
    render();
  });
}
