// Dashboard, open positions and risk: the views that follow live prices.

let dashRange = readPref("personal-trading-journal-dash-range", "3M");
let positionSort = { key: "dte", dir: 1 };
const STRESS_SHOCKS = [-30, -20, -10, -5, 5, 10];

const liveRenderers = {
  dashTiles: renderDashTiles,
  dashAlerts: renderAlertList,
  dashPositions: () => renderPositionTable({ compact: true }),
  positionTiles: renderPositionTiles,
  positionTable: () => renderPositionTable({}),
  positionExposure: renderExposure,
  positionLadder: renderExpirationLadder,
  riskGuards: renderRiskGuards,
  riskAlerts: renderAlertList,
  riskStress: renderStressTest,
};

function updateLiveMounts() {
  document.querySelectorAll("[data-live]").forEach((mount) => {
    const renderer = liveRenderers[mount.dataset.live];
    if (renderer) mount.innerHTML = renderer();
  });
  document.querySelectorAll("[data-live-stamp]").forEach((element) => {
    element.textContent = liveQuotesLoading ? "Refreshing quotes…" : liveQuoteTimestamp();
    element.classList.toggle("is-loading", liveQuotesLoading);
  });
  updateSidebar();
}

function liveStatus() {
  return `
    <div class="live-status">
      <span class="live-dot" aria-hidden="true"></span>
      <span data-live-stamp class="${liveQuotesLoading ? "is-loading" : ""}">${liveQuotesLoading ? "Refreshing quotes…" : liveQuoteTimestamp()}</span>
      <button class="icon-btn" data-refresh-quotes type="button" aria-label="Refresh prices" title="Refresh prices">${icon("refresh", 14)}</button>
    </div>
  `;
}

function renderDashboard() {
  const series = seriesInRange(dashRange);
  appView.innerHTML = `
    <div class="page-bar">
      ${segmentedControl("dash-range", RANGE_OPTIONS, dashRange, "Date range")}
      ${liveStatus()}
    </div>
    <div class="tile-grid" data-live="dashTiles">${renderDashTiles()}</div>
    <div class="grid-12">
      <div class="span-8">${renderEquityPanel(series)}</div>
      <div class="span-4">
        ${panel({
          title: "Needs attention",
          subtitle: "Expirations, short strikes, targets and limits.",
          className: "fill",
          body: `<div data-live="dashAlerts" class="scroll-area">${renderAlertList()}</div>`,
        })}
      </div>
      <div class="span-8">
        ${panel({
          title: "Open positions",
          actions: `<button class="btn" data-view-link="positions" type="button">All positions</button>`,
          body: `<div data-live="dashPositions">${renderPositionTable({ compact: true })}</div>`,
        })}
      </div>
      <div class="span-4">${renderMonthPanel()}</div>
      <div class="span-8">${renderDailyPanel()}</div>
      <div class="span-4">${renderSymbolPanel()}</div>
      <div class="span-12">
        ${panel({
          title: "Recent trades",
          actions: `<button class="btn" data-view-link="trades" type="button">Trade log</button>`,
          body: renderTradeRows(recentTrades(8)),
        })}
      </div>
    </div>
  `;
}

function recentTrades(limit) {
  return [...state.trades]
    .sort((a, b) => `${tradeRealizedDate(b) || b.date}${b.exitTime || b.entryTime}`.localeCompare(`${tradeRealizedDate(a) || a.date}${a.exitTime || a.entryTime}`))
    .slice(0, limit);
}

function renderDashTiles() {
  const stats = tradeStats(closedInRange(dashRange));
  const live = livePositionSummary();
  const balance = accountBalance();
  const rows = positionRows();
  const deployed = rows.reduce((sum, row) => sum + row.capital, 0);
  const equityValues = equitySeries().map((row) => row.equity).slice(-60);
  const base = capitalBase();
  return [
    statTile({
      label: "Net liquidation",
      value: money(balance + live.total),
      sub: `${money(balance)} realized balance`,
      spark: sparkline(equityValues),
    }),
    statTile({
      label: `Realized · ${dashRange === "ALL" ? "All" : dashRange}`,
      value: signedMoney(stats.total),
      tone: pnlClass(stats.total),
      sub: base ? `${signedPercent((stats.total / base) * 100, 2)} on ${money(base)} capital` : `${stats.count} closed trades`,
    }),
    statTile({
      label: "Unrealized",
      value: live.priced.length ? signedMoney(live.total) : "—",
      tone: pnlClass(live.total),
      sub: `${live.priced.length}/${live.positions.length} positions priced`,
    }),
    statTile({
      label: "Win rate",
      value: stats.count ? `${number(stats.winRate, 1)}%` : "—",
      sub: `${stats.winCount} wins · ${stats.lossCount} losses`,
    }),
    statTile({
      label: "Profit factor",
      value: stats.profitFactor === null ? "—" : number(stats.profitFactor, 2),
      sub: stats.count ? `${signedMoney(stats.expectancy)} per trade` : "No closed trades",
    }),
    statTile({
      label: "Capital deployed",
      value: balance > 0 ? `${number((deployed / balance) * 100, 0)}%` : "—",
      sub: `${compactMoney(deployed)} of ${compactMoney(balance)}`,
      meter: balance > 0 ? (deployed / balance) * 100 : 0,
    }),
  ].join("");
}

function renderEquityPanel(series) {
  const first = series[0];
  const last = series.at(-1);
  const change = first && last ? series.reduce((sum, row) => sum + row.pnl, 0) : 0;
  const worst = maxDrawdownOf(series);
  const points = series.map((row) => ({
    date: row.date,
    value: row.equity,
    rows: [
      { value: money(row.equity), label: "Balance" },
      { value: signedMoney(row.pnl), label: "Day P&L", tone: pnlClass(row.pnl) },
      ...(row.flow ? [{ value: signedMoney(row.flow), label: "Cash flow" }] : []),
      { value: money(row.drawdown), label: "From peak", tone: row.drawdown < 0 ? "negative" : "" },
    ],
  }));
  return panel({
    title: "Equity curve",
    subtitle: `Realized balance, ${rangeLabel(dashRange)}.`,
    actions: `<div class="inline-stats">
      <span>Change <strong class="${pnlClass(change)}">${signedMoney(change)}</strong></span>
      <span>Max drawdown <strong class="${worst.drawdown < 0 ? "negative" : ""}">${money(worst.drawdown)}</strong></span>
    </div>`,
    className: "fill",
    body: chartSlot({ type: "area", points, height: 300, label: `Equity curve for the ${rangeLabel(dashRange)}`, empty: "Close a trade in this period to draw the curve." }),
  });
}

function renderDailyPanel() {
  const series = seriesInRange(dashRange).filter((row) => row.trades).slice(-60);
  const items = series.map((row) => ({
    label: shortDate(row.date),
    value: row.pnl,
    date: row.date,
    heading: longDateShort(row.date),
    rows: [
      { value: signedMoney(row.pnl), label: "P&L", tone: pnlClass(row.pnl) },
      { value: String(row.trades), label: row.trades === 1 ? "trade closed" : "trades closed" },
    ],
  }));
  const green = series.filter((row) => row.pnl > 0).length;
  return panel({
    title: "Daily P&L",
    subtitle: series.length ? `${green} of ${series.length} sessions were green. Click a bar to open that day.` : "",
    className: "fill",
    body: chartSlot({ type: "bars", items, height: 300, label: "Daily realized P&L", onClick: (item) => openDayInCalendar(item.date), clickable: true }),
  });
}

function renderMonthPanel() {
  const now = new Date();
  const monthKey = localDateKey().slice(0, 7);
  const monthTrades = closedTrades().filter((trade) => tradeRealizedDate(trade).startsWith(monthKey));
  const stats = tradeStats(monthTrades);
  const goal = riskLimits().monthlyGoal;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const pnlByDay = new Map();
  monthTrades.forEach((trade) => pnlByDay.set(tradeRealizedDate(trade), (pnlByDay.get(tradeRealizedDate(trade)) || 0) + tradePnl(trade)));
  const maxAbs = Math.max(1, ...[...pnlByDay.values()].map(Math.abs));
  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
    const pnl = pnlByDay.get(key);
    const heat = pnl === undefined ? "" : `--heat:${(0.18 + (Math.abs(pnl) / maxAbs) * 0.72).toFixed(2)}`;
    return `<button type="button" class="mini-day ${pnl === undefined ? "" : pnl >= 0 ? "gain" : "loss"} ${key === localDateKey() ? "is-today" : ""}" style="${heat}" data-open-day="${key}" ${pnl === undefined ? "" : `data-tip="${shortDate(key)}: ${signedMoney(pnl)}"`} aria-label="${shortDate(key)}${pnl === undefined ? "" : ` ${signedMoney(pnl)}`}">${index + 1}</button>`;
  }).join("");
  return panel({
    title: now.toLocaleDateString(undefined, { month: "long" }),
    subtitle: `${stats.count} closed trades · ${number(stats.winRate, 0)}% wins`,
    actions: `<strong class="head-value ${pnlClass(stats.total)}">${signedMoney(stats.total)}</strong>`,
    className: "fill",
    body: `
      <div class="mini-cal">
        ${["S", "M", "T", "W", "T", "F", "S"].map((day) => `<span>${day}</span>`).join("")}
        ${offset ? `<i style="grid-column:span ${offset}"></i>` : ""}
        ${cells}
      </div>
      <div class="stat-lines month-facts">
        ${statLine("Green days", `${stats.greenDays} of ${stats.tradingDays}`)}
        ${statLine("Best day", stats.bestDay[0] ? `${signedMoney(stats.bestDay[1])} · ${shortDate(stats.bestDay[0])}` : "—")}
        ${statLine("Worst day", stats.worstDay[0] ? `${signedMoney(stats.worstDay[1])} · ${shortDate(stats.worstDay[0])}` : "—")}
      </div>
      ${goal ? `
        <div class="goal">
          <div class="goal-row"><span>Monthly goal</span><strong>${money(stats.total)} / ${money(goal)}</strong></div>
          <div class="meter"><span style="width:${Math.max(0, Math.min(100, (stats.total / goal) * 100))}%"></span></div>
        </div>
      ` : `<button class="link-btn" data-view-link="settings" type="button">Set a monthly goal</button>`}
    `,
  });
}

function renderSymbolPanel() {
  const rows = groupStats(closedInRange(dashRange), (trade) => String(trade.symbol).toUpperCase());
  const picks = rows.length > 8 ? [...rows.slice(0, 4), ...rows.slice(-4)] : rows;
  return panel({
    title: "Best and worst tickers",
    subtitle: `Realized P&L, ${rangeLabel(dashRange)}.`,
    className: "fill",
    body: rankBars(picks.map((row) => ({ label: row.label, value: row.total, count: row.count, winRate: row.winRate })), {
      meta: (row) => `${row.count} trade${row.count === 1 ? "" : "s"} · ${number(row.winRate, 0)}%`,
      format: (value) => signedMoney(Math.round(value)).replace(".00", ""),
      onClickAttr: (row) => `data-filter-symbol="${escapeHtml(row.label)}" role="button" tabindex="0"`,
    }),
  });
}

function renderAlertList() {
  const alerts = buildAlerts();
  if (!alerts.length) {
    return `<div class="all-clear">${icon("check", 18)}<div><strong>All clear</strong><span>Nothing on the book needs a decision.</span></div></div>`;
  }
  const iconFor = { critical: "critical", warning: "alert", info: "info" };
  const labelFor = { critical: "Act now", warning: "Watch", info: "Opportunity" };
  return `<ul class="alert-list">${alerts.map((alert) => `
    <li class="alert ${alert.level}" ${alert.tradeId ? `data-open-trade="${alert.tradeId}" role="button" tabindex="0"` : ""}>
      <span class="alert-icon">${icon(iconFor[alert.level], 16)}</span>
      <div>
        <small>${labelFor[alert.level]}</small>
        <strong>${escapeHtml(alert.title)}</strong>
        <span>${escapeHtml(alert.detail)}</span>
      </div>
    </li>
  `).join("")}</ul>`;
}

function renderPositions() {
  appView.innerHTML = `
    <div class="page-bar">
      <p class="page-note">Delayed quotes. Option marks use the bid/ask midpoint when available.</p>
      ${liveStatus()}
    </div>
    <div class="tile-grid" data-live="positionTiles">${renderPositionTiles()}</div>
    <div class="grid-12">
      <div class="span-12">${panel({ title: "Open book", body: `<div data-live="positionTable">${renderPositionTable({})}</div>` })}</div>
      <div class="span-6">${panel({ title: "Capital by ticker", subtitle: "Collateral, share cost, debit or spread max loss.", className: "fill", body: `<div data-live="positionExposure">${renderExposure()}</div>` })}</div>
      <div class="span-6">${panel({ title: "Expiration ladder", subtitle: "Every option position by its next expiration.", className: "fill", body: `<div data-live="positionLadder">${renderExpirationLadder()}</div>` })}</div>
    </div>
  `;
}

function renderPositionTiles() {
  const rows = positionRows();
  const live = livePositionSummary();
  const balance = accountBalance();
  const deployed = rows.reduce((sum, row) => sum + row.capital, 0);
  const premium = rows.reduce((sum, row) => sum + premiumCollected(row.trade), 0);
  const next = rows.filter((row) => row.dte !== null && row.dte >= 0).sort((a, b) => a.dte - b.dte)[0];
  return [
    statTile({ label: "Open positions", value: String(rows.length), sub: `${exposureBySymbol(rows).length} tickers` }),
    statTile({ label: "Unrealized", value: live.priced.length ? signedMoney(live.total) : "—", tone: pnlClass(live.total), sub: `${live.priced.length}/${rows.length} priced` }),
    statTile({ label: "Capital deployed", value: money(deployed), sub: balance > 0 ? `${number((deployed / balance) * 100, 0)}% of the account` : "", meter: balance > 0 ? (deployed / balance) * 100 : 0 }),
    statTile({ label: "Available", value: money(Math.max(0, balance - deployed)), sub: "Balance less capital deployed" }),
    statTile({ label: "Open premium", value: money(premium), sub: "Sold on open short options" }),
    statTile({ label: "Next expiration", value: next ? `${next.dte}d` : "—", sub: next ? `${escapeHtml(next.trade.symbol)} · ${shortDate(next.expiration)}` : "No dated positions" }),
  ].join("");
}

function sortPositionRows(rows) {
  const { key, dir } = positionSort;
  const value = (row) => ({
    symbol: String(row.trade.symbol),
    capital: row.capital,
    pnl: row.pnl ?? -Infinity,
    dte: row.dte ?? Infinity,
    cushion: row.cushion ?? Infinity,
    captured: row.captured ?? -Infinity,
  }[key]);
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    return (typeof left === "string" ? left.localeCompare(right) : left - right) * dir;
  });
}

function sortHeader(key, label, numeric = true) {
  const active = positionSort.key === key;
  return `<th class="${numeric ? "num" : ""}" aria-sort="${active ? (positionSort.dir > 0 ? "ascending" : "descending") : "none"}"><button class="th-sort ${active ? "active" : ""}" data-position-sort="${key}" type="button">${label}${active ? `<i>${positionSort.dir > 0 ? "↑" : "↓"}</i>` : ""}</button></th>`;
}

function canRoll(trade) {
  return isOptionTrade(trade) && isShortPremium(trade) && !isCreditSpreadStrategy(trade.strategy);
}

function renderPositionTable({ compact = false }) {
  const rows = sortPositionRows(positionRows());
  if (!rows.length) return emptyBlock("No open positions", "Log a trade and it will appear here with live valuation.");
  const shown = compact ? rows.slice(0, 6) : rows;
  const body = shown.map((row) => {
    const { trade, quote, pnl, capital, dte, cushion, captured, mark, spot, accountPct } = row;
    const basis = isAssignedShareLot(trade) ? assignedShareCostBasis(trade) : Number(trade.entry || 0);
    return `
      <tr class="row-link" data-open-trade="${trade.id}" tabindex="0">
        <td><div class="sym-cell"><strong>${escapeHtml(trade.symbol)}</strong><span>${escapeHtml(positionLabel(trade))}</span></div></td>
        ${compact ? "" : `<td><span class="muted">${escapeHtml(trade.strategy)}</span></td>`}
        <td class="num">${money(basis)}</td>
        <td class="num">${mark ? money(mark) : quote?.status === "unavailable" ? `<span class="muted" title="Quote unavailable">n/a</span>` : `<span class="muted">—</span>`}</td>
        ${compact ? "" : `<td class="num">${spot ? money(spot) : `<span class="muted">—</span>`}</td>`}
        <td class="num">${cushion === null ? `<span class="muted">—</span>` : `<span class="${cushion < -0.05 ? "negative" : cushion < 3 ? "warn-text" : ""}">${Math.abs(cushion) < 0.05 ? "At strike" : signedPercent(cushion, 1)}</span>`}</td>
        <td class="num">${dteChip(dte)}</td>
        ${compact ? "" : `<td class="num">${money(capital)}<small class="cell-sub">${number(accountPct, 1)}%</small></td>`}
        ${compact ? "" : `<td class="num">${captured === null ? `<span class="muted">—</span>` : `${number(captured, 0)}%`}</td>`}
        <td class="num"><strong class="${pnl === null ? "" : pnlClass(pnl)}">${pnl === null ? "—" : signedMoney(pnl)}</strong></td>
        ${compact ? "" : `<td class="row-actions">
          ${canRoll(trade) ? `<button class="btn btn-sm" data-roll-trade="${trade.id}" type="button">Roll</button>` : ""}
          <button class="btn btn-sm" data-close-trade="${trade.id}" type="button">Close</button>
        </td>`}
      </tr>
    `;
  }).join("");
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>
          ${sortHeader("symbol", "Position", false)}
          ${compact ? "" : `<th>Strategy</th>`}
          <th class="num">Basis</th>
          <th class="num">Mark</th>
          ${compact ? "" : `<th class="num">Underlying</th>`}
          ${sortHeader("cushion", "Cushion")}
          ${sortHeader("dte", "DTE")}
          ${compact ? "" : sortHeader("capital", "Capital")}
          ${compact ? "" : sortHeader("captured", "Captured")}
          ${sortHeader("pnl", "Unrealized")}
          ${compact ? "" : `<th><span class="sr-only">Actions</span></th>`}
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    ${compact && rows.length > shown.length ? `<p class="table-more">${rows.length - shown.length} more open. <button class="link-btn" data-view-link="positions" type="button">See all</button></p>` : ""}
  `;
}

function renderExposure() {
  const rows = exposureBySymbol();
  const balance = accountBalance();
  return rows.length
    ? rankBars(rows.filter((row) => row.capital > 0).map((row) => ({ label: row.symbol, value: row.capital, count: row.count })), {
      neutral: true,
      format: money,
      meta: (row) => `${balance > 0 ? number((row.value / balance) * 100, 1) : 0}% of account`,
    })
    : `<div class="viz-empty">No capital deployed.</div>`;
}

function renderExpirationLadder() {
  const rows = positionRows().filter((row) => row.expiration).sort((a, b) => a.expiration.localeCompare(b.expiration));
  if (!rows.length) return `<div class="viz-empty">No dated positions.</div>`;
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.expiration)) groups.set(row.expiration, []);
    groups.get(row.expiration).push(row);
  });
  return `<div class="ladder">${[...groups.entries()].map(([date, items]) => `
    <div class="ladder-row">
      <div class="ladder-date"><strong>${shortDate(date)}</strong>${dteChip(items[0].dte)}</div>
      <div class="ladder-items">${items.map((row) => `
        <button type="button" class="ladder-item" data-open-trade="${row.trade.id}"><strong>${escapeHtml(row.trade.symbol)}</strong><span>${escapeHtml(positionLabel(row.trade))}</span></button>
      `).join("")}</div>
    </div>
  `).join("")}</div>`;
}

function renderRisk() {
  const series = equitySeries();
  const worst = maxDrawdownOf(series);
  const current = series.at(-1);
  const stats = tradeStats(state.trades);
  const limits = riskLimits();
  const breaches = limits.maxDailyLoss
    ? series.filter((row) => row.trades && row.pnl <= -limits.maxDailyLoss).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const byStrategy = new Map();
  positionRows().forEach((row) => byStrategy.set(row.trade.strategy, (byStrategy.get(row.trade.strategy) || 0) + row.capital));
  appView.innerHTML = `
    <div class="page-bar">
      <p class="page-note">Limits are set in <button class="link-btn" data-view-link="settings" type="button">Settings</button>.</p>
      ${liveStatus()}
    </div>
    <div class="tile-grid">
      ${statTile({ label: "Max drawdown", value: money(worst.drawdown), tone: worst.drawdown < 0 ? "negative" : "", sub: worst.date ? `${number(worst.drawdownPct, 2)}% on ${shortDate(worst.date)}` : "None so far" })}
      ${statTile({ label: "From peak now", value: money(current?.drawdown || 0), tone: current?.drawdown < 0 ? "negative" : "", sub: current ? `${number(current.drawdownPct, 2)}% below the high` : "No history" })}
      ${statTile({ label: "Worst day", value: money(stats.worstDay[1]), tone: stats.worstDay[1] < 0 ? "negative" : "", sub: stats.worstDay[0] ? shortDate(stats.worstDay[0]) : "—" })}
      ${statTile({ label: "Largest loss", value: money(stats.largestLoss), tone: stats.largestLoss < 0 ? "negative" : "", sub: "Single closed trade" })}
      ${statTile({ label: "Avg loss / win", value: stats.avgWin ? number(stats.avgLoss / stats.avgWin, 2) : "—", sub: `${money(stats.avgLoss)} vs ${money(stats.avgWin)}` })}
      ${statTile({ label: "Loss limit breaches", value: limits.maxDailyLoss ? String(breaches.length) : "Off", sub: limits.maxDailyLoss ? `Days past ${money(limits.maxDailyLoss)}` : "Set a max daily loss" })}
    </div>
    <div class="grid-12">
      <div class="span-5">${panel({ title: "Limits today", className: "fill", body: `<div data-live="riskGuards">${renderRiskGuards()}</div>` })}</div>
      <div class="span-7">${panel({ title: "Needs attention", className: "fill", body: `<div data-live="riskAlerts" class="scroll-area">${renderAlertList()}</div>` })}</div>
      <div class="span-12">${panel({
        title: "Stress test",
        subtitle: "Estimated P&L from your entry prices if every underlying moved this far, with options at intrinsic value. Long-dated options would hold extra time value.",
        body: `<div data-live="riskStress">${renderStressTest()}</div>`,
      })}</div>
      <div class="span-8">${panel({
        title: "Drawdown",
        subtitle: "Distance below the running equity high. Cash flows are excluded.",
        className: "fill",
        body: chartSlot({ type: "area", tone: "loss", baseline: 0, height: 240, label: "Drawdown over time", seriesName: "From peak", points: series.map((row) => ({ date: row.date, value: row.drawdown })) }),
      })}</div>
      <div class="span-4">${panel({
        title: "Capital by strategy",
        className: "fill",
        body: rankBars([...byStrategy.entries()].filter(([, value]) => value > 0).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value), { neutral: true, format: compactMoney }),
      })}</div>
      <div class="span-12">${panel({
        title: "Daily loss breaches",
        subtitle: limits.maxDailyLoss ? `Sessions at or past ${money(limits.maxDailyLoss)} of realized loss.` : "Set a max daily loss in Settings to track these.",
        body: breaches.length ? `
          <div class="table-scroll"><table class="data-table">
            <thead><tr><th>Date</th><th class="num">Trades closed</th><th class="num">P&amp;L</th><th class="num">Past limit</th></tr></thead>
            <tbody>${breaches.map((row) => `<tr class="row-link" data-open-day="${row.date}" tabindex="0"><td>${longDateShort(row.date)}</td><td class="num">${row.trades}</td><td class="num negative">${money(row.pnl)}</td><td class="num">${money(Math.abs(row.pnl) - limits.maxDailyLoss)}</td></tr>`).join("")}</tbody>
          </table></div>
        ` : `<div class="viz-empty">No breaches logged.</div>`,
      })}</div>
    </div>
  `;
}

function renderRiskGuards() {
  const limits = riskLimits();
  const rows = positionRows();
  const balance = accountBalance();
  const deployed = rows.reduce((sum, row) => sum + row.capital, 0);
  const deployedPct = balance > 0 ? (deployed / balance) * 100 : 0;
  const top = exposureBySymbol(rows)[0];
  const topPct = top && balance > 0 ? (top.capital / balance) * 100 : 0;
  const todayPnl = pnlOnDate(localDateKey());
  const lossUsed = Math.max(0, -todayPnl);
  const guard = (label, valueText, used, limitText, hasLimit) => `
    <div class="guard">
      <div class="goal-row"><span>${label}</span><strong>${valueText}</strong></div>
      <div class="meter ${!hasLimit ? "" : used > 100 ? "is-over" : used > 75 ? "is-near" : ""}"><span style="width:${Math.max(0, Math.min(100, used))}%"></span></div>
      <small>${limitText}</small>
    </div>
  `;
  return `<div class="guards">
    ${guard("Realized loss today", money(lossUsed), limits.maxDailyLoss ? (lossUsed / limits.maxDailyLoss) * 100 : 0, limits.maxDailyLoss ? `Limit ${money(limits.maxDailyLoss)}` : "No limit set", Boolean(limits.maxDailyLoss))}
    ${guard("Capital deployed", `${number(deployedPct, 0)}%`, limits.maxDeployedPct ? (deployedPct / limits.maxDeployedPct) * 100 : deployedPct, limits.maxDeployedPct ? `Limit ${number(limits.maxDeployedPct, 0)}% of the account` : "No limit set", Boolean(limits.maxDeployedPct))}
    ${guard(`Largest ticker${top ? ` (${escapeHtml(top.symbol)})` : ""}`, `${number(topPct, 0)}%`, limits.maxPositionPct ? (topPct / limits.maxPositionPct) * 100 : topPct, limits.maxPositionPct ? `Limit ${number(limits.maxPositionPct, 0)}% of the account` : "No limit set", Boolean(limits.maxPositionPct))}
  </div>`;
}

function intrinsicValue(type, strike, spot) {
  return type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
}

// P&L for one open position at a shocked underlying, using intrinsic value.
function scenarioPnl(row, shock) {
  const { trade, spot } = row;
  if (!spot) return null;
  const moved = spot * (1 + shock / 100);
  if (!isOptionTrade(trade)) {
    const basis = isAssignedShareLot(trade) ? assignedShareCostBasis(trade) : Number(trade.entry || 0);
    return (moved - basis) * Number(trade.size || 0);
  }
  const contracts = Number(trade.contracts || trade.size || 0);
  const multiplier = Number(trade.contractMultiplier || 100);
  const size = contracts * multiplier;
  if (isCreditSpreadStrategy(trade.strategy)) {
    const value = spreadLegs(trade).reduce((sum, leg) => sum + (leg.side === "short" ? -1 : 1) * intrinsicValue(leg.type, Number(leg.strike), moved), 0);
    return (Number(trade.entry || 0) + value) * size;
  }
  if (isPmccStrategy(trade.strategy)) {
    const longPnl = intrinsicValue("call", Number(trade.pmccLongStrike || 0), moved) - Number(trade.pmccLongDebit || trade.entry || 0);
    const shortPnl = pmccCallsSummary(trade).calls
      .filter((call) => call.debit === "")
      .reduce((sum, call) => sum + Number(call.credit || 0) - intrinsicValue("call", Number(call.strike || 0), moved), 0);
    return (longPnl + shortPnl) * size + pmccCallsSummary(trade).realized;
  }
  const type = trade.optionType || optionTypeForStrategy(trade.strategy);
  const intrinsic = intrinsicValue(type, Number(trade.optionStrike || 0), moved);
  return (trade.direction === "Short" ? Number(trade.entry || 0) - intrinsic : intrinsic - Number(trade.entry || 0)) * size;
}

function renderStressTest() {
  const rows = positionRows();
  if (!rows.length) return `<div class="viz-empty">No open positions to stress.</div>`;
  const priced = rows.filter((row) => row.spot);
  if (!priced.length) return `<div class="viz-empty">${liveQuotesLoading || !liveQuotesUpdatedAt ? "Waiting for underlying prices…" : "Underlying prices are unavailable right now."}</div>`;
  const balance = accountBalance();
  const totals = STRESS_SHOCKS.map((shock) => priced.reduce((sum, row) => sum + scenarioPnl(row, shock), 0));
  return `
    <div class="stress-grid">
      ${STRESS_SHOCKS.map((shock, index) => `
        <div class="stress-cell">
          <span>${shock > 0 ? "+" : ""}${shock}%</span>
          <strong class="${pnlClass(totals[index])}">${signedMoney(Math.round(totals[index])).replace(".00", "")}</strong>
          <small>${balance > 0 ? `${signedPercent((totals[index] / balance) * 100, 1)} of account` : ""}</small>
        </div>
      `).join("")}
    </div>
    ${priced.length < rows.length ? `<p class="table-more">${rows.length - priced.length} of ${rows.length} positions are excluded because their underlying price is unavailable.</p>` : ""}
  `;
}
