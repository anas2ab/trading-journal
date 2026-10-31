// Performance analytics and options income.

let analyticsRange = readPref("personal-trading-journal-analytics-range", "ALL");
let analyticsAsset = "";
let analyticsStrategy = "";
let incomeRange = readPref("personal-trading-journal-income-range", "ALL");

function analyticsTrades() {
  return closedInRange(analyticsRange).filter((trade) => (!analyticsAsset || trade.assetClass === analyticsAsset) && (!analyticsStrategy || trade.strategy === analyticsStrategy));
}

function statLine(label, value, tone = "") {
  return `<div class="stat-line"><span>${label}</span><strong class="${tone}">${value}</strong></div>`;
}

function groupPanel(title, rows, subtitle = "") {
  return panel({
    title,
    subtitle,
    className: "fill",
    body: rankBars(rows.map((row) => ({ label: row.label, value: row.total, count: row.count, winRate: row.winRate })), {
      meta: (row) => `${row.count} trade${row.count === 1 ? "" : "s"} · ${number(row.winRate, 0)}% wins`,
    }),
  });
}

function renderAnalytics() {
  const strategies = [...new Set(closedTrades().map((trade) => trade.strategy))].sort();
  const trades = analyticsTrades();
  const stats = tradeStats(trades);
  const filtered = Boolean(analyticsAsset || analyticsStrategy);
  appView.innerHTML = `
    <div class="page-bar">
      ${segmentedControl("analytics-range", RANGE_OPTIONS, analyticsRange, "Date range")}
      <label class="field-inline"><span class="sr-only">Asset</span>
        <select data-analytics-filter="asset" aria-label="Asset">
          <option value="">All assets</option>
          ${["Options", "Stocks"].map((value) => `<option ${value === analyticsAsset ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </label>
      <label class="field-inline"><span class="sr-only">Strategy</span>
        <select data-analytics-filter="strategy" aria-label="Strategy">
          <option value="">All strategies</option>
          ${strategies.map((value) => `<option ${value === analyticsStrategy ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
    </div>
    ${trades.length ? renderAnalyticsBody(trades, stats, filtered) : `<section class="card">${emptyBlock("No closed trades in this view", "Widen the date range or clear the filters.")}</section>`}
  `;
}

function renderAnalyticsBody(trades, stats, filtered) {
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const holdOrder = ["0-1 days", "2-7 days", "8-21 days", "22-45 days", "46+ days"];
  const inOrder = (rows, order) => [...rows].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  const symbolRows = groupStats(trades, (trade) => String(trade.symbol).toUpperCase());
  const running = [];
  [...trades].sort((a, b) => tradeRealizedDate(a).localeCompare(tradeRealizedDate(b))).reduce((total, trade) => {
    const next = total + tradePnl(trade);
    const key = tradeRealizedDate(trade);
    if (running.at(-1)?.date === key) running.at(-1).value = next;
    else running.push({ date: key, value: next });
    return next;
  }, 0);
  const histogram = pnlHistogram(trades);
  const journaled = trades.filter((trade) => trade.journaled === true);
  return `
    <div class="tile-grid">
      ${statTile({ label: "Net P&amp;L", value: signedMoney(stats.total), tone: pnlClass(stats.total), sub: `${stats.count} closed trades` })}
      ${statTile({ label: "Win rate", value: `${number(stats.winRate, 1)}%`, sub: `${stats.winCount} wins · ${stats.lossCount} losses` })}
      ${statTile({ label: "Profit factor", value: stats.profitFactor === null ? "—" : number(stats.profitFactor, 2), sub: `${compactMoney(stats.grossWin)} won, ${compactMoney(stats.grossLoss)} lost` })}
      ${statTile({ label: "Expectancy", value: signedMoney(stats.expectancy), tone: pnlClass(stats.expectancy), sub: "Average result per trade" })}
      ${statTile({ label: "Payoff ratio", value: stats.payoff === null ? "—" : number(stats.payoff, 2), sub: `${money(stats.avgWin)} win vs ${money(stats.avgLoss)} loss` })}
      ${statTile({ label: "Green days", value: stats.tradingDays ? `${number((stats.greenDays / stats.tradingDays) * 100, 0)}%` : "—", sub: `${stats.greenDays} of ${stats.tradingDays} sessions` })}
    </div>
    <div class="grid-12">
      <div class="span-8">${panel({
        title: "Cumulative P&amp;L",
        subtitle: filtered ? "Filtered trades only." : `Closed trades, ${rangeLabel(analyticsRange)}.`,
        className: "fill",
        body: chartSlot({ type: "area", baseline: 0, height: 350, points: running, seriesName: "Cumulative P&L", tooltipFormat: signedMoney, label: "Cumulative realized P&L" }),
      })}</div>
      <div class="span-4">${panel({
        title: "Key numbers",
        className: "fill",
        body: `<div class="stat-lines">
          ${statLine("Average win", money(stats.avgWin), "positive")}
          ${statLine("Average loss", money(-stats.avgLoss), stats.avgLoss ? "negative" : "")}
          ${statLine("Largest win", money(stats.largestWin), "positive")}
          ${statLine("Largest loss", money(stats.largestLoss), stats.largestLoss ? "negative" : "")}
          ${statLine("Best day", stats.bestDay[0] ? `${signedMoney(stats.bestDay[1])} · ${shortDate(stats.bestDay[0])}` : "—")}
          ${statLine("Worst day", stats.worstDay[0] ? `${signedMoney(stats.worstDay[1])} · ${shortDate(stats.worstDay[0])}` : "—")}
          ${statLine("Average per day", signedMoney(stats.avgDay), pnlClass(stats.avgDay))}
          ${statLine("Average hold", `${number(stats.avgHold, 1)} days`)}
          ${statLine("Longest win streak", `${stats.maxWins} trades`)}
          ${statLine("Longest loss streak", `${stats.maxLosses} trades`)}
        </div>`,
      })}</div>
      <div class="span-12">${renderMonthlyTable(trades)}</div>
      <div class="span-6">${groupPanel("By strategy", groupStats(trades, (trade) => trade.strategy))}</div>
      <div class="span-6">${panel({
        title: "Result distribution",
        subtitle: "How many trades landed in each P&L range.",
        className: "fill",
        body: chartSlot({
          type: "bars",
          height: 240,
          format: (value) => String(Math.round(value)),
          label: "Histogram of trade results",
          items: histogram.map((bin) => ({
            label: compactMoney(bin.start),
            value: bin.count,
            tone: bin.start >= 0 ? "gain" : "loss",
            heading: `${money(bin.start)} to ${money(bin.end)}`,
            rows: [{ value: String(bin.count), label: bin.count === 1 ? "trade" : "trades" }],
          })),
        }),
      })}</div>
      <div class="span-6">${groupPanel("Top tickers", symbolRows.filter((row) => row.total > 0).slice(0, 8))}</div>
      <div class="span-6">${groupPanel("Bottom tickers", symbolRows.filter((row) => row.total < 0).slice(-8).reverse())}</div>
      <div class="span-6">${groupPanel("Exit day", inOrder(groupStats(trades, (trade) => dayName(tradeRealizedDate(trade))), dayOrder), "Realized P&amp;L by the weekday the trade closed.")}</div>
      <div class="span-6">${groupPanel("Holding period", inOrder(groupStats(trades, holdBucket), holdOrder))}</div>
      <div class="span-12">${panel({
        title: "Activity",
        subtitle: "Realized P&amp;L by day over the last year.",
        body: renderYearHeatmap(trades),
      })}</div>
      ${renderPsychology(journaled, trades.length)}
    </div>
  `;
}

function renderMonthlyTable(trades) {
  const months = monthlyPnl(trades);
  const years = [...new Set([...months.keys()].map((key) => key.slice(0, 4)))].sort().reverse();
  const names = Array.from({ length: 12 }, (_, index) => new Date(2024, index, 1).toLocaleDateString(undefined, { month: "short" }));
  const maxAbs = Math.max(1, ...[...months.values()].map(Math.abs));
  return panel({
    title: "Monthly returns",
    body: `<div class="table-scroll"><table class="data-table month-table">
      <thead><tr><th>Year</th>${names.map((name) => `<th class="num">${name}</th>`).join("")}<th class="num">Total</th></tr></thead>
      <tbody>${years.map((year) => {
        let total = 0;
        const cells = names.map((_, index) => {
          const value = months.get(`${year}-${String(index + 1).padStart(2, "0")}`);
          if (value === undefined) return `<td class="num"><span class="muted">—</span></td>`;
          total += value;
          const heat = (0.06 + (Math.abs(value) / maxAbs) * 0.3).toFixed(2);
          return `<td class="num heat ${value >= 0 ? "gain" : "loss"}" style="--heat:${heat}"><span class="${pnlClass(value)}">${compactSigned(value)}</span></td>`;
        }).join("");
        return `<tr><th scope="row">${year}</th>${cells}<td class="num"><strong class="${pnlClass(total)}">${signedMoney(total)}</strong></td></tr>`;
      }).join("")}</tbody>
    </table></div>`,
  });
}

function renderYearHeatmap(trades) {
  const byDay = new Map();
  trades.forEach((trade) => byDay.set(tradeRealizedDate(trade), (byDay.get(tradeRealizedDate(trade)) || 0) + tradePnl(trade)));
  const end = localDateKey();
  const startDate = new Date(`${shiftDateKey(end, -364)}T00:00:00`);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const cells = [];
  for (let key = localDateKey(startDate); key <= end; key = shiftDateKey(key, 1)) cells.push(key);
  const values = [...byDay.values()].map(Math.abs);
  const scale = Math.max(1, median(values) * 3);
  return `<div class="year-scroll"><div class="year-map">${cells.map((key) => {
    const pnl = byDay.get(key);
    if (pnl === undefined) return `<span class="year-cell" data-tip="${shortDate(key)}: no closed trades"></span>`;
    const heat = (0.3 + Math.min(1, Math.abs(pnl) / scale) * 0.7).toFixed(2);
    return `<button type="button" class="year-cell ${pnl >= 0 ? "gain" : "loss"}" style="--heat:${heat}" data-open-day="${key}" data-tip="${shortDate(key)}: ${signedMoney(pnl)}" aria-label="${shortDate(key)} ${signedMoney(pnl)}"></button>`;
  }).join("")}</div></div>`;
}

function renderPsychology(journaled, total) {
  if (!journaled.length) {
    return `<div class="span-12">${panel({
      title: "Behavior analytics",
      subtitle: "How quality, emotion and mistakes affect your results.",
      body: emptyBlock("Unlocks as you review trades", `Older trades have no real quality, emotion or mistake data, so all ${total} are excluded here. Open a trade and fill in its review to start.`),
    })}</div>`;
  }
  const by = (key) => groupStats(journaled, (trade) => trade[key] || "");
  const tagged = groupStats(journaled, tradeTags);
  return `
    <div class="span-6">${groupPanel("Setup quality", by("quality"), `From ${journaled.length} reviewed trades.`)}</div>
    <div class="span-6">${groupPanel("Emotion", by("emotion"), `From ${journaled.length} reviewed trades.`)}</div>
    <div class="span-6">${groupPanel("Mistakes", by("mistake"))}</div>
    <div class="span-6">${groupPanel("Market condition", by("market"))}</div>
    ${tagged.length ? `<div class="span-12">${groupPanel("Tags", tagged)}</div>` : ""}
  `;
}

function renderIncome() {
  const start = rangeStart(incomeRange);
  const inRange = (trade) => !start || trade.date >= start || tradeRealizedDate(trade) >= start;
  const trades = state.trades.filter(inRange);
  const shorts = trades.filter(isShortPremium);
  const closed = shorts.filter((trade) => !isTradeOpen(trade) && !trade.assignedTradeId);
  const sold = shorts.reduce((sum, trade) => sum + premiumCollected(trade), 0);
  const closedPremium = closed.reduce((sum, trade) => sum + premiumCollected(trade), 0);
  const realized = closed.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const wins = closed.filter((trade) => tradePnl(trade) > 0).length;
  const annuals = closed.map(annualizedReturnPct).filter((value) => value !== null);
  const assigned = shorts.filter((trade) => trade.assignedTradeId).length;
  const monthly = premiumByMonth(trades);
  const wheel = wheelRows(trades);
  const lots = state.trades.filter((trade) => isAssignedShareLot(trade) && isTradeOpen(trade));
  const series = [{ name: "Premium sold", tone: "series1" }, { name: "Realized P&L", tone: "series2" }];
  appView.innerHTML = `
    <div class="page-bar">
      ${segmentedControl("income-range", RANGE_OPTIONS, incomeRange, "Date range")}
    </div>
    <div class="tile-grid">
      ${statTile({ label: "Premium sold", value: money(sold), sub: `${shorts.length} short option trades` })}
      ${statTile({ label: "Realized from premium", value: signedMoney(realized), tone: pnlClass(realized), sub: `${closed.length} closed trades` })}
      ${statTile({ label: "Premium captured", value: closedPremium ? `${number((realized / closedPremium) * 100, 0)}%` : "—", sub: `Of ${compactMoney(closedPremium)} on closed trades` })}
      ${statTile({ label: "Win rate", value: closed.length ? `${number((wins / closed.length) * 100, 1)}%` : "—", sub: `${wins} of ${closed.length} closed` })}
      ${statTile({ label: "Median annualized", value: annuals.length ? `${number(median(annuals), 0)}%` : "—", sub: "Return on capital, closed trades" })}
      ${statTile({ label: "Assignments", value: String(assigned), sub: shorts.length ? `${number((assigned / shorts.length) * 100, 1)}% of short options` : "" })}
    </div>
    <div class="grid-12">
      <div class="span-12">${panel({
        title: "Premium by month",
        subtitle: "Sold counts by open date. Realized counts by close date.",
        actions: chartLegend(series),
        body: chartSlot({
          type: "grouped",
          height: 260,
          series,
          label: "Premium sold and realized by month",
          groups: monthly.map((row) => ({
            label: new Date(`${row.key}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" }),
            heading: new Date(`${row.key}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
            values: [row.sold, row.realized],
          })),
        }),
      })}</div>
      <div class="span-12">${panel({
        title: "Income by ticker",
        subtitle: "Short puts, calls and spreads, plus results from assigned share lots. Put credits on assigned trades move into the share basis.",
        body: renderWheelTable(wheel),
      })}</div>
      <div class="span-12">${panel({
        title: "Assigned share lots",
        subtitle: "Open lots with cost reduced by put credit and closed covered calls.",
        body: renderLotsTable(lots),
      })}</div>
    </div>
  `;
}

function renderWheelTable(rows) {
  if (!rows.length) return emptyBlock("No short options yet", "Sell a put, call or credit spread to track income here.");
  return `<div class="table-scroll"><table class="data-table">
    <thead><tr><th>Ticker</th><th class="num">Puts</th><th class="num">Calls</th><th class="num">Spreads</th><th class="num">Assigned</th><th class="num">Premium sold</th><th class="num">Win rate</th><th class="num">Median annualized</th><th class="num">Open capital</th><th class="num">Realized</th></tr></thead>
    <tbody>${rows.map((row) => `
      <tr class="row-link" data-filter-symbol="${escapeHtml(row.symbol)}" tabindex="0">
        <td><strong>${escapeHtml(row.symbol)}</strong></td>
        <td class="num">${row.puts}</td>
        <td class="num">${row.calls}</td>
        <td class="num">${row.spreads}</td>
        <td class="num">${row.assigned}</td>
        <td class="num">${money(row.premium)}</td>
        <td class="num">${row.closed ? `${number((row.wins / row.closed) * 100, 0)}%` : `<span class="muted">—</span>`}</td>
        <td class="num">${row.annualized.length ? `${number(median(row.annualized), 0)}%` : `<span class="muted">—</span>`}</td>
        <td class="num">${row.openCapital ? money(row.openCapital) : `<span class="muted">—</span>`}</td>
        <td class="num"><strong class="${pnlClass(row.realized)}">${signedMoney(row.realized)}</strong></td>
      </tr>
    `).join("")}</tbody>
  </table></div>`;
}

function renderLotsTable(lots) {
  if (!lots.length) return `<div class="viz-empty">No open assigned lots.</div>`;
  return `<div class="table-scroll"><table class="data-table">
    <thead><tr><th>Ticker</th><th class="num">Shares</th><th class="num">Assigned at</th><th class="num">Put credit</th><th class="num">Call P&amp;L</th><th class="num">Adjusted cost</th><th class="num">Reduction</th><th class="num">Calls open</th></tr></thead>
    <tbody>${lots.map((trade) => {
      const summary = assignedShareSummary(trade);
      const assignedAt = Number(trade.entry || 0);
      const reduction = assignedAt ? ((assignedAt - summary.adjustedAverageCost) / assignedAt) * 100 : 0;
      return `<tr class="row-link" data-open-trade="${trade.id}" tabindex="0">
        <td><strong>${escapeHtml(trade.symbol)}</strong></td>
        <td class="num">${number(summary.shares, 0)}</td>
        <td class="num">${money(assignedAt)}</td>
        <td class="num">${money(summary.netPutCredit)}</td>
        <td class="num"><span class="${pnlClass(summary.realizedCallPnl)}">${signedMoney(summary.realizedCallPnl)}</span></td>
        <td class="num"><strong>${money(summary.adjustedAverageCost)}</strong></td>
        <td class="num">${number(reduction, 1)}%</td>
        <td class="num">${summary.openCallContracts}</td>
      </tr>`;
    }).join("")}</tbody>
  </table></div>`;
}
