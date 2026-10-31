// Pure calculations over the journal. Nothing here touches the DOM, and P&L
// always comes from tradePnl()/livePnl() in app.js so every view agrees.

const DAY_MS = 86400000;
const RANGE_OPTIONS = [["1W", "1W"], ["1M", "1M"], ["3M", "3M"], ["YTD", "YTD"], ["1Y", "1Y"], ["ALL", "All"]];
const JOURNAL_QUALITY = ["A+", "A", "B", "C", "Forced"];
const JOURNAL_EMOTION = ["Calm", "Confident", "Patient", "Anxious", "FOMO", "Greedy", "Revenge", "Tired"];
const JOURNAL_MISTAKE = ["None", "Chased entry", "Oversized", "Sold too cheap", "Held too long", "Closed too early", "Ignored plan", "Bad timing", "Earnings risk"];
const JOURNAL_MARKET = ["Trending", "Range", "Volatile", "Quiet", "Selloff", "News driven"];
const DAY_RULES = [
  ["premarket", "Reviewed the plan before the open"],
  ["maxLoss", "Stayed inside the max daily loss"],
  ["screenshots", "Captured charts for key trades"],
  ["recap", "Wrote the end of day recap"],
];

function signedMoney(value) {
  const amount = Number(value || 0);
  return `${amount > 0 ? "+" : ""}${money(amount)}`;
}

function signedPercent(value, digits = 1) {
  const amount = Number(value || 0);
  return `${amount > 0 ? "+" : ""}${number(amount, digits)}%`;
}

function pnlClass(value) {
  if (!value) return "";
  return value > 0 ? "positive" : "negative";
}

function dateKeyDiff(fromKey, toKey) {
  if (!fromKey || !toKey) return 0;
  return Math.round((new Date(`${toKey}T00:00:00`) - new Date(`${fromKey}T00:00:00`)) / DAY_MS);
}

function shiftDateKey(key, days) {
  const date = new Date(`${key}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function shortDate(key) {
  if (!key) return "—";
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function longDate(key) {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function rangeStart(range) {
  const now = localDateKey();
  if (range === "1W") return shiftDateKey(now, -7);
  if (range === "1M") return shiftDateKey(now, -30);
  if (range === "3M") return shiftDateKey(now, -90);
  if (range === "1Y") return shiftDateKey(now, -365);
  if (range === "YTD") return `${now.slice(0, 4)}-01-01`;
  return "";
}

function rangeLabel(range) {
  return { "1W": "past week", "1M": "past 30 days", "3M": "past 90 days", YTD: "year to date", "1Y": "past year", ALL: "all time" }[range] || "all time";
}

function closedInRange(range, trades = state.trades) {
  const start = rangeStart(range);
  return closedTrades(trades).filter((trade) => !start || tradeRealizedDate(trade) >= start);
}

function netCashFlows() {
  return (state.cashflows || []).reduce((sum, flow) => sum + Number(flow.amount || 0), 0);
}

function accountBalance() {
  return startingBalance() + netCashFlows() + metrics().total;
}

function capitalBase() {
  return Math.max(0, startingBalance() + netCashFlows());
}

// Daily account history. Deposits and withdrawals move both equity and its
// peak, so they change the balance without looking like gains or drawdowns.
function equitySeries() {
  const byDate = new Map();
  const bucket = (date) => {
    if (!byDate.has(date)) byDate.set(date, { date, pnl: 0, flow: 0, trades: 0 });
    return byDate.get(date);
  };
  closedTrades().forEach((trade) => {
    const row = bucket(tradeRealizedDate(trade));
    row.pnl += tradePnl(trade);
    row.trades += 1;
  });
  (state.cashflows || []).forEach((flow) => {
    if (flow.date) bucket(flow.date).flow += Number(flow.amount || 0);
  });
  let equity = startingBalance();
  let peak = equity;
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map((row) => {
    equity += row.pnl + row.flow;
    peak = Math.max(peak + row.flow, equity);
    const drawdown = equity - peak;
    return { ...row, equity, peak, drawdown, drawdownPct: peak > 0 ? (drawdown / peak) * 100 : 0 };
  });
}

function seriesInRange(range) {
  const start = rangeStart(range);
  const series = equitySeries();
  return start ? series.filter((row) => row.date >= start) : series;
}

function maxDrawdownOf(series) {
  return series.reduce((worst, row) => (row.drawdown < worst.drawdown ? row : worst), { drawdown: 0, drawdownPct: 0, date: "" });
}

function holdDays(trade) {
  const end = isTradeOpen(trade) ? localDateKey() : trade.exitDate || trade.date;
  return Math.max(0, dateKeyDiff(trade.date, end));
}

// Money a position ties up: cash-secured collateral, share cost, option debit
// or spread max loss. Covered calls are backed by shares counted elsewhere.
function positionCapital(trade) {
  if (!isOptionTrade(trade)) return Number(trade.entry || 0) * Number(trade.size || 0);
  const contracts = Number(trade.contracts || trade.size || 0);
  const multiplier = Number(trade.contractMultiplier || 100);
  if (isPmccStrategy(trade.strategy)) return Number(trade.pmccLongDebit || trade.entry || 0) * contracts * multiplier;
  if (isCreditSpreadStrategy(trade.strategy)) {
    return spreadMaxLoss(trade) || Number(trade.actualRisk || 0) || Number(trade.entry || 0) * contracts * multiplier;
  }
  if (isCoveredCallTrade(trade) || trade.strategy === "Covered Call") return 0;
  if (trade.direction === "Short") return Number(trade.optionStrike || 0) * contracts * multiplier;
  return Number(trade.entry || 0) * contracts * multiplier;
}

function isShortPremium(trade) {
  return isOptionTrade(trade) && trade.direction === "Short" && !isPmccStrategy(trade.strategy);
}

function premiumCollected(trade) {
  if (!isShortPremium(trade)) return 0;
  return Number(trade.entry || 0) * Number(trade.contracts || trade.size || 0) * Number(trade.contractMultiplier || 100);
}

function tradeReturnPct(trade) {
  const capital = positionCapital(trade);
  return capital > 0 ? (tradePnl(trade) / capital) * 100 : null;
}

function annualizedReturnPct(trade) {
  const simple = tradeReturnPct(trade);
  return simple === null ? null : (simple * 365) / Math.max(1, holdDays(trade));
}

function positionExpiration(trade) {
  if (!isOptionTrade(trade)) return "";
  const dates = shortLegsForTrade(trade).map((leg) => leg.expiration).filter(Boolean).sort();
  return dates[0] || trade.optionExpiration || trade.pmccLongExpiration || "";
}

function positionDte(trade) {
  const expiration = positionExpiration(trade);
  return expiration ? dateKeyDiff(localDateKey(), expiration) : null;
}

// Cushion between the underlying and the nearest short strike. Negative means
// the short leg is in the money.
function shortStrikeCushion(trade, spot) {
  if (!spot || !isOptionTrade(trade)) return null;
  const legs = isCreditSpreadStrategy(trade.strategy)
    ? spreadLegs(trade).filter((leg) => leg.side === "short")
    : shortLegsForTrade(trade).map((leg) => ({ ...leg, type: isPmccStrategy(trade.strategy) ? "call" : trade.optionType || optionTypeForStrategy(trade.strategy) }));
  const cushions = legs
    .filter((leg) => Number(leg.strike) > 0)
    .map((leg) => (leg.type === "call" ? Number(leg.strike) - spot : spot - Number(leg.strike)) / spot * 100);
  return cushions.length ? Math.min(...cushions) : null;
}

function underlyingSpot(trade) {
  if (!isOptionTrade(trade)) return liveQuoteForTrade(trade)?.price || 0;
  return underlyingQuotes.get(String(trade.symbol).toUpperCase())?.price || 0;
}

function positionRows() {
  const balance = accountBalance();
  return state.trades.filter(isTradeOpen).map((trade) => {
    const quote = liveQuoteForTrade(trade);
    const pnl = livePnl(trade);
    const capital = positionCapital(trade);
    const spot = underlyingSpot(trade);
    const entry = Number(trade.entry || 0);
    const mark = quote?.price || 0;
    return {
      trade,
      quote,
      pnl,
      capital,
      spot,
      mark,
      expiration: positionExpiration(trade),
      dte: positionDte(trade),
      cushion: shortStrikeCushion(trade, spot),
      captured: isShortPremium(trade) && mark && entry ? ((entry - mark) / entry) * 100 : null,
      accountPct: balance > 0 ? (capital / balance) * 100 : 0,
    };
  });
}

function exposureBySymbol(rows = positionRows()) {
  const groups = new Map();
  rows.forEach((row) => {
    const symbol = String(row.trade.symbol).toUpperCase();
    const entry = groups.get(symbol) || { symbol, capital: 0, pnl: 0, priced: 0, count: 0 };
    entry.capital += row.capital;
    entry.count += 1;
    if (row.pnl !== null) {
      entry.pnl += row.pnl;
      entry.priced += 1;
    }
    groups.set(symbol, entry);
  });
  return [...groups.values()].sort((a, b) => b.capital - a.capital);
}

function riskLimits() {
  return {
    maxDailyLoss: Number(state.settings?.maxDailyLoss || 0),
    maxPositionPct: Number(state.settings?.maxPositionPct || 0),
    maxDeployedPct: Number(state.settings?.maxDeployedPct || 0),
    profitTargetPct: Number(state.settings?.profitTargetPct || 0),
    monthlyGoal: Number(state.settings?.monthlyGoal || 0),
  };
}

function pnlOnDate(key) {
  return closedTrades().filter((trade) => tradeRealizedDate(trade) === key).reduce((sum, trade) => sum + tradePnl(trade), 0);
}

// Everything on the book that needs a decision, most urgent first.
function buildAlerts(rows = positionRows()) {
  const limits = riskLimits();
  const alerts = [];
  const add = (level, title, detail, tradeId = "") => alerts.push({ level, title, detail, tradeId });
  const label = (trade) => `${trade.symbol} ${isOptionTrade(trade) ? optionContractLabel(trade) : "shares"}`;

  rows.forEach(({ trade, dte, cushion, captured }) => {
    if (dte !== null && dte < 0) add("critical", `${trade.symbol} is past expiration`, `${label(trade)} expired ${Math.abs(dte)}d ago and is still open. Log the outcome.`, trade.id);
    else if (dte !== null && dte <= 7) add(dte <= 2 ? "critical" : "warning", `${trade.symbol} expires in ${dte}d`, label(trade), trade.id);
    // In the money matters most close to expiry, when assignment is a live risk.
    if (cushion !== null && cushion < -0.05) add(dte !== null && dte <= 7 ? "critical" : "warning", `${trade.symbol} short strike is in the money`, `${number(Math.abs(cushion), 1)}% through the strike on ${label(trade)}, ${dte}d to expiry.`, trade.id);
    else if (cushion !== null && Math.abs(cushion) < 0.05) add("warning", `${trade.symbol} is at the short strike`, `No cushion left on ${label(trade)}.`, trade.id);
    else if (cushion !== null && cushion < 3) add("warning", `${trade.symbol} is near the short strike`, `Only ${number(cushion, 1)}% of cushion left on ${label(trade)}.`, trade.id);
    if (captured !== null && limits.profitTargetPct && captured >= limits.profitTargetPct) {
      add("info", `${trade.symbol} reached the profit target`, `${number(captured, 0)}% of the premium is captured. Consider closing.`, trade.id);
    }
  });

  const balance = accountBalance();
  const deployed = rows.reduce((sum, row) => sum + row.capital, 0);
  const deployedPct = balance > 0 ? (deployed / balance) * 100 : 0;
  if (limits.maxDeployedPct && deployedPct > limits.maxDeployedPct) {
    add("warning", "Capital deployment is above your limit", `${number(deployedPct, 0)}% deployed against a ${number(limits.maxDeployedPct, 0)}% limit.`);
  }
  if (limits.maxPositionPct && balance > 0) {
    exposureBySymbol(rows).filter((item) => (item.capital / balance) * 100 > limits.maxPositionPct).forEach((item) => {
      add("warning", `${item.symbol} is above your concentration limit`, `${number((item.capital / balance) * 100, 0)}% of the account against a ${number(limits.maxPositionPct, 0)}% limit.`);
    });
  }
  const todayPnl = pnlOnDate(localDateKey());
  if (limits.maxDailyLoss && todayPnl <= -limits.maxDailyLoss) {
    add("critical", "Max daily loss reached", `${money(todayPnl)} today against a ${money(limits.maxDailyLoss)} limit. Stop trading for the day.`);
  }
  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

function longestStreaks(trades) {
  const ordered = [...trades].sort((a, b) => tradeRealizedDate(a).localeCompare(tradeRealizedDate(b)));
  let wins = 0;
  let losses = 0;
  let maxWins = 0;
  let maxLosses = 0;
  ordered.forEach((trade) => {
    const pnl = tradePnl(trade);
    wins = pnl > 0 ? wins + 1 : 0;
    losses = pnl < 0 ? losses + 1 : 0;
    maxWins = Math.max(maxWins, wins);
    maxLosses = Math.max(maxLosses, losses);
  });
  return { maxWins, maxLosses };
}

function tradeStats(trades) {
  const realized = closedTrades(trades);
  const base = metrics(realized);
  const pnls = realized.map(tradePnl);
  const grossWin = pnls.filter((pnl) => pnl > 0).reduce((sum, pnl) => sum + pnl, 0);
  const grossLoss = Math.abs(pnls.filter((pnl) => pnl < 0).reduce((sum, pnl) => sum + pnl, 0));
  const days = new Map();
  realized.forEach((trade) => days.set(tradeRealizedDate(trade), (days.get(tradeRealizedDate(trade)) || 0) + tradePnl(trade)));
  const dayValues = [...days.entries()];
  const bestDay = dayValues.reduce((best, day) => (day[1] > best[1] ? day : best), ["", 0]);
  const worstDay = dayValues.reduce((worst, day) => (day[1] < worst[1] ? day : worst), ["", 0]);
  return {
    ...base,
    grossWin,
    grossLoss,
    // A book with no losses has no finite profit factor; callers show a dash.
    profitFactor: grossLoss ? grossWin / grossLoss : null,
    payoff: base.avgLoss ? base.avgWin / base.avgLoss : null,
    largestWin: pnls.length ? Math.max(0, ...pnls) : 0,
    largestLoss: pnls.length ? Math.min(0, ...pnls) : 0,
    winCount: pnls.filter((pnl) => pnl > 0).length,
    lossCount: pnls.filter((pnl) => pnl < 0).length,
    avgHold: realized.length ? realized.reduce((sum, trade) => sum + holdDays(trade), 0) / realized.length : 0,
    tradingDays: dayValues.length,
    greenDays: dayValues.filter((day) => day[1] > 0).length,
    avgDay: dayValues.length ? base.total / dayValues.length : 0,
    bestDay,
    worstDay,
    ...longestStreaks(realized),
  };
}

function groupStats(trades, getLabel) {
  const groups = new Map();
  closedTrades(trades).forEach((trade) => {
    [].concat(getLabel(trade)).forEach((label) => {
      if (!label) return;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(trade);
    });
  });
  return [...groups.entries()]
    .map(([label, items]) => ({ label, ...tradeStats(items) }))
    .sort((a, b) => b.total - a.total);
}

function holdBucket(trade) {
  const days = holdDays(trade);
  if (days <= 1) return "0-1 days";
  if (days <= 7) return "2-7 days";
  if (days <= 21) return "8-21 days";
  if (days <= 45) return "22-45 days";
  return "46+ days";
}

function monthlyPnl(trades = state.trades) {
  const months = new Map();
  closedTrades(trades).forEach((trade) => {
    const key = tradeRealizedDate(trade).slice(0, 7);
    months.set(key, (months.get(key) || 0) + tradePnl(trade));
  });
  return months;
}

function pnlHistogram(trades) {
  const pnls = closedTrades(trades).map(tradePnl);
  if (!pnls.length) return [];
  const steps = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
  const span = Math.max(...pnls) - Math.min(...pnls);
  const step = steps.find((value) => span / value <= 16) || steps.at(-1);
  const bins = new Map();
  pnls.forEach((pnl) => {
    const start = Math.floor(pnl / step) * step;
    bins.set(start, (bins.get(start) || 0) + 1);
  });
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([start, count]) => ({ start, end: start + step, count }));
}

// Wheel-style income per ticker: put and call premium plus realized results
// from the share lots those options turned into.
function wheelRows(trades = state.trades) {
  const groups = new Map();
  const group = (symbol) => {
    const key = String(symbol).toUpperCase();
    if (!groups.has(key)) groups.set(key, { symbol: key, puts: 0, calls: 0, spreads: 0, premium: 0, realized: 0, assigned: 0, closed: 0, wins: 0, openCapital: 0, annualized: [] });
    return groups.get(key);
  };
  trades.forEach((trade) => {
    const isLot = isAssignedShareLot(trade);
    if (!isShortPremium(trade) && !isLot) return;
    const row = group(trade.symbol);
    if (isShortPremium(trade)) {
      if (isCreditSpreadStrategy(trade.strategy)) row.spreads += 1;
      else if (trade.optionType === "call") row.calls += 1;
      else row.puts += 1;
      row.premium += premiumCollected(trade);
    }
    if (trade.assignedTradeId) row.assigned += 1;
    if (isTradeOpen(trade)) {
      row.openCapital += positionCapital(trade);
    } else if (!trade.assignedTradeId) {
      const pnl = tradePnl(trade);
      row.realized += pnl;
      row.closed += 1;
      if (pnl > 0) row.wins += 1;
      const annual = annualizedReturnPct(trade);
      if (annual !== null && isShortPremium(trade)) row.annualized.push(annual);
    }
  });
  return [...groups.values()].sort((a, b) => b.realized - a.realized);
}

function premiumByMonth(trades = state.trades, limit = 12) {
  const months = new Map();
  const month = (key) => {
    if (!months.has(key)) months.set(key, { key, sold: 0, realized: 0 });
    return months.get(key);
  };
  trades.filter(isShortPremium).forEach((trade) => {
    month(trade.date.slice(0, 7)).sold += premiumCollected(trade);
    if (!isTradeOpen(trade) && !trade.assignedTradeId) month(tradeRealizedDate(trade).slice(0, 7)).realized += tradePnl(trade);
  });
  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-limit);
}

function weekStartKey(key) {
  const date = new Date(`${key}T00:00:00`);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return localDateKey(date);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
