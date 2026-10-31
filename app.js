const STORAGE_KEY = "personal-trading-journal-v1";
const FLOW_SYMBOLS_KEY = "personal-trading-journal-flow-symbols";
const GEX_SYMBOL_KEY = "personal-trading-journal-gex-symbol";
const VOL_SYMBOL_KEY = "personal-trading-journal-vol-symbol";
const GEX_EXPIRY_LABELS = [["all", "All exp"], ["week", "This week"], ["0dte", "0DTE"]];
const ACTIVE_JOURNAL_KEY = "personal-trading-journal-active";
const API_URL = "/api/journal";
const journals = [
  ["mine", "My Journal"],
];

const navGroups = [
  ["", [["dashboard", "Dashboard"], ["positions", "Positions"]]],
  ["Journal", [["trades", "Trade Log"], ["calendar", "Calendar"], ["journal", "Journal"], ["playbook", "Playbook"]]],
  ["Performance", [["analytics", "Analytics"], ["income", "Income"], ["risk", "Risk"]]],
  ["Market", [["watchlist", "Watchlist"], ["flow", "Options Flow"], ["gex", "Gamma Exposure"], ["volatility", "Expected Move & IV"]]],
  ["Workspace", [["tools", "Calculators"], ["settings", "Settings"]]],
];
const navItems = navGroups.flatMap(([, items]) => items);

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
    checklist: ["Willing to own shares", "Cash available", "Assignment plan defined", "Max risk confirmed"],
  },
  {
    id: crypto.randomUUID(),
    name: "Poor Man's Covered Call",
    rules: "Use a long-dated deep ITM call as the stock replacement, then sell shorter-dated calls against it. Define diagonal risk, assignment plan, and roll/exit rules before entry.",
    checklist: ["Long call thesis defined", "Short call premium target set", "Assignment plan confirmed", "Roll or exit rule defined"],
  },
  {
    id: crypto.randomUUID(),
    name: "Put Credit Spread",
    rules: "Sell a put and buy a lower strike put in the same expiry. Short strike sits below support. Credit should justify the width. Define profit target and stop before entry.",
    checklist: ["Bullish or neutral thesis defined", "Short strike below support", "Credit justifies width", "Profit target and stop set"],
  },
  {
    id: crypto.randomUUID(),
    name: "Call Credit Spread",
    rules: "Sell a call and buy a higher strike call in the same expiry. Short strike sits above resistance. Credit should justify the width. Define profit target and stop before entry.",
    checklist: ["Bearish or neutral thesis defined", "Short strike above resistance", "Credit justifies width", "Profit target and stop set"],
  },
  {
    id: crypto.randomUUID(),
    name: "Iron Condor",
    rules: "Neutral range trade: sell a put credit spread and a call credit spread in the same expiry. Short strikes outside the expected move. Manage the tested side before expiry.",
    checklist: ["Range-bound thesis defined", "Short strikes outside expected move", "Max loss accepted", "Adjustment or exit rule defined"],
  },
  {
    id: crypto.randomUUID(),
    name: "Diagonal Credit Spread",
    rules: "Sell a near-term option and buy a further-dated option at a further OTM strike for a net credit. Plan rolls of the short leg and an exit before the short expiry.",
    checklist: ["Directional bias defined", "Short leg expiry before long leg", "Net credit received", "Roll or exit rule defined"],
  },
];

const requiredOptionStrategies = ["Long Call", "Long Put", "Cash Secured Put", "Poor Man's Covered Call", "Put Credit Spread", "Call Credit Spread", "Iron Condor", "Diagonal Credit Spread"];
const creditSpreadStrategies = ["Put Credit Spread", "Call Credit Spread", "Iron Condor", "Diagonal Credit Spread"];

const today = localDateKey();

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
  },
];

let state = createDefaultState();
let activeView = "dashboard";
let selectedTradeId = state.trades[0]?.id ?? null;
let selectedDay = today;
let activeJournalId = localStorage.getItem(ACTIVE_JOURNAL_KEY) || "mine";
if (!journals.some(([id]) => id === activeJournalId)) activeJournalId = "mine";
let editingTradeId = null;
let lastDeletedTrade = null;
let shellEventsBound = false;
let syncStatus = { text: "Saved locally", mode: "" };
let liveQuotes = new Map();
let underlyingQuotes = new Map();
let liveQuotesUpdatedAt = null;
let liveQuotesLoading = false;
let liveQuoteRefreshTimer = null;
let flowResult = null;
let flowLoading = false;
let flowError = "";
let gexView = { symbol: "", expiry: "all", metric: "gex", window: 25, heatmapMode: "value", data: null, loading: false, error: "" };
let gexRefreshTimer = null;
let volView = { symbol: "", data: null, loading: false, error: "" };

const appView = document.querySelector("#appView");
const viewTitle = document.querySelector("#viewTitle");
const viewEyebrow = document.querySelector("#viewEyebrow");
const navList = document.querySelector("#navList");
const journalSelect = document.querySelector("#journalSelect");
const tradeDialog = document.querySelector("#tradeDialog");
const tradeForm = document.querySelector("#tradeForm");
const deleteTradeButton = document.querySelector("#deleteTradeButton");
const assignCspButton = document.querySelector("#assignCspButton");
const saveTradeButton = document.querySelector("#saveTradeButton");

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activeJournal() {
  return journals.find(([id]) => id === activeJournalId) || journals[0];
}

function journalStorageKey(id = activeJournalId) {
  return id === "mine" ? STORAGE_KEY : `${STORAGE_KEY}-${id}`;
}

function journalApiUrl(id = activeJournalId) {
  return `${API_URL}?journal=${encodeURIComponent(id)}`;
}

function createBlankState(accountName = "Main") {
  const defaults = createDefaultState();
  return {
    ...defaults,
    trades: [],
    notebook: [],
    blockedTrades: [],
    settings: {
      ...defaults.settings,
      accountName,
    },
  };
}

function loadState() {
  const stored = localStorage.getItem(journalStorageKey());
  if (stored) return normalizeState(JSON.parse(stored));
  if (activeJournalId !== "mine") return createBlankState(activeJournal()[1]);
  return createDefaultState();
}

function createDefaultState() {
  return {
    trades: sampleTrades,
    strategies: defaultStrategies,
    notebook: [
      {
        id: crypto.randomUUID(),
        date: today,
        title: "Process note",
        body: "Study A+ setups separately from forced trades.",
      },
    ],
    blockedTrades: [],
    settings: {
      startingBalance: 0,
      accountName: "Main",
      darkMode: false,
      profitTargetPct: 50,
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
  nextState.notebook ||= [];
  nextState.blockedTrades ||= [];
  nextState.dayNotes ||= {};
  nextState.weeklyReviews ||= {};
  nextState.watchlist ||= [];
  nextState.cashflows ||= [];
  nextState.settings = { ...defaults.settings, ...(nextState.settings || {}) };
  nextState.trades = nextState.trades.map((trade) => {
    const normalized = {
      assetClass: "Stocks",
      account: nextState.settings.accountName || "Main",
      plannedEntry: trade.entry || 0,
      plannedStop: trade.stop || 0,
      plannedTarget: trade.target || 0,
      plannedRisk: 0,
      actualRisk: 0,
      session: "Open",
      customTags: "",
      partials: "",
      optionType: "",
      optionExpiration: "",
      optionStrike: 0,
      optionSymbol: "",
      contracts: 0,
      contractMultiplier: 100,
      pmccLongExpiration: "",
      pmccLongStrike: 0,
      pmccLongDebit: 0,
      pmccShortExpiration: "",
      pmccShortStrike: 0,
      pmccShortCredit: 0,
      pmccWeeklyCalls: [],
      spreadShortStrike: 0,
      spreadLongStrike: 0,
      spreadCallShortStrike: 0,
      spreadCallLongStrike: 0,
      spreadLongExpiration: "",
      assignedFromCspId: "",
      assignedPutCreditNet: 0,
      assignedShares: 0,
      assignedTradeId: "",
      coveredCallForId: "",
      ruleChecks: [],
      ...trade,
    };
    const size = Number(normalized.size || 0);
    const multiplier = Number(normalized.contractMultiplier || 100);
    const legacyOptionTrade = normalized.assetClass === "Options" && !Number(normalized.contracts || 0);
    const direction = isOptionTrade(normalized) ? directionForStrategy(normalized.strategy, normalized.direction) : normalized.direction;
    return {
      ...normalized,
      direction,
      entry: Number(normalized.entry || 0),
      exit: Number(normalized.exit || 0),
      size,
      fees: Number(normalized.fees || 0),
      stop: Number(normalized.stop || 0),
      target: Number(normalized.target || 0),
      optionStrike: Number(normalized.optionStrike || 0),
      contracts: legacyOptionTrade && size >= multiplier ? size / multiplier : Number(normalized.contracts || 0),
      contractMultiplier: multiplier,
      pmccLongStrike: Number(normalized.pmccLongStrike || 0),
      pmccLongDebit: Number(normalized.pmccLongDebit || 0),
      pmccShortStrike: Number(normalized.pmccShortStrike || 0),
      pmccShortCredit: Number(normalized.pmccShortCredit || 0),
      pmccWeeklyCalls: normalizePmccWeeklyCalls(normalized.pmccWeeklyCalls),
      spreadShortStrike: Number(normalized.spreadShortStrike || 0),
      spreadLongStrike: Number(normalized.spreadLongStrike || 0),
      spreadCallShortStrike: Number(normalized.spreadCallShortStrike || 0),
      spreadCallLongStrike: Number(normalized.spreadCallLongStrike || 0),
      assignedFromCspId: String(normalized.assignedFromCspId || ""),
      assignedPutCreditNet: Number(normalized.assignedPutCreditNet || 0),
      assignedShares: Number(normalized.assignedShares || (normalized.assignedFromCspId ? size : 0)),
      assignedTradeId: String(normalized.assignedTradeId || ""),
      coveredCallForId: String(normalized.coveredCallForId || ""),
      plannedEntry: Number(normalized.plannedEntry || 0),
      plannedStop: Number(normalized.plannedStop || 0),
      plannedTarget: Number(normalized.plannedTarget || 0),
      plannedRisk: Number(normalized.plannedRisk || 0),
      actualRisk: Number(normalized.actualRisk || 0),
      exitDate: normalized.exitDate || (Number(normalized.exit || 0) && normalized.exitTime ? normalized.date : ""),
      followedRules: normalized.followedRules === true || normalized.followedRules === "true",
      ruleChecks: Array.isArray(normalized.ruleChecks) ? normalized.ruleChecks : String(normalized.ruleChecks || "").split("|").filter(Boolean),
    };
  });
  return nextState;
}

async function loadPersistedState() {
  try {
    const response = await fetch(journalApiUrl());
    if (response.ok) {
      state = normalizeState(await response.json());
      localStorage.setItem(journalStorageKey(), JSON.stringify(state));
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
  localStorage.setItem(journalStorageKey(), JSON.stringify(state));
  const savedToFile = await saveStateToServer();
  updateSidebar();
  return savedToFile;
}

async function saveStateToServer() {
  setSyncStatus("Saving", "saving");
  try {
    const response = await fetch(journalApiUrl(), {
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

function quoteApiUrl(params) {
  const search = new URLSearchParams(params);
  return `/api/quote?${search.toString()}`;
}

async function fetchLiveQuote(params) {
  const response = await fetch(quoteApiUrl(params));
  if (!response.ok) throw new Error("Quote unavailable");
  const quote = await response.json();
  if (!Number(quote.price)) throw new Error("Quote unavailable");
  return quote;
}

async function fetchLiveQuoteForTrade(trade) {
  if (!isOptionTrade(trade)) return fetchLiveQuote({ symbol: trade.symbol });

  if (isCreditSpreadStrategy(trade.strategy)) {
    const legs = spreadLegs(trade);
    const quotes = await Promise.all(legs.map((leg) => fetchLiveQuote({
      symbol: trade.symbol,
      optionType: leg.type,
      expiration: leg.expiration,
      strike: leg.strike,
    })));
    // Net debit to close: buy back the short legs, sell the long legs.
    const price = quotes.reduce((sum, quote, index) => sum + (legs[index].side === "short" ? quote.price : -quote.price), 0);
    return {
      ...quotes[0],
      price,
      legs: legs.length,
      source: `${quotes[0].source} (${legs.length} legs)`,
    };
  }

  if (!isPmccStrategy(trade.strategy)) {
    return fetchLiveQuote({
      symbol: trade.symbol,
      optionType: trade.optionType || optionTypeForStrategy(trade.strategy),
      expiration: trade.optionExpiration,
      strike: trade.optionStrike,
      optionSymbol: trade.optionSymbol || "",
    });
  }

  const longQuote = await fetchLiveQuote({
    symbol: trade.symbol,
    optionType: "call",
    expiration: trade.pmccLongExpiration,
    strike: trade.pmccLongStrike,
  });
  const openCalls = pmccCallsSummary(trade).calls.filter((call) => call.debit === "");
  const shortQuotes = await Promise.all(openCalls.map(async (call) => ({
    call,
    quote: await fetchLiveQuote({
      symbol: trade.symbol,
      optionType: "call",
      expiration: call.expiration,
      strike: call.strike,
    }),
  })));
  const contracts = Number(trade.contracts || 1);
  const multiplier = Number(trade.contractMultiplier || 100);
  const longPnl = (longQuote.price - Number(trade.pmccLongDebit || trade.entry || 0)) * contracts * multiplier;
  const shortPnl = shortQuotes.reduce((sum, item) => sum
    + (Number(item.call.credit || 0) - item.quote.price) * contracts * multiplier, 0);
  return {
    ...longQuote,
    price: longQuote.price,
    pnl: longPnl + shortPnl + pmccCallsSummary(trade).realized - Number(trade.fees || 0),
    legs: shortQuotes.length + 1,
    source: `${longQuote.source}${shortQuotes.length ? ` + ${shortQuotes.length} short call${shortQuotes.length === 1 ? "" : "s"}` : ""}`,
  };
}

async function refreshLiveQuotes() {
  if (liveQuotesLoading) return;
  const openPositions = state.trades.filter(isTradeOpen);
  if (!openPositions.length) {
    liveQuotes = new Map();
    underlyingQuotes = new Map();
    liveQuotesUpdatedAt = null;
    updateLiveMounts();
    return;
  }
  liveQuotesLoading = true;
  updateLiveMounts();
  const results = await Promise.all(openPositions.map(async (trade) => {
    try {
      return [trade.id, { status: "ready", ...(await fetchLiveQuoteForTrade(trade)) }];
    } catch {
      return [trade.id, { status: "unavailable" }];
    }
  }));
  const optionSymbols = [...new Set(openPositions.filter(isOptionTrade).map((trade) => String(trade.symbol).toUpperCase()))];
  const spots = await Promise.all(optionSymbols.map(async (symbol) => {
    try {
      return [symbol, await fetchLiveQuote({ symbol })];
    } catch {
      return [symbol, null];
    }
  }));
  liveQuotes = new Map(results);
  underlyingQuotes = new Map(spots.filter(([, quote]) => quote));
  liveQuotesUpdatedAt = new Date();
  liveQuotesLoading = false;
  updateLiveMounts();
}

function liveQuoteTimestamp() {
  if (!liveQuotesUpdatedAt) return "Waiting for quotes";
  return `Updated ${liveQuotesUpdatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
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

function startingBalance() {
  return Number(state.settings?.startingBalance || 0);
}

function number(value, digits = 2) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function tradeQuantity(trade) {
  if (isOptionTrade(trade)) {
    return Number(trade.contracts || trade.size || 0) * Number(trade.contractMultiplier || 100);
  }
  return Number(trade.size || 0);
}

function displayQuantity(trade) {
  if (!isOptionTrade(trade)) return `${number(trade.size, 4)} shares`;
  const contracts = Number(trade.contracts || trade.size || 0);
  return `${number(contracts, 0)} contract${contracts === 1 ? "" : "s"}`;
}

function isOptionTrade(trade) {
  return trade.assetClass === "Options" || Boolean(trade.optionType || trade.optionExpiration || trade.optionStrike || trade.optionSymbol);
}

function optionContractLabel(trade) {
  if (!isOptionTrade(trade)) return "";
  if (trade.strategy === "Poor Man's Covered Call") {
    const longLeg = [trade.pmccLongExpiration, trade.pmccLongStrike ? number(trade.pmccLongStrike, 2) : "", "LONG CALL"].filter(Boolean).join(" ");
    const shortLeg = [trade.pmccShortExpiration, trade.pmccShortStrike ? number(trade.pmccShortStrike, 2) : "", "SHORT CALL"].filter(Boolean).join(" ");
    return [longLeg, shortLeg].filter(Boolean).join(" / ") || "PMCC";
  }
  if (isCreditSpreadStrategy(trade.strategy)) return spreadContractLabel(trade);
  const type = trade.optionType ? trade.optionType.toUpperCase() : "OPTION";
  const details = [trade.optionExpiration, trade.optionStrike ? number(trade.optionStrike, 2) : "", type].filter(Boolean).join(" ");
  return trade.optionSymbol || details || "Option contract";
}

function optionTypeForStrategy(strategy = "", fallback = "call") {
  if (strategy === "Diagonal Credit Spread") return fallback === "put" ? "put" : "call";
  return strategy.toLowerCase().includes("put") ? "put" : "call";
}

function isCreditSpreadStrategy(strategy = "") {
  return creditSpreadStrategies.includes(strategy);
}

function spreadLegs(trade) {
  const expiration = trade.optionExpiration;
  if (trade.strategy === "Iron Condor") {
    return [
      { side: "short", type: "put", expiration, strike: Number(trade.spreadShortStrike || 0) },
      { side: "long", type: "put", expiration, strike: Number(trade.spreadLongStrike || 0) },
      { side: "short", type: "call", expiration, strike: Number(trade.spreadCallShortStrike || 0) },
      { side: "long", type: "call", expiration, strike: Number(trade.spreadCallLongStrike || 0) },
    ];
  }
  const type = optionTypeForStrategy(trade.strategy, trade.optionType);
  return [
    { side: "short", type, expiration, strike: Number(trade.spreadShortStrike || 0) },
    {
      side: "long",
      type,
      expiration: trade.strategy === "Diagonal Credit Spread" ? trade.spreadLongExpiration : expiration,
      strike: Number(trade.spreadLongStrike || 0),
    },
  ];
}

function spreadContractLabel(trade) {
  const strike = (value) => number(value, 2);
  if (trade.strategy === "Iron Condor") {
    return `${trade.optionExpiration} ${strike(trade.spreadLongStrike)}/${strike(trade.spreadShortStrike)}P ${strike(trade.spreadCallShortStrike)}/${strike(trade.spreadCallLongStrike)}C`;
  }
  const type = optionTypeForStrategy(trade.strategy, trade.optionType).toUpperCase();
  if (trade.strategy === "Diagonal Credit Spread") {
    return `${trade.optionExpiration} ${strike(trade.spreadShortStrike)} SHORT / ${trade.spreadLongExpiration} ${strike(trade.spreadLongStrike)} LONG ${type}`;
  }
  return `${trade.optionExpiration} ${strike(trade.spreadShortStrike)}/${strike(trade.spreadLongStrike)} ${type} SPREAD`;
}

// Defined max loss in dollars. Diagonals have no fixed max loss because the
// long leg keeps time value after the short leg expires.
function spreadMaxLoss({ strategy, spreadShortStrike, spreadLongStrike, spreadCallShortStrike, spreadCallLongStrike, entry, contracts }) {
  const putWidth = Math.abs(Number(spreadShortStrike || 0) - Number(spreadLongStrike || 0));
  const callWidth = Math.abs(Number(spreadCallShortStrike || 0) - Number(spreadCallLongStrike || 0));
  let width = 0;
  if (strategy === "Iron Condor") width = Math.max(putWidth, callWidth);
  else if (strategy === "Put Credit Spread" || strategy === "Call Credit Spread") width = putWidth;
  return Math.max(0, (width - Number(entry || 0)) * Number(contracts || 0) * 100);
}

function normalizePmccWeeklyCalls(calls = []) {
  if (typeof calls === "string") {
    try {
      calls = calls ? JSON.parse(calls) : [];
    } catch {
      calls = [];
    }
  }
  if (!Array.isArray(calls)) return [];
  return calls.map((call) => ({
    id: call.id || crypto.randomUUID(),
    sellDate: call.sellDate || call.date || "",
    expiration: call.expiration || "",
    strike: Number(call.strike || 0),
    credit: Number(call.credit || 0),
    buybackDate: call.buybackDate || "",
    debit: call.debit === "" || call.debit === null || call.debit === undefined ? "" : Number(call.debit || 0),
    notes: call.notes || "",
  })).filter((call) => call.expiration || call.strike || call.credit || call.debit !== "");
}

function pmccCallPnl(call, contracts = 1) {
  if (call.debit === "") return 0;
  return (Number(call.credit || 0) - Number(call.debit || 0)) * Number(contracts || 1) * 100;
}

function pmccCallsSummary(trade) {
  const calls = normalizePmccWeeklyCalls(trade.pmccWeeklyCalls);
  const contracts = Number(trade.contracts || 1);
  const totalCredit = calls.reduce((sum, call) => sum + Number(call.credit || 0) * contracts * 100, 0);
  const realized = calls.reduce((sum, call) => sum + pmccCallPnl(call, contracts), 0);
  const openCalls = calls.filter((call) => call.debit === "").length;
  return { calls, totalCredit, realized, openCalls };
}

function isAssignedShareLot(trade) {
  return Boolean(trade?.assignedFromCspId);
}

function assignedShareCostBasis(trade) {
  const shares = Number(trade?.assignedShares || trade?.size || 0);
  if (!shares) return Number(trade?.entry || 0);
  return Number(trade?.entry || 0) - Number(trade?.assignedPutCreditNet || 0) / shares;
}

function isCoveredCallTrade(trade) {
  return Boolean(trade?.coveredCallForId);
}

function assignedShareSummary(trade) {
  const calls = state.trades.filter((item) => item.coveredCallForId === trade.id);
  const realizedCallPnl = calls
    .filter((call) => !isTradeOpen(call))
    .reduce((sum, call) => sum + tradePnl(call), 0);
  const openCallContracts = calls
    .filter(isTradeOpen)
    .reduce((sum, call) => sum + Number(call.contracts || 0), 0);
  const shares = Number(trade.assignedShares || trade.size || 0);
  const grossShareCost = Number(trade.entry || 0) * shares;
  const netPutCredit = Number(trade.assignedPutCreditNet || 0);
  const adjustedAverageCost = shares ? (grossShareCost - netPutCredit - realizedCallPnl) / shares : 0;
  return {
    calls,
    shares,
    netPutCredit,
    realizedCallPnl,
    openCallContracts,
    availableCallContracts: Math.max(0, Math.floor(Number(trade.size || 0) / 100) - openCallContracts),
    adjustedAverageCost,
  };
}

function directionForStrategy(strategy = "", fallback = "Long") {
  if (["Cash Secured Put", "Covered Call", ...creditSpreadStrategies].includes(strategy)) return "Short";
  if (["Long Call", "Long Put", "Poor Man's Covered Call"].includes(strategy)) return "Long";
  return fallback;
}

function entryExitLabelsForStrategy(strategy = "") {
  if (isPmccStrategy(strategy)) {
    return {
      entry: "LEAP Debit",
      exit: "LEAP Exit Credit",
      placeholder: "Blank while PMCC remains open",
    };
  }
  if (isCreditSpreadStrategy(strategy)) {
    return {
      entry: "Net Credit",
      exit: "Close Debit",
      placeholder: "Net debit to close the spread",
    };
  }
  const isShortPremium = directionForStrategy(strategy) === "Short";
  return {
    entry: isShortPremium ? "Entry Credit" : "Entry Debit",
    exit: isShortPremium ? "Close Debit" : "Exit Credit",
    placeholder: isShortPremium ? "Buy-back debit while closing" : "Blank while open",
  };
}

function tradeEntryExitLabel(trade) {
  if (!isOptionTrade(trade)) return "Purchase / Sale";
  const labels = entryExitLabelsForStrategy(trade.strategy);
  return `${labels.entry} / ${labels.exit}`;
}

function isPmccStrategy(strategy = "") {
  return strategy === "Poor Man's Covered Call";
}

function isCashSecuredPut(trade) {
  return Boolean(trade && isOptionTrade(trade) && trade.strategy === "Cash Secured Put");
}

function tradePnl(trade) {
  if (isTradeOpen(trade)) return 0;
  // Assignment transfers the put credit into the share basis instead of
  // realizing it as CSP profit on the assignment date.
  if (trade.assignedTradeId) return 0;
  if (isPmccStrategy(trade.strategy)) {
    const contracts = Number(trade.contracts || trade.size || 0);
    const multiplier = Number(trade.contractMultiplier || 100);
    const longDebit = Number(trade.pmccLongDebit || trade.entry || 0);
    const longPnl = (Number(trade.exit || 0) - longDebit) * contracts * multiplier;
    return longPnl + pmccCallsSummary(trade).realized - (Number(trade.fees) || 0);
  }
  const partials = parsePartials(trade.partials);
  let gross;
  const quantity = tradeQuantity(trade);
  const entryPrice = isAssignedShareLot(trade) ? assignedShareCostBasis(trade) : Number(trade.entry || 0);
  if (partials.length) {
    const closedSize = partials.reduce((sum, item) => sum + item.size, 0);
    const partialGross = partials.reduce((sum, item) => {
      return sum + (trade.direction === "Long"
        ? (item.price - entryPrice) * item.size * (isOptionTrade(trade) ? Number(trade.contractMultiplier || 100) : 1)
        : (entryPrice - item.price) * item.size * (isOptionTrade(trade) ? Number(trade.contractMultiplier || 100) : 1));
    }, 0);
    const remaining = Math.max(0, (isOptionTrade(trade) ? Number(trade.contracts || trade.size || 0) : trade.size) - closedSize);
    const remainingGross = trade.direction === "Long"
      ? (trade.exit - entryPrice) * remaining * (isOptionTrade(trade) ? Number(trade.contractMultiplier || 100) : 1)
      : (entryPrice - trade.exit) * remaining * (isOptionTrade(trade) ? Number(trade.contractMultiplier || 100) : 1);
    gross = partialGross + remainingGross;
  } else {
    gross = trade.direction === "Long"
      ? (trade.exit - entryPrice) * quantity
      : (entryPrice - trade.exit) * quantity;
  }
  return gross - (Number(trade.fees) || 0);
}

function liveQuoteForTrade(trade) {
  return liveQuotes.get(trade.id) || null;
}

function livePnl(trade) {
  const quote = liveQuoteForTrade(trade);
  if (!quote?.price) return null;
  if (isPmccStrategy(trade.strategy)) return quote.pnl;
  const quantity = tradeQuantity(trade);
  const entryPrice = isAssignedShareLot(trade) ? assignedShareCostBasis(trade) : Number(trade.entry || 0);
  const gross = trade.direction === "Short"
    ? (entryPrice - quote.price) * quantity
    : (quote.price - entryPrice) * quantity;
  return gross - Number(trade.fees || 0);
}

function livePositionSummary() {
  const positions = state.trades.filter(isTradeOpen);
  const priced = positions.filter((trade) => livePnl(trade) !== null);
  return {
    positions,
    priced,
    total: priced.reduce((sum, trade) => sum + livePnl(trade), 0),
  };
}

function tradeR(trade) {
  if (isTradeOpen(trade)) return 0;
  const actualRisk = Number(trade.actualRisk || 0);
  if (actualRisk > 0) return tradePnl(trade) / actualRisk;
  const riskPerUnit = trade.direction === "Long"
    ? trade.entry - trade.stop
    : trade.stop - trade.entry;
  const risk = riskPerUnit * tradeQuantity(trade);
  if (!risk || risk <= 0) return 0;
  return tradePnl(trade) / risk;
}

function isTradeOpen(trade) {
  return !trade.exitDate;
}

function closedTrades(trades = state.trades) {
  return trades.filter((trade) => !isTradeOpen(trade) && !trade.assignedTradeId);
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

function tradeDurationMinutes(trade) {
  if (!trade.entryTime) return 0;
  const exitDate = isTradeOpen(trade) ? localDateKey() : trade.exitDate || trade.date;
  const exitTime = isTradeOpen(trade)
    ? new Date().toTimeString().slice(0, 5)
    : trade.exitTime;
  if (!exitTime) return 0;
  const entry = new Date(`${trade.date}T${trade.entryTime}`);
  const exit = new Date(`${exitDate}T${exitTime}`);
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
  if (isTradeOpen(trade)) return `${trade.date} to Open`;
  const exitDate = trade.exitDate || trade.date;
  return exitDate && exitDate !== trade.date ? `${trade.date} to ${exitDate}` : trade.date;
}

function tradeTimeLabel(trade) {
  const end = isTradeOpen(trade)
    ? "Open"
    : `${trade.exitDate && trade.exitDate !== trade.date ? `${trade.exitDate} ` : ""}${trade.exitTime || "Closed"}`;
  return `${trade.date} ${trade.entryTime || ""} - ${end}`.trim();
}

function tradeRealizedDate(trade) {
  return isTradeOpen(trade) ? "" : trade.exitDate || trade.date;
}

function metrics(trades = state.trades) {
  const realized = closedTrades(trades);
  const total = realized.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const wins = realized.filter((trade) => tradePnl(trade) > 0);
  const losses = realized.filter((trade) => tradePnl(trade) < 0);
  const grossWin = wins.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + tradePnl(trade), 0));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = realized.length ? ((wins.length / realized.length) * avgWin) - ((losses.length / realized.length) * avgLoss) : 0;
  return {
    total,
    count: realized.length,
    openCount: trades.filter(isTradeOpen).length,
    winRate: realized.length ? (wins.length / realized.length) * 100 : 0,
    avgWin,
    avgLoss,
    expectancy,
  };
}

async function switchJournal(event) {
  const nextJournalId = event.currentTarget.value;
  if (nextJournalId === activeJournalId) return;
  await saveState();
  activeJournalId = nextJournalId;
  localStorage.setItem(ACTIVE_JOURNAL_KEY, activeJournalId);
  syncStatus = { text: "Loading", mode: "saving" };
  await loadPersistedState();
  selectedTradeId = state.trades[0]?.id ?? null;
  selectedDay = localDateKey();
  editingTradeId = null;
  playbookEditing = null;
  liveQuotes = new Map();
  underlyingQuotes = new Map();
  liveQuotesUpdatedAt = null;
  if (tradeDrawer.open) tradeDrawer.close();
  render();
  showToast(`Switched to ${activeJournal()[1]}`);
}

async function addCoveredCall(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const assignedTrade = state.trades.find((item) => item.id === data.assignedTradeId);
  if (!assignedTrade || !isAssignedShareLot(assignedTrade) || !isTradeOpen(assignedTrade)) return;

  const sellDate = data.sellDate;
  const expiration = data.expiration;
  const strike = Number(data.strike || 0);
  const contracts = Number(data.contracts || 0);
  const credit = Number(data.credit || 0);
  const fees = Number(data.fees || 0);
  const summary = assignedShareSummary(assignedTrade);
  if (!sellDate || !expiration || expiration < sellDate || sellDate < assignedTrade.date) {
    showToast("Use valid sold and expiration dates for this covered call");
    return;
  }
  if (!Number.isFinite(strike) || strike <= 0
    || !Number.isFinite(credit) || credit <= 0
    || !Number.isFinite(fees) || fees < 0
    || !Number.isInteger(contracts) || contracts < 1) {
    showToast("Add a valid strike, contract count, credit, and non-negative fees");
    return;
  }
  if (contracts > summary.availableCallContracts) {
    showToast(`Only ${summary.availableCallContracts} contract${summary.availableCallContracts === 1 ? "" : "s"} available to cover`);
    return;
  }

  const call = {
    id: crypto.randomUUID(),
    date: sellDate,
    exitDate: "",
    entryTime: "09:30",
    exitTime: "",
    symbol: assignedTrade.symbol,
    assetClass: "Options",
    account: assignedTrade.account,
    direction: "Short",
    strategy: "Covered Call",
    optionType: "call",
    optionExpiration: expiration,
    optionStrike: strike,
    optionSymbol: "",
    contracts,
    contractMultiplier: 100,
    entry: credit,
    exit: 0,
    size: contracts,
    fees,
    stop: 0,
    target: 0,
    plannedEntry: credit,
    plannedStop: 0,
    plannedTarget: 0,
    plannedRisk: 0,
    actualRisk: 0,
    session: "Open",
    quality: "A",
    emotion: "Calm",
    mistake: "None",
    market: "",
    image: "",
    customTags: "covered-call",
    partials: "",
    notes: "",
    pmccWeeklyCalls: [],
    assignedFromCspId: "",
    assignedPutCreditNet: 0,
    assignedShares: 0,
    assignedTradeId: "",
    coveredCallForId: assignedTrade.id,
    ruleChecks: [],
    followedRules: true,
  };
  state.trades.unshift(call);
  selectedTradeId = assignedTrade.id;
  const savedToFile = await saveState();
  showToast(savedToFile ? "Covered call saved" : "Covered call saved in browser only. Start the local server to save to file.");
  render();
}

async function closeCoveredCall(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const call = state.trades.find((item) => item.id === data.callTradeId);
  if (!call || !isCoveredCallTrade(call) || !isTradeOpen(call)) return;
  const debit = Number(data.debit);
  if (data.debit === "" || !Number.isFinite(debit) || debit < 0) {
    showToast("Enter the buyback debit, or 0 if the call expired worthless");
    return;
  }
  if (!data.closeDate || data.closeDate < call.date) {
    showToast("Close date cannot be before the call's sold date");
    return;
  }
  call.exit = debit;
  call.exitDate = data.closeDate;
  call.exitTime = new Date().toTimeString().slice(0, 5);
  const assignedTrade = state.trades.find((item) => item.id === call.coveredCallForId);
  selectedTradeId = assignedTrade?.id || call.id;
  const savedToFile = await saveState();
  showToast(savedToFile ? "Covered call closed" : "Covered call closed in browser only. Start the local server to save to file.");
  render();
}

function renderAssignedShareCalls(trade) {
  const summary = assignedShareSummary(trade);
  return `
    <section class="pmcc-ledger covered-call-ledger">
      <div class="panel-header compact-header">
        <div>
          <span class="eyebrow">Cash Secured Put Assignment</span>
          <h3>Assigned Shares &amp; Covered Calls</h3>
        </div>
        <div class="pmcc-summary">
          <span>Shares <strong>${number(summary.shares, 0)}</strong></span>
          <span>Assigned strike <strong>${money(Number(trade.entry || 0))} / share</strong></span>
          <span>Net put credit <strong>${money(summary.netPutCredit)}</strong></span>
          <span>Call P&amp;L <strong class="${summary.realizedCallPnl >= 0 ? "positive" : "negative"}">${money(summary.realizedCallPnl)}</strong></span>
          <span>Adjusted avg cost <strong>${money(summary.adjustedAverageCost)} / share</strong></span>
        </div>
      </div>
      <p class="muted">The put credit is carried into share cost basis, not counted as realized CSP profit. Adjusted average cost also includes closed covered-call P&amp;L; open call premium is excluded until the call is closed or expires.</p>
      ${summary.calls.length ? `
        <div class="table-wrap pmcc-table-wrap">
          <table class="pmcc-table">
            <thead><tr><th>Sold</th><th>Expiration</th><th>Strike</th><th>Contracts</th><th>Credit</th><th>Close debit / date</th><th>Net P&amp;L</th></tr></thead>
            <tbody>
              ${summary.calls.map((call) => `
                <tr>
                  <td>${call.date}</td>
                  <td>${call.optionExpiration}</td>
                  <td>${number(call.optionStrike, 2)}</td>
                  <td>${number(call.contracts, 0)}</td>
                  <td>${money(Number(call.entry || 0) * Number(call.contracts || 0) * Number(call.contractMultiplier || 100))}</td>
                  <td>${isTradeOpen(call) ? renderCoveredCallCloseForm(call) : money(Number(call.exit || 0) * Number(call.contracts || 0) * Number(call.contractMultiplier || 100))}</td>
                  <td class="${isTradeOpen(call) ? "" : tradePnl(call) >= 0 ? "positive" : "negative"}">${isTradeOpen(call) ? "Open" : money(tradePnl(call))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No covered calls logged against these shares yet.</div>`}
      ${isTradeOpen(trade) && summary.availableCallContracts > 0 ? `
        <form class="pmcc-call-form covered-call-form" data-covered-call-form>
          <input name="assignedTradeId" type="hidden" value="${trade.id}" />
          <div class="covered-call-fields">
            <label>Sold <input name="sellDate" type="date" value="${localDateKey()}" required /></label>
            <label>Expiration <input name="expiration" type="date" required /></label>
            <label>Strike <input name="strike" type="number" min="0.01" step="0.01" required /></label>
            <label>Contracts <input name="contracts" type="number" min="1" max="${summary.availableCallContracts}" step="1" value="${summary.availableCallContracts}" required /></label>
            <label>Credit / Contract <input name="credit" type="number" min="0.01" step="0.01" required /></label>
            <label>Total fees <input name="fees" type="number" min="0" step="0.01" value="0" /></label>
          </div>
          <div class="covered-call-footer">
            <p class="covered-call-availability"><span class="covered-call-availability-dot" aria-hidden="true"></span><strong>${summary.availableCallContracts} contract${summary.availableCallContracts === 1 ? "" : "s"}</strong> available to cover</p>
            <button class="primary-button" type="submit">Sell Covered Call</button>
          </div>
        </form>
      ` : isTradeOpen(trade) ? `<p class="muted">All assigned shares are currently covered by open calls.</p>` : ""}
    </section>
  `;
}

function renderCoveredCallCloseForm(call) {
  return `
    <form class="pmcc-close-form" data-close-covered-call-form>
      <input name="callTradeId" type="hidden" value="${call.id}" />
      <input name="debit" type="number" min="0" step="0.01" placeholder="0 if expired" aria-label="Buyback debit per contract" required />
      <input name="closeDate" type="date" value="${localDateKey()}" aria-label="Covered call close date" required />
      <button class="ghost-button compact-button" type="submit">Close</button>
    </form>
  `;
}

function renderPmccWeeklyCalls(trade) {
  const summary = pmccCallsSummary(trade);
  return `
    <div class="pmcc-ledger" data-pmcc-trade-id="${trade.id}">
      <div class="panel-header compact-header">
        <div>
          <span class="eyebrow">PMCC Income</span>
          <h3>Weekly Calls</h3>
        </div>
        <div class="pmcc-summary">
          <span>Credits <strong>${money(summary.totalCredit)}</strong></span>
          <span>Realized <strong class="${summary.realized >= 0 ? "positive" : "negative"}">${money(summary.realized)}</strong></span>
          <span>Open <strong>${summary.openCalls}</strong></span>
        </div>
      </div>
      ${summary.calls.length ? `
        <div class="table-wrap pmcc-table-wrap">
          <table class="pmcc-table">
            <thead>
              <tr><th>Sold</th><th>Expiration</th><th>Strike</th><th>Credit</th><th>Buyback</th><th>P&L</th><th></th></tr>
            </thead>
            <tbody>
              ${summary.calls.map((call) => `
                <tr>
                  <td>${call.sellDate || "—"}</td>
                  <td>${call.expiration || "—"}</td>
                  <td>${call.strike ? number(call.strike, 2) : "—"}</td>
                  <td>${money(Number(call.credit || 0) * Number(trade.contracts || 1) * 100)}</td>
                  <td>${call.debit === "" ? renderPmccCallCloseForm(trade.id, call.id) : money(Number(call.debit || 0) * Number(trade.contracts || 1) * 100)}</td>
                  <td class="${call.debit === "" ? "" : pmccCallPnl(call, trade.contracts) >= 0 ? "positive" : "negative"}">${call.debit === "" ? "Open" : money(pmccCallPnl(call, trade.contracts))}</td>
                  <td><button class="ghost-button compact-button" data-delete-pmcc-call="${call.id}" type="button">Delete</button></td>
                </tr>
                ${call.notes ? `<tr class="pmcc-note-row"><td colspan="7">${escapeHtml(call.notes)}</td></tr>` : ""}
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No weekly calls logged for this PMCC yet.</div>`}
      <form class="pmcc-call-form" data-pmcc-call-form>
        <input name="tradeId" type="hidden" value="${trade.id}" />
        <label>Sold <input name="sellDate" type="date" value="${localDateKey()}" required /></label>
        <label>Expiration <input name="expiration" type="date" required /></label>
        <label>Strike <input name="strike" type="number" step="0.01" required /></label>
        <label>Credit / Contract <input name="credit" type="number" step="0.01" required /></label>
        <label>Buyback / Contract <input name="debit" type="number" step="0.01" placeholder="Blank while open" /></label>
        <label>Buyback Date <input name="buybackDate" type="date" /></label>
        <label class="wide">Notes <input name="notes" type="text" placeholder="Roll, assignment risk, reason for strike" /></label>
        <button class="primary-button" type="submit">Add Weekly Call</button>
      </form>
    </div>
  `;
}

function renderPmccCallCloseForm(tradeId, callId) {
  return `
    <form class="pmcc-close-form" data-close-pmcc-call-form>
      <input name="tradeId" type="hidden" value="${tradeId}" />
      <input name="callId" type="hidden" value="${callId}" />
      <input name="debit" type="number" step="0.01" placeholder="Debit/ct" required />
      <input name="buybackDate" type="date" value="${localDateKey()}" required />
      <button class="ghost-button compact-button" type="submit">Close</button>
    </form>
  `;
}

function renderTag(value, className = "") {
  if (!value) return "";
  return `<span class="tag ${className}">${value}</span>`;
}

async function savePmccWeeklyCall(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const trade = state.trades.find((item) => item.id === data.tradeId);
  if (!trade) return;
  const call = {
    id: crypto.randomUUID(),
    sellDate: data.sellDate,
    expiration: data.expiration,
    strike: Number(data.strike || 0),
    credit: Number(data.credit || 0),
    buybackDate: data.debit !== "" ? (data.buybackDate || data.sellDate) : "",
    debit: data.debit === "" ? "" : Number(data.debit || 0),
    notes: String(data.notes || "").trim(),
  };
  if (!call.sellDate || !call.expiration || !call.strike || !call.credit) {
    showToast("Add sold date, expiration, strike, and credit for the weekly call");
    return;
  }
  if (call.expiration < call.sellDate) {
    showToast("Weekly call expiration cannot be before the sold date");
    return;
  }
  if (call.buybackDate && call.buybackDate < call.sellDate) {
    showToast("Buyback date cannot be before the sold date");
    return;
  }
  trade.pmccWeeklyCalls = [...normalizePmccWeeklyCalls(trade.pmccWeeklyCalls), call];
  const savedToFile = await saveState();
  showToast(savedToFile ? "Weekly call added" : "Weekly call saved in browser only. Start the local server to save to file.");
  renderTradeDetail();
}

async function deletePmccWeeklyCall(tradeId, callId) {
  const trade = state.trades.find((item) => item.id === tradeId);
  if (!trade) return;
  trade.pmccWeeklyCalls = normalizePmccWeeklyCalls(trade.pmccWeeklyCalls).filter((call) => call.id !== callId);
  const savedToFile = await saveState();
  showToast(savedToFile ? "Weekly call deleted" : "Weekly call deleted in browser only. Start the local server to save to file.");
  renderTradeDetail();
}

async function closePmccWeeklyCall(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const trade = state.trades.find((item) => item.id === data.tradeId);
  if (!trade) return;
  const calls = normalizePmccWeeklyCalls(trade.pmccWeeklyCalls);
  const call = calls.find((item) => item.id === data.callId);
  if (!call) return;
  if (data.buybackDate && call.sellDate && data.buybackDate < call.sellDate) {
    showToast("Buyback date cannot be before the sold date");
    return;
  }
  call.debit = Number(data.debit || 0);
  call.buybackDate = data.buybackDate || localDateKey();
  trade.pmccWeeklyCalls = calls;
  const savedToFile = await saveState();
  showToast(savedToFile ? "Weekly call closed" : "Weekly call closed in browser only. Start the local server to save to file.");
  renderTradeDetail();
}

function defaultFlowSymbols() {
  try {
    const saved = localStorage.getItem(FLOW_SYMBOLS_KEY);
    if (saved) return saved;
  } catch {
    // Storage can be unavailable; fall back to open positions.
  }
  const openSymbols = [...new Set(state.trades.filter(isTradeOpen).map((trade) => trade.symbol))];
  return openSymbols.length ? openSymbols.slice(0, 10).join(", ") : "SPY, QQQ";
}

function compactMoney(value) {
  const amount = Number(value || 0);
  return `${amount < 0 ? "-" : ""}$${Math.abs(amount).toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 })}`;
}

// Contracts from open journal positions, so matching flow can be flagged.
function heldContractKeys() {
  const keys = new Set();
  const add = (symbol, type, expiration, strike) => {
    if (type && expiration && Number(strike)) keys.add(`${symbol}|${type}|${expiration}|${Number(strike)}`);
  };
  state.trades.filter((trade) => isTradeOpen(trade) && isOptionTrade(trade)).forEach((trade) => {
    if (isCreditSpreadStrategy(trade.strategy)) {
      spreadLegs(trade).forEach((leg) => add(trade.symbol, leg.type, leg.expiration, leg.strike));
    } else if (isPmccStrategy(trade.strategy)) {
      add(trade.symbol, "call", trade.pmccLongExpiration, trade.pmccLongStrike);
      pmccCallsSummary(trade).calls
        .filter((call) => call.debit === "")
        .forEach((call) => add(trade.symbol, "call", call.expiration, call.strike));
    } else {
      add(trade.symbol, trade.optionType || optionTypeForStrategy(trade.strategy), trade.optionExpiration, trade.optionStrike);
    }
  });
  return keys;
}

function flowLean(summary) {
  if (!summary.callPremium && !summary.putPremium) return ["No volume", ""];
  if (summary.callPremium >= summary.putPremium * 1.5) return ["Call heavy", "good"];
  if (summary.putPremium >= summary.callPremium * 1.5) return ["Put heavy", "warn"];
  return ["Mixed", ""];
}

function renderFlow() {
  appView.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Options Flow</h2>
          <p class="muted">Unusual activity from Cboe's free delayed option chains. Side is inferred from where the last trade printed against the bid/ask.</p>
        </div>
      </div>
      <form class="filter-row flow-controls" id="flowForm">
        <input name="symbols" type="text" value="${escapeHtml(defaultFlowSymbols())}" placeholder="Tickers, e.g. AAPL, SPY, SPX" aria-label="Tickers" autocomplete="off" spellcheck="false" />
        <select name="minPremium" aria-label="Minimum premium">
          <option value="10000">Premium ≥ $10K</option>
          <option value="25000" selected>Premium ≥ $25K</option>
          <option value="100000">Premium ≥ $100K</option>
          <option value="500000">Premium ≥ $500K</option>
          <option value="1000000">Premium ≥ $1M</option>
        </select>
        <select name="maxDays" aria-label="Expiration window">
          <option value="0">Any expiration</option>
          <option value="7">Expires within 7 days</option>
          <option value="30">Expires within 30 days</option>
          <option value="90">Expires within 90 days</option>
        </select>
        <label class="flow-toggle"><input name="unusualOnly" type="checkbox" checked /> Volume above OI only</label>
        <button class="primary-button" type="submit">${flowLoading ? "Scanning…" : "Scan"}</button>
      </form>
    </section>
    <div id="flowResultsMount">${renderFlowResults()}</div>
  `;
  document.querySelector("#flowForm").addEventListener("submit", (event) => {
    event.preventDefault();
    scanFlow(Object.fromEntries(new FormData(event.currentTarget)));
  });
}

async function scanFlow(data) {
  if (flowLoading) return;
  try {
    localStorage.setItem(FLOW_SYMBOLS_KEY, data.symbols);
  } catch {
    // Remembering tickers is a convenience only.
  }
  flowLoading = true;
  flowError = "";
  const button = document.querySelector("#flowForm button[type=submit]");
  if (button) button.textContent = "Scanning…";
  try {
    const params = new URLSearchParams({
      symbols: data.symbols || "",
      minPremium: data.minPremium || "25000",
      maxDays: data.maxDays || "0",
      unusualOnly: data.unusualOnly ? "true" : "false",
    });
    const response = await fetch(`/api/flow?${params}`);
    if (response.status === 404) throw new Error("The server is running an older version without the flow scanner. Stop it (Ctrl+C) and run node server.js again.");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Flow scan failed");
    flowResult = payload;
  } catch (error) {
    flowResult = null;
    flowError = location.protocol === "file:"
      ? "The flow scanner needs the local server. Run node server.js and open http://localhost:4173."
      : error.message || "Flow scan failed";
  }
  flowLoading = false;
  if (activeView !== "flow") return;
  if (button) button.textContent = "Scan";
  document.querySelector("#flowResultsMount").innerHTML = renderFlowResults();
}

function renderFlowResults() {
  if (flowLoading && !flowResult) return `<section class="panel" style="margin-top:18px"><div class="empty-state">Scanning option chains…</div></section>`;
  if (flowError) return `<section class="panel" style="margin-top:18px"><div class="empty-state">${escapeHtml(flowError)}</div></section>`;
  if (!flowResult) return `<section class="panel" style="margin-top:18px"><div class="empty-state">Enter tickers and scan to see where the option premium went.</div></section>`;
  const held = heldContractKeys();
  const { symbols, contracts } = flowResult;
  return `
    <section class="flow-summary-grid">
      ${symbols.map((summary) => {
        if (summary.error) {
          return `<article class="panel flow-summary"><div class="flow-summary-head"><h3>${escapeHtml(summary.symbol)}</h3></div><p class="muted">${escapeHtml(summary.error)}</p></article>`;
        }
        const total = summary.callPremium + summary.putPremium;
        const callShare = total ? summary.callPremium / total * 100 : 50;
        const [lean, leanClass] = flowLean(summary);
        return `
          <article class="panel flow-summary">
            <div class="flow-summary-head">
              <h3>${escapeHtml(summary.symbol)}</h3>
              <span class="tag ${leanClass}">${lean}</span>
            </div>
            <div class="flow-price">
              <strong>${money(summary.price)}</strong>
              <span class="${summary.priceChangePercent >= 0 ? "positive" : "negative"}">${summary.priceChangePercent >= 0 ? "+" : ""}${number(summary.priceChangePercent, 2)}%</span>
            </div>
            <div class="flow-split" role="img" aria-label="Calls ${number(callShare, 0)}% of premium">
              <span class="flow-split-calls" style="width:${callShare}%"></span>
            </div>
            <div class="metric-line"><span>Call premium</span><strong class="positive">${compactMoney(summary.callPremium)}</strong></div>
            <div class="metric-line"><span>Put premium</span><strong class="negative">${compactMoney(summary.putPremium)}</strong></div>
            <div class="metric-line"><span>Put/call volume</span><strong>${summary.putCallVolumeRatio === null ? "—" : number(summary.putCallVolumeRatio, 2)}</strong></div>
            <div class="metric-line"><span>IV30</span><strong>${summary.iv30 ? `${number(summary.iv30, 1)}%` : "—"}</strong></div>
            <small class="muted">As of ${escapeHtml(summary.timestamp || "latest snapshot")}</small>
          </article>
        `;
      }).join("")}
    </section>
    <section class="panel" style="margin-top:18px">
      <div class="panel-header">
        <div>
          <h2>Unusual Contracts</h2>
          <p class="muted">${contracts.length} contract${contracts.length === 1 ? "" : "s"} ranked by premium (volume × last price × 100). Volume above open interest suggests new positions.</p>
        </div>
      </div>
      ${contracts.length ? `
        <div class="table-wrap">
          <table class="flow-table">
            <thead>
              <tr><th>Symbol</th><th>Contract</th><th>DTE</th><th>Volume</th><th>OI</th><th>Vol/OI</th><th>Last</th><th>Bid / Ask</th><th>Side</th><th>Premium</th><th>IV</th><th>Delta</th></tr>
            </thead>
            <tbody>
              ${contracts.map((contract) => {
                const isHeld = held.has(`${contract.symbol}|${contract.type}|${contract.expiration}|${contract.strike}`);
                return `
                  <tr>
                    <td><strong>${escapeHtml(contract.symbol)}</strong>${isHeld ? ` <span class="tag good">Held</span>` : ""}</td>
                    <td>${contract.expiration} <strong>${number(contract.strike, 2)}</strong> <span class="${contract.type === "call" ? "positive" : "negative"}">${contract.type.toUpperCase()}</span></td>
                    <td>${contract.daysToExpiration}d</td>
                    <td>${number(contract.volume, 0)}</td>
                    <td>${number(contract.openInterest, 0)}</td>
                    <td>${contract.volumeOiRatio === null ? "New" : `${number(contract.volumeOiRatio, 1)}×`}</td>
                    <td>${number(contract.last, 2)}</td>
                    <td>${contract.bid || contract.ask ? `${number(contract.bid, 2)} / ${number(contract.ask, 2)}` : "—"}</td>
                    <td>${contract.side ? `<span class="tag ${contract.side === "ask" ? "good" : contract.side === "bid" ? "warn" : ""}">${contract.side === "ask" ? "At ask" : contract.side === "bid" ? "At bid" : "Mid"}</span>` : "—"}</td>
                    <td><strong>${compactMoney(contract.premium)}</strong></td>
                    <td>${contract.iv ? `${number(contract.iv * 100, 1)}%` : "—"}</td>
                    <td>${number(contract.delta, 2)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No contracts passed these filters. Lower the premium floor or include contracts with volume below open interest.</div>`}
    </section>
  `;
}

function defaultGexSymbol() {
  try {
    const saved = localStorage.getItem(GEX_SYMBOL_KEY);
    if (saved) return saved;
  } catch {
    // Storage can be unavailable; fall back to SPX.
  }
  return "SPX";
}

function renderGex() {
  gexView.symbol ||= defaultGexSymbol();
  const segmented = (name, options, current) => `
    <div class="segmented" role="group" aria-label="${name}">
      ${options.map(([value, label]) => `<button type="button" data-gex-${name}="${value}" class="${value === current ? "active" : ""}" aria-pressed="${value === current}">${label}</button>`).join("")}
    </div>
  `;
  appView.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Gamma Exposure</h2>
          <p class="muted">Dealer gamma (GEX) and delta (DEX) by strike from Cboe's free delayed chains. Assumes dealers are long calls and short puts. Refreshes every minute.</p>
        </div>
      </div>
      <form class="filter-row flow-controls gex-controls" id="gexForm">
        <input name="symbols" type="text" value="${escapeHtml(gexView.symbol)}" placeholder="Ticker, e.g. SPX, SPY, QQQ" aria-label="Ticker" autocomplete="off" spellcheck="false" />
        ${segmented("metric", [["gex", "GEX"], ["dex", "DEX"]], gexView.metric)}
        ${segmented("expiry", GEX_EXPIRY_LABELS, gexView.expiry)}
        <select name="window" aria-label="Strikes shown">
          ${[[15, "±15 strikes"], [25, "±25 strikes"], [40, "±40 strikes"], [60, "±60 strikes"]].map(([value, label]) => `<option value="${value}" ${value === gexView.window ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <button class="primary-button" type="submit">${gexView.loading ? "Loading…" : "Load"}</button>
      </form>
    </section>
    <div id="gexResultsMount">${renderGexResults()}</div>
  `;
  const form = document.querySelector("#gexForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    gexView.symbol = form.elements.symbols.value.trim().toUpperCase();
    try {
      localStorage.setItem(GEX_SYMBOL_KEY, gexView.symbol);
    } catch {
      // Remembering the ticker is a convenience only.
    }
    loadGex();
  });
  form.elements.window.addEventListener("change", () => {
    gexView.window = Number(form.elements.window.value);
    updateGexResults();
  });
  form.querySelectorAll("[data-gex-metric]").forEach((button) => button.addEventListener("click", () => {
    gexView.metric = button.dataset.gexMetric;
    renderGex();
  }));
  form.querySelectorAll("[data-gex-expiry]").forEach((button) => button.addEventListener("click", () => {
    gexView.expiry = button.dataset.gexExpiry;
    renderGex();
    loadGex();
  }));
  attachGexResultEvents();
  if (!gexView.data && !gexView.loading && !gexView.error) loadGex();
  if (!gexRefreshTimer) gexRefreshTimer = setInterval(() => loadGex({ quiet: true }), 60000);
}

async function loadGex({ quiet = false } = {}) {
  if (gexView.loading || !gexView.symbol) return;
  gexView.loading = true;
  if (!quiet) {
    gexView.error = "";
    const button = document.querySelector("#gexForm button[type=submit]");
    if (button) button.textContent = "Loading…";
  }
  try {
    const response = await fetch(`/api/gex?${new URLSearchParams({ symbol: gexView.symbol, expiry: gexView.expiry })}`);
    if (response.status === 404 && !response.headers.get("content-type")?.includes("json")) {
      throw new Error("The server is running an older version without GEX. Stop it (Ctrl+C) and run node server.js again.");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "GEX unavailable");
    gexView.data = payload;
    gexView.error = "";
  } catch (error) {
    if (!quiet || !gexView.data) {
      gexView.data = null;
      gexView.error = location.protocol === "file:"
        ? "GEX needs the local server. Run node server.js and open http://localhost:4173."
        : error.message || "GEX unavailable";
    }
  }
  gexView.loading = false;
  if (activeView !== "gex") return;
  const button = document.querySelector("#gexForm button[type=submit]");
  if (button) button.textContent = "Load";
  updateGexResults();
}

function updateGexResults() {
  const mount = document.querySelector("#gexResultsMount");
  if (!mount) return;
  mount.innerHTML = renderGexResults();
  attachGexResultEvents();
}

function gexMetricKey() {
  return gexView.metric === "dex" ? "netDex" : "netGex";
}

function gexVisibleStrikes(data) {
  const below = data.strikes.filter((row) => row.strike <= data.spot).slice(-gexView.window);
  const above = data.strikes.filter((row) => row.strike > data.spot).slice(0, gexView.window);
  return [...below, ...above].reverse();
}

function priceDistance(level, spot) {
  if (!level || !spot) return "";
  const percent = (level - spot) / spot * 100;
  return `${percent >= 0 ? "+" : ""}${number(percent, 2)}% from spot`;
}

function renderGexResults() {
  if (gexView.error) return `<section class="panel" style="margin-top:18px"><div class="empty-state">${escapeHtml(gexView.error)}</div></section>`;
  const data = gexView.data;
  if (!data) return `<section class="panel" style="margin-top:18px"><div class="empty-state">${gexView.loading ? "Loading option chain…" : "Enter a ticker and press Load."}</div></section>`;
  const { levels } = data;
  const isDex = gexView.metric === "dex";
  const metricLabel = isDex ? "DEX" : "GEX";
  const net = isDex ? levels.netDex : levels.netGex;
  const regime = levels.netGex >= 0
    ? ["Positive gamma", "Dealer hedging tends to dampen moves"]
    : ["Negative gamma", "Dealer hedging tends to amplify moves"];
  return `
    <section class="gex-levels">
      <article class="panel gex-level">
        <span>${escapeHtml(data.symbol)} spot</span>
        <strong>${number(data.spot, 2)}</strong>
        <small class="${data.priceChangePercent >= 0 ? "positive" : "negative"}">${data.priceChangePercent >= 0 ? "+" : ""}${number(data.priceChangePercent, 2)}% today</small>
      </article>
      <article class="panel gex-level">
        <span>Net ${metricLabel}</span>
        <strong>${compactMoney(net)}</strong>
        <small>${isDex ? "Dollar delta of open interest" : `${regime[0]}: ${regime[1].toLowerCase()}`}</small>
      </article>
      <article class="panel gex-level">
        <span>Gamma flip</span>
        <strong>${levels.gammaFlip ? number(levels.gammaFlip, 2) : "—"}</strong>
        <small>${levels.gammaFlip ? priceDistance(levels.gammaFlip, data.spot) : "No zero crossing within ±15%"}</small>
      </article>
      <article class="panel gex-level">
        <span>Call wall</span>
        <strong>${levels.callWall ? number(levels.callWall, 2) : "—"}</strong>
        <small>${priceDistance(levels.callWall, data.spot) || "Largest call gamma"}</small>
      </article>
      <article class="panel gex-level">
        <span>Put wall</span>
        <strong>${levels.putWall ? number(levels.putWall, 2) : "—"}</strong>
        <small>${priceDistance(levels.putWall, data.spot) || "Largest put gamma"}</small>
      </article>
    </section>
    ${renderGexStrikeChart(data)}
    ${renderGexHeatmap(data)}
    <p class="muted gex-footnote">Snapshot ${escapeHtml(data.timestamp || "")} UTC · ${escapeHtml(data.source)} · ${GEX_EXPIRY_LABELS.find(([value]) => value === data.expiry)?.[1] || "All exp"}. GEX is dollars per 1% move; it is an estimate from open interest and cannot see whether customers bought or sold.</p>
    <div class="chart-tooltip" id="gexTooltip" role="status" hidden></div>
  `;
}

function renderGexStrikeChart(data) {
  const key = gexMetricKey();
  const metricLabel = gexView.metric === "dex" ? "DEX" : "GEX";
  const rows = gexVisibleStrikes(data);
  if (!rows.length) {
    return `<section class="panel" style="margin-top:18px"><div class="empty-state">No open interest for this expiration filter${gexView.expiry === "0dte" ? ". This ticker may not have an expiration today." : "."}</div></section>`;
  }
  const max = Math.max(...rows.map((row) => Math.abs(row[key])), 1);
  const { callWall, putWall, gammaFlip } = data.levels;
  const markers = [
    { price: data.spot, label: `Spot ${number(data.spot, 2)}`, className: "spot" },
    ...(gammaFlip ? [{ price: gammaFlip, label: `Flip ${number(gammaFlip, 2)}`, className: "flip" }] : []),
    ...(data.expectedMove ? [
      { price: data.expectedMove.high, label: `EM +${number(data.expectedMove.high, 2)}`, className: "em" },
      { price: data.expectedMove.low, label: `EM −${number(data.expectedMove.low, 2)}`, className: "em" },
    ] : []),
  ];
  const lines = [];
  rows.forEach((row, index) => {
    const next = rows[index + 1];
    const value = row[key];
    const width = Math.abs(value) / max * 100;
    const tags = [row.strike === callWall ? "Call wall" : "", row.strike === putWall ? "Put wall" : ""].filter(Boolean);
    const tip = [
      `Strike ${number(row.strike, 2)}`,
      `Net ${metricLabel}: ${compactMoney(value)}`,
      `Calls: ${compactMoney(gexView.metric === "dex" ? row.callDex : row.callGex)}`,
      `Puts: ${compactMoney(gexView.metric === "dex" ? row.putDex : row.putGex)}`,
      `Open interest: ${number(row.callOi, 0)} calls / ${number(row.putOi, 0)} puts`,
    ].join("\n");
    lines.push(`
      <div class="gex-row" data-tip="${escapeHtml(tip)}">
        <span class="gex-strike">${number(row.strike, 2)}</span>
        <span class="gex-half gex-half-neg">${value < 0 ? `<i class="gex-bar neg" style="width:${width}%"></i>` : ""}</span>
        <span class="gex-half gex-half-pos">${value > 0 ? `<i class="gex-bar pos" style="width:${width}%"></i>` : ""}</span>
        <span class="gex-row-tags">${tags.map((tag) => `<b>${tag}</b>`).join("")}</span>
      </div>
    `);
    markers.filter((marker) => next && marker.price < row.strike && marker.price >= next.strike).forEach((marker) => {
      lines.push(`<div class="gex-marker ${marker.className}"><span>${marker.label}</span></div>`);
    });
  });
  return `
    <section class="panel" style="margin-top:18px">
      <div class="panel-header">
        <div>
          <h2>Net ${metricLabel} by strike</h2>
          <p class="muted">Bars left of center are negative, right are positive. Hover a strike for the call/put split.${data.expectedMove ? ` EM lines show the ${data.expectedMove.expiration} straddle-implied move (±${number(data.expectedMove.movePercent, 2)}%).` : ""}</p>
        </div>
        <div class="chart-legend">
          <span><i class="legend-swatch pos"></i>Positive ${metricLabel}</span>
          <span><i class="legend-swatch neg"></i>Negative ${metricLabel}</span>
        </div>
      </div>
      <div class="gex-chart" data-tip-scope>
        <div class="gex-axis"><span></span><span>${compactMoney(-max)}</span><span>0</span><span>${compactMoney(max)}</span><span></span></div>
        ${lines.join("")}
      </div>
      <details class="gex-table-toggle">
        <summary>Show as table</summary>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Strike</th><th>Call ${metricLabel}</th><th>Put ${metricLabel}</th><th>Net ${metricLabel}</th><th>Call OI</th><th>Put OI</th></tr></thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  <td><strong>${number(row.strike, 2)}</strong></td>
                  <td>${compactMoney(gexView.metric === "dex" ? row.callDex : row.callGex)}</td>
                  <td>${compactMoney(gexView.metric === "dex" ? row.putDex : row.putGex)}</td>
                  <td>${compactMoney(row[key])}</td>
                  <td>${number(row.callOi, 0)}</td>
                  <td>${number(row.putOi, 0)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  `;
}

function easternTimeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
}

function renderGexHeatmap(data) {
  const metricLabel = gexView.metric === "dex" ? "DEX" : "GEX";
  const snapshots = data.history?.snapshots || [];
  const header = `
    <div class="panel-header">
      <div>
        <h2>Intraday ${metricLabel} heatmap</h2>
        <p class="muted">One column per 5-minute snapshot today (ET). The outlined cell in each column is the strike nearest spot.</p>
      </div>
      <div class="segmented" role="group" aria-label="Heatmap values">
        ${[["value", "Value"], ["delta", "Δ since open"]].map(([value, label]) => `<button type="button" data-gex-heatmap="${value}" class="${value === gexView.heatmapMode ? "active" : ""}" aria-pressed="${value === gexView.heatmapMode}">${label}</button>`).join("")}
      </div>
    </div>
  `;
  if (snapshots.length < 2) {
    return `
      <section class="panel" style="margin-top:18px">
        ${header}
        <div class="empty-state">The heatmap fills in while the server runs during market hours (9:30–4:15 ET), adding a column every 5 minutes. ${snapshots.length ? "1 snapshot recorded so far." : "No snapshots recorded yet today."} ${escapeHtml(data.symbol)} keeps recording for 3 days after you last load it.</div>
      </section>
    `;
  }
  const column = (gexView.metric === "dex" ? 4 : 1) + GEX_EXPIRY_LABELS.findIndex(([value]) => value === data.expiry);
  const strikes = gexVisibleStrikes(data).map((row) => row.strike);
  const valuesBySnapshot = snapshots.map((snapshot) => new Map(snapshot.rows.map((row) => [row[0], row[column]])));
  const opening = valuesBySnapshot[0];
  const cellValue = (values, strike) => {
    const value = values.get(strike) ?? 0;
    return gexView.heatmapMode === "delta" ? value - (opening.get(strike) ?? 0) : value;
  };
  const max = Math.max(1, ...valuesBySnapshot.flatMap((values) => strikes.map((strike) => Math.abs(cellValue(values, strike)))));
  const nearestStrike = (spot) => strikes.reduce((best, strike) => (Math.abs(strike - spot) < Math.abs(best - spot) ? strike : best), strikes[0]);
  const spotStrikes = snapshots.map((snapshot) => nearestStrike(snapshot.spot));
  const labelEvery = Math.max(1, Math.ceil(snapshots.length / 8));
  return `
    <section class="panel" style="margin-top:18px">
      ${header}
      <div class="gex-heatmap-scroll">
        <div class="gex-heatmap" data-tip-scope style="grid-template-columns: 72px repeat(${snapshots.length}, minmax(8px, 1fr))">
          ${strikes.map((strike) => `
            <span class="gex-heatmap-strike">${number(strike, 2)}</span>
            ${valuesBySnapshot.map((values, index) => {
              const value = cellValue(values, strike);
              const intensity = Math.round(Math.sqrt(Math.abs(value) / max) * 100);
              const tone = value >= 0 ? "var(--gex-pos)" : "var(--gex-neg)";
              const tip = `${easternTimeLabel(snapshots[index].time)} ET · strike ${number(strike, 2)}\n${gexView.heatmapMode === "delta" ? "Change since open" : `Net ${metricLabel}`}: ${compactMoney(value)}\nSpot ${number(snapshots[index].spot, 2)}`;
              return `<i class="gex-cell ${spotStrikes[index] === strike ? "at-spot" : ""}" style="background:color-mix(in oklab, ${tone} ${intensity}%, var(--gex-mid))" data-tip="${escapeHtml(tip)}"></i>`;
            }).join("")}
          `).join("")}
          <span></span>
          ${snapshots.map((snapshot, index) => `<span class="gex-heatmap-time">${index % labelEvery === 0 ? easternTimeLabel(snapshot.time) : ""}</span>`).join("")}
        </div>
      </div>
      <div class="gex-scale" aria-hidden="true">
        <span>${compactMoney(-max)}</span>
        <i></i>
        <span>${compactMoney(max)}</span>
      </div>
    </section>
  `;
}

function attachGexResultEvents() {
  document.querySelectorAll("[data-gex-heatmap]").forEach((button) => button.addEventListener("click", () => {
    gexView.heatmapMode = button.dataset.gexHeatmap;
    updateGexResults();
  }));
  const tooltip = document.querySelector("#gexTooltip");
  if (!tooltip) return;
  document.querySelectorAll("#gexResultsMount [data-tip-scope]").forEach((scope) => {
    scope.addEventListener("mousemove", (event) => {
      const target = event.target.closest("[data-tip]");
      if (!target) {
        tooltip.hidden = true;
        return;
      }
      tooltip.textContent = target.dataset.tip;
      tooltip.hidden = false;
      const x = Math.min(event.clientX + 14, window.innerWidth - tooltip.offsetWidth - 8);
      const y = Math.min(event.clientY + 14, window.innerHeight - tooltip.offsetHeight - 8);
      tooltip.style.transform = `translate(${x}px, ${y}px)`;
    });
    scope.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
    });
  });
}

// Short option legs of an open trade, to compare against the expected move.
function shortLegsForTrade(trade) {
  if (isCreditSpreadStrategy(trade.strategy)) return spreadLegs(trade).filter((leg) => leg.side === "short");
  if (isPmccStrategy(trade.strategy)) {
    return pmccCallsSummary(trade).calls
      .filter((call) => call.debit === "")
      .map((call) => ({ expiration: call.expiration, strike: call.strike }));
  }
  return trade.direction === "Short" ? [{ expiration: trade.optionExpiration, strike: Number(trade.optionStrike || 0) }] : [];
}

function renderVolatility() {
  volView.symbol ||= (() => {
    try {
      return localStorage.getItem(VOL_SYMBOL_KEY) || "";
    } catch {
      return "";
    }
  })() || state.trades.find(isTradeOpen)?.symbol || "SPY";
  appView.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Expected Move & IV Rank</h2>
          <p class="muted">The move the options market is pricing for each expiration, and where implied volatility sits against its past year. From Cboe's free delayed data.</p>
        </div>
      </div>
      <form class="filter-row flow-controls gex-controls" id="volForm">
        <input name="symbols" type="text" value="${escapeHtml(volView.symbol)}" placeholder="Ticker, e.g. AAPL, SPY" aria-label="Ticker" autocomplete="off" spellcheck="false" />
        <button class="primary-button" type="submit">${volView.loading ? "Loading…" : "Load"}</button>
      </form>
    </section>
    <div id="volResultsMount">${renderVolatilityResults()}</div>
  `;
  const form = document.querySelector("#volForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    volView.symbol = form.elements.symbols.value.trim().toUpperCase();
    try {
      localStorage.setItem(VOL_SYMBOL_KEY, volView.symbol);
    } catch {
      // Remembering the ticker is a convenience only.
    }
    loadVolatility();
  });
  if (!volView.loading && (!volView.data || volView.data.symbol !== volView.symbol) && !volView.error) loadVolatility();
}

async function loadVolatility() {
  if (volView.loading || !volView.symbol) return;
  volView.loading = true;
  volView.error = "";
  const button = document.querySelector("#volForm button[type=submit]");
  if (button) button.textContent = "Loading…";
  try {
    const response = await fetch(`/api/volatility?${new URLSearchParams({ symbol: volView.symbol })}`);
    if (response.status === 404 && !response.headers.get("content-type")?.includes("json")) {
      throw new Error("The server is running an older version without this page. Stop it (Ctrl+C) and run node server.js again.");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Volatility data unavailable");
    volView.data = payload;
  } catch (error) {
    volView.data = null;
    volView.error = location.protocol === "file:"
      ? "This page needs the local server. Run node server.js and open http://localhost:4173."
      : error.message || "Volatility data unavailable";
  }
  volView.loading = false;
  if (activeView !== "volatility") return;
  if (button) button.textContent = "Load";
  document.querySelector("#volResultsMount").innerHTML = renderVolatilityResults();
}

function ivRankLabel(rank) {
  if (rank === null || rank === undefined) return ["Building history", ""];
  if (rank >= 50) return ["High: premium is rich", "warn"];
  if (rank <= 20) return ["Low: premium is cheap", "good"];
  return ["Middle of range", ""];
}

function renderVolatilityResults() {
  if (volView.error) return `<section class="panel" style="margin-top:18px"><div class="empty-state">${escapeHtml(volView.error)}</div></section>`;
  const data = volView.data;
  if (!data) return `<section class="panel" style="margin-top:18px"><div class="empty-state">${volView.loading ? "Loading option chain…" : "Enter a ticker and press Load."}</div></section>`;
  const hasRank = data.ivRank !== null && data.ivRank !== undefined;
  const [rankText, rankClass] = ivRankLabel(data.ivRank);
  const sourceLabel = data.ivSource === "recorded"
    ? `IV30 recorded by this app · ${data.ivHistoryDays} day${data.ivHistoryDays === 1 ? "" : "s"}`
    : `Cboe ${data.ivSource} index ${number(data.ivCurrent, 2)} · 52 weeks`;
  const ivPremium = data.hv30 ? data.iv30 - data.hv30 : null;
  const moves = data.expectedMoves || [];
  const widest = Math.max(...moves.map((move) => move.straddle), 0.01);
  const shortLegs = state.trades
    .filter((trade) => isTradeOpen(trade) && isOptionTrade(trade) && trade.symbol === data.symbol)
    .flatMap(shortLegsForTrade);
  return `
    <section class="gex-levels">
      <article class="panel gex-level">
        <span>${escapeHtml(data.symbol)} spot</span>
        <strong>${number(data.spot, 2)}</strong>
        <small class="${data.priceChangePercent >= 0 ? "positive" : "negative"}">${data.priceChangePercent >= 0 ? "+" : ""}${number(data.priceChangePercent, 2)}% today</small>
      </article>
      <article class="panel gex-level">
        <span>IV rank</span>
        <strong>${hasRank ? number(data.ivRank, 0) : "—"}</strong>
        <div class="iv-gauge" role="img" aria-label="IV rank ${hasRank ? number(data.ivRank, 0) : "unavailable"} of 100"><i style="width:${hasRank ? Math.max(0, Math.min(100, data.ivRank)) : 0}%"></i></div>
        <small>${hasRank ? `<span class="tag ${rankClass}">${rankText}</span>` : `Needs 20 trading days. ${data.ivHistoryDays} recorded so far.`}</small>
      </article>
      <article class="panel gex-level">
        <span>IV percentile</span>
        <strong>${hasRank ? `${number(data.ivPercentile, 0)}%` : "—"}</strong>
        <small>${hasRank ? `Days with lower IV · range ${number(data.ivLow, 1)}–${number(data.ivHigh, 1)}` : sourceLabel}</small>
      </article>
      <article class="panel gex-level">
        <span>IV30</span>
        <strong>${number(data.iv30, 1)}%</strong>
        <small>${hasRank ? sourceLabel : "30-day implied volatility"}</small>
      </article>
      <article class="panel gex-level">
        <span>HV30 (realized)</span>
        <strong>${data.hv30 ? `${number(data.hv30, 1)}%` : "—"}</strong>
        <small>${ivPremium === null ? "Not enough price history" : `IV is ${number(Math.abs(ivPremium), 1)} pts ${ivPremium >= 0 ? "above" : "below"} realized`}</small>
      </article>
    </section>
    <section class="panel" style="margin-top:18px">
      <div class="panel-header">
        <div>
          <h2>Expected move by expiration</h2>
          <p class="muted">Straddle = at-the-money call + put mid, the market's price for a move either way. The 1σ IV move is the range the stock stays inside about 68% of the time.</p>
        </div>
      </div>
      ${moves.length ? `
        <div class="table-wrap">
          <table class="em-table">
            <thead>
              <tr><th>Expiration</th><th>DTE</th><th>ATM strike</th><th>Straddle</th><th>Move</th><th>Range</th><th class="em-range-head">Range vs spot</th><th>IV move (1 SD)</th><th>ATM IV</th></tr>
            </thead>
            <tbody>
              ${moves.map((move) => {
                const width = move.straddle / widest * 50;
                const legs = shortLegs.filter((leg) => leg.expiration === move.expiration);
                const outside = legs.filter((leg) => leg.strike <= move.low || leg.strike >= move.high).length;
                return `
                  <tr>
                    <td><strong>${move.expiration}</strong>${legs.length ? ` <span class="tag ${outside === legs.length ? "good" : "warn"}" title="Short strikes outside the expected move">${outside}/${legs.length} shorts outside</span>` : ""}</td>
                    <td>${move.daysToExpiration}d</td>
                    <td>${number(move.strike, 2)}</td>
                    <td>${number(move.straddle, 2)}</td>
                    <td><strong>±${number(move.straddle, 2)}</strong> <span class="muted">(${number(move.movePercent, 2)}%)</span></td>
                    <td>${number(move.low, 2)} – ${number(move.high, 2)}</td>
                    <td class="em-range-cell"><div class="em-range" aria-hidden="true"><i style="left:${50 - width}%; width:${width * 2}%"></i><b></b></div></td>
                    <td>${move.ivMove ? `±${number(move.ivMove, 2)}` : "—"}</td>
                    <td>${move.atmIv ? `${number(move.atmIv * 100, 1)}%` : "—"}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No quoted at-the-money options found.</div>`}
    </section>
    <p class="muted gex-footnote">Snapshot ${escapeHtml(data.timestamp || "")} UTC · ${escapeHtml(data.source)}. IV rank = where current IV sits between its 52-week low (0) and high (100). Tickers without a Cboe volatility index build their own history from the IV30 this app records each trading day while the server runs.</p>
  `;
}

function groupByDate(trades) {
  const grouped = trades.reduce((acc, trade) => {
    const date = tradeRealizedDate(trade);
    if (!date) return acc;
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

function openTradeDialog(id = null, options = {}) {
  editingTradeId = id;
  const trade = id ? state.trades.find((item) => item.id === id) : null;
  document.querySelector("#dialogMode").textContent = trade ? (options.closeNow ? "Close Trade" : "Edit Trade") : "New Trade";
  deleteTradeButton.style.visibility = trade ? "visible" : "hidden";
  const assignableContracts = Number(trade?.contracts || trade?.size || 0);
  const assignableShares = assignableContracts * Number(trade?.contractMultiplier || 100);
  assignCspButton.hidden = !(options.closeNow
    && isCashSecuredPut(trade)
    && isTradeOpen(trade)
    && !trade.assignedTradeId
    && Number(trade.optionStrike || 0) > 0
    && assignableShares > 0);
  assignCspButton.textContent = assignableShares ? `Assign ${number(assignableShares, 0)} shares` : "Assign shares";
  // The dialog is reused for every trade. Reset it before applying the next
  // trade's values so optional fields (especially close-date fields) cannot
  // carry over from a previous entry.
  tradeForm.reset();
  const strategySelect = tradeForm.elements.strategy;
  const strategyOptions = [...state.strategies];
  if (trade?.strategy && !strategyOptions.some((strategy) => strategy.name === trade.strategy)) {
    strategyOptions.push({ name: trade.strategy });
  }
  strategySelect.innerHTML = strategyOptions.map((strategy) => `<option>${strategy.name}</option>`).join("");
  strategySelect.onchange = updateTradeEntryMode;
  const values = trade ? { ...trade } : {
    date: localDateKey(),
    exitDate: "",
    entryTime: "09:30",
    exitTime: "",
    symbol: "",
    assetClass: "Options",
    account: state.settings?.accountName || "Main",
    direction: "Long",
    strategy: state.strategies.find((strategy) => strategy.name === "Long Call")?.name ?? state.strategies[0]?.name ?? "",
    optionType: "call",
    optionExpiration: "",
    optionStrike: "",
    optionSymbol: "",
    contracts: "",
    shares: "",
    contractMultiplier: 100,
    pmccLongExpiration: "",
    pmccLongStrike: "",
    pmccLongDebit: "",
    pmccShortExpiration: "",
    pmccShortStrike: "",
    pmccShortCredit: "",
    pmccWeeklyCalls: [],
    spreadOptionType: "call",
    spreadShortStrike: "",
    spreadLongStrike: "",
    spreadCallShortStrike: "",
    spreadCallLongStrike: "",
    spreadLongExpiration: "",
    entry: "",
    exit: "",
    size: "",
    stop: "",
    target: "",
    plannedEntry: "",
    plannedStop: "",
    plannedTarget: "",
    plannedRisk: "",
    actualRisk: "",
    session: "",
    quality: "",
    emotion: "",
    mistake: "",
    market: "",
    image: "",
    customTags: "",
    partials: "",
    notes: "",
    followedRules: true,
    ruleChecks: [],
  };
  values.assetClass = isOptionTrade(values) ? "Options" : "Stocks";
  values.direction = values.assetClass === "Options" ? directionForStrategy(values.strategy, values.direction) : "Long";
  values.optionType = values.assetClass === "Options" ? optionTypeForStrategy(values.strategy, values.optionType) : "";
  values.spreadOptionType = values.optionType || "call";
  ["spreadShortStrike", "spreadLongStrike", "spreadCallShortStrike", "spreadCallLongStrike"].forEach((key) => {
    if (!Number(values[key] || 0)) values[key] = "";
  });
  values.contracts = values.assetClass === "Options" ? (values.contracts || values.size || "") : "";
  values.shares = values.assetClass === "Stocks" ? (values.size || "") : "";
  if (trade && isTradeOpen(trade)) {
    values.exitDate = "";
    values.exit = "";
  }
  if (options.closeNow && trade) {
    values.exitDate = localDateKey();
    values.exitTime = new Date().toTimeString().slice(0, 5);
  }
  Object.entries(values).forEach(([key, value]) => {
    const field = tradeForm.elements[key];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  });
  updateTradeEntryMode();
  saveTradeButton.textContent = options.closeNow ? "Close Trade" : "Save Trade";
  tradeDialog.showModal();
}

async function assignCashSecuredPut() {
  const put = state.trades.find((item) => item.id === editingTradeId);
  if (!put || !isCashSecuredPut(put) || !isTradeOpen(put) || put.assignedTradeId) return;
  if (state.trades.some((item) => item.assignedFromCspId === put.id)) {
    showToast("This put already has assigned shares");
    return;
  }

  const contracts = Number(put.contracts || put.size || 0);
  const multiplier = Number(put.contractMultiplier || 100);
  const shares = contracts * multiplier;
  const strike = Number(put.optionStrike || 0);
  if (!contracts || !shares || !strike) {
    showToast("This put is missing the contract count or strike needed for assignment");
    return;
  }
  const assignmentDate = localDateKey();
  const assignmentTime = new Date().toTimeString().slice(0, 5);
  const netPutCredit = Number(put.entry || 0) * shares - Number(put.fees || 0);
  const averageCost = strike - netPutCredit / shares;
  const confirmed = confirm(
    `Assign ${number(shares, 0)} ${put.symbol} shares at ${money(strike)} per share?\n\n`
    + `Put credit after fees: ${money(netPutCredit)}\n`
    + `Adjusted average buy price: ${money(averageCost)} per share`,
  );
  if (!confirmed) return;

  const assignedTradeId = crypto.randomUUID();
  put.exit = 0;
  put.exitDate = assignmentDate;
  put.exitTime = assignmentTime;
  put.assignedTradeId = assignedTradeId;
  const assignedShares = {
    id: assignedTradeId,
    date: assignmentDate,
    exitDate: "",
    entryTime: assignmentTime,
    exitTime: "",
    symbol: put.symbol,
    assetClass: "Stocks",
    account: put.account,
    direction: "Long",
    strategy: "Share Purchase",
    optionType: "",
    optionExpiration: "",
    optionStrike: 0,
    optionSymbol: "",
    contracts: 0,
    contractMultiplier: 100,
    entry: strike,
    exit: 0,
    size: shares,
    fees: 0,
    stop: 0,
    target: 0,
    plannedEntry: strike,
    plannedStop: 0,
    plannedTarget: 0,
    plannedRisk: 0,
    actualRisk: 0,
    session: "Open",
    quality: "A",
    emotion: "Calm",
    mistake: "None",
    market: "",
    image: "",
    customTags: "assigned-csp",
    partials: "",
    notes: `Assigned from Cash Secured Put trade ${put.symbol} ${put.optionStrike} put.`,
    pmccWeeklyCalls: [],
    assignedFromCspId: put.id,
    assignedPutCreditNet: netPutCredit,
    assignedShares: shares,
    assignedTradeId: "",
    coveredCallForId: "",
    ruleChecks: [],
    followedRules: true,
  };
  state.trades.unshift(assignedShares);
  selectedTradeId = assignedShares.id;
  selectedDay = assignmentDate;
  const savedToFile = await saveState();
  showToast(savedToFile ? `${number(shares, 0)} shares assigned` : "Shares assigned in browser only. Start the local server to save to file.");
  tradeDialog.close();
  render();
}

function updateTradeEntryMode() {
  const assetClass = tradeForm.elements.assetClass.value;
  const isStock = assetClass === "Stocks";
  if (!isStock && !tradeForm.elements.strategy.value) {
    tradeForm.elements.strategy.value = state.strategies.find((item) => item.name === "Long Call")?.name
      || state.strategies[0]?.name
      || "";
  }
  const strategy = tradeForm.elements.strategy.value;
  const isPmcc = !isStock && isPmccStrategy(strategy);
  const isSpread = !isStock && isCreditSpreadStrategy(strategy);
  const isCondor = isSpread && strategy === "Iron Condor";
  const isDiagonal = isSpread && strategy === "Diagonal Credit Spread";
  const labels = isStock
    ? { entry: "Purchase Price", exit: "Sale Price", placeholder: "Blank while shares are held" }
    : entryExitLabelsForStrategy(strategy);
  const title = tradeForm.querySelector("#tradeTicketTitle");
  if (title) title.textContent = isStock ? "Share Purchase" : "Option Trade";
  const entryLabel = tradeForm.querySelector("[data-entry-label]");
  const exitLabel = tradeForm.querySelector("[data-exit-label]");
  if (entryLabel) entryLabel.textContent = labels.entry;
  if (exitLabel) exitLabel.textContent = labels.exit;
  if (tradeForm.elements.exit) tradeForm.elements.exit.placeholder = labels.placeholder;
  tradeForm.querySelectorAll(".option-field").forEach((field) => {
    field.hidden = isStock;
    field.querySelectorAll("input, select").forEach((input) => {
      input.required = !isStock && input.name === "contracts";
    });
  });
  tradeForm.querySelectorAll(".standard-option-field").forEach((field) => {
    field.hidden = isStock || isPmcc;
    field.querySelectorAll("input, select").forEach((input) => {
      input.required = !isStock && !isPmcc && ["optionExpiration", "optionStrike"].includes(input.name);
    });
  });
  tradeForm.querySelectorAll(".single-strike-field").forEach((field) => {
    field.hidden = isStock || isPmcc || isSpread;
    field.querySelectorAll("input").forEach((input) => {
      input.required = !field.hidden;
    });
  });
  tradeForm.querySelectorAll(".spread-field").forEach((field) => {
    field.hidden = !isSpread
      || (field.classList.contains("condor-field") && !isCondor)
      || (field.classList.contains("diagonal-field") && !isDiagonal);
    field.querySelectorAll("input").forEach((input) => {
      input.required = !field.hidden;
    });
  });
  const spreadLabels = {
    expiration: isDiagonal ? "Short Leg Expiration" : "Expiration",
    short: isCondor ? "Short Put Strike" : "Short Strike",
    long: isCondor ? "Long Put Strike" : "Long Strike",
  };
  Object.entries(spreadLabels).forEach(([key, text]) => {
    const label = tradeForm.querySelector(`[data-spread-label="${key}"]`);
    if (label) label.textContent = text;
  });
  tradeForm.querySelectorAll(".stock-field").forEach((field) => {
    field.hidden = !isStock;
    field.querySelectorAll("input").forEach((input) => {
      input.required = isStock;
    });
  });
  tradeForm.querySelectorAll(".trade-price-field").forEach((field) => {
    field.hidden = isPmcc;
    field.querySelectorAll("input").forEach((input) => {
      input.required = !isPmcc;
    });
  });
  tradeForm.querySelectorAll(".pmcc-field").forEach((field) => {
    field.hidden = isStock || !isPmcc;
    field.querySelectorAll("input").forEach((input) => {
      input.required = isPmcc && ["pmccLongExpiration", "pmccLongStrike", "pmccLongDebit"].includes(input.name);
    });
  });
  updatePmccNetDebit();
  updateTradeClosePreview();
}

function updatePmccNetDebit() {
  const netDebit = tradeForm.querySelector("#pmccNetDebit");
  if (!netDebit) return;
  const longDebit = Number(tradeForm.elements.pmccLongDebit?.value || 0);
  const shortCredit = Number(tradeForm.elements.pmccShortCredit?.value || 0);
  netDebit.value = longDebit || shortCredit ? Math.max(0, longDebit - shortCredit).toFixed(2) : "";
}

function updateTradeClosePreview() {
  const preview = tradeForm.querySelector("#closePnlPreview");
  if (!preview) return;
  const strategy = tradeForm.elements.strategy?.value || "";
  const isStock = tradeForm.elements.assetClass?.value === "Stocks";
  const exitValue = tradeForm.elements.exit?.value ?? "";
  const quantityValue = isStock ? tradeForm.elements.shares?.value ?? "" : tradeForm.elements.contracts?.value ?? "";
  const exit = Number(exitValue);
  const quantity = Number(quantityValue);
  if (!isStock && isPmccStrategy(strategy)) {
    const longDebitValue = tradeForm.elements.pmccLongDebit?.value ?? "";
    if (longDebitValue === "" || exitValue === "" || quantityValue === "" || !quantity) {
      preview.textContent = "";
      return;
    }
    const existing = editingTradeId ? state.trades.find((item) => item.id === editingTradeId) : null;
    const weeklyRealized = existing ? pmccCallsSummary(existing).realized : 0;
    const pnl = (exit - Number(longDebitValue)) * quantity * 100 + weeklyRealized;
    preview.innerHTML = `<span>Estimated PMCC P&L</span><strong class="${pnl >= 0 ? "positive" : "negative"}">${money(pnl)}</strong>`;
    return;
  }
  const entryValue = tradeForm.elements.entry?.value ?? "";
  const entry = Number(entryValue);
  if (entryValue === "" || exitValue === "" || quantityValue === "" || !quantity) {
    preview.textContent = "";
    return;
  }
  const direction = isStock ? "Long" : directionForStrategy(strategy);
  const multiplier = isStock ? 1 : 100;
  const pnl = direction === "Short"
    ? (entry - exit) * quantity * multiplier
    : (exit - entry) * quantity * multiplier;
  preview.innerHTML = `<span>Estimated P&L</span><strong class="${pnl >= 0 ? "positive" : "negative"}">${money(pnl)}</strong>`;
}

async function saveTradeFromForm(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(tradeForm));
  // An exit price is what closes a trade. Ignore a date-only value so an
  // accidentally retained/autofilled close date does not block an open trade.
  if (data.exit === "") data.exitDate = "";
  const existing = editingTradeId ? state.trades.find((item) => item.id === editingTradeId) : null;
  const validation = validateTradeInput(data);
  if (validation) {
    showToast(validation);
    return;
  }
  const isStock = data.assetClass === "Stocks";
  const isPmcc = !isStock && isPmccStrategy(data.strategy);
  const isSpread = !isStock && isCreditSpreadStrategy(data.strategy);
  const isCondor = isSpread && data.strategy === "Iron Condor";
  const spreadRisk = isSpread ? spreadMaxLoss({ ...data, spreadCallShortStrike: isCondor ? data.spreadCallShortStrike : 0, spreadCallLongStrike: isCondor ? data.spreadCallLongStrike : 0 }) : 0;
  const pmccEntry = Math.max(0, Number(data.pmccLongDebit || 0) - Number(data.pmccShortCredit || 0));
  const existingWeeklyCalls = normalizePmccWeeklyCalls(existing?.pmccWeeklyCalls);
  const initialPmccCall = isPmcc && !existingWeeklyCalls.length && data.pmccShortExpiration && data.pmccShortStrike && data.pmccShortCredit
    ? [{
      id: crypto.randomUUID(),
      sellDate: data.date,
      expiration: data.pmccShortExpiration,
      strike: Number(data.pmccShortStrike || 0),
      credit: Number(data.pmccShortCredit || 0),
      buybackDate: "",
      debit: "",
      notes: "Initial short call",
    }]
    : [];
  const trade = {
    ...existing,
    id: editingTradeId ?? crypto.randomUUID(),
    date: data.date,
    exitDate: data.exit !== "" ? (data.exitDate || data.date) : "",
    entryTime: data.entryTime || existing?.entryTime || "09:30",
    exitTime: data.exit !== "" ? (data.exitTime || existing?.exitTime || "") : "",
    symbol: data.symbol.trim().toUpperCase(),
    assetClass: data.assetClass,
    account: data.account || existing?.account || state.settings?.accountName || "Main",
    direction: isStock ? "Long" : directionForStrategy(data.strategy),
    strategy: isStock ? "Share Purchase" : data.strategy,
    optionType: isStock ? "" : optionTypeForStrategy(data.strategy, data.spreadOptionType),
    optionExpiration: isStock ? "" : isPmcc ? data.pmccLongExpiration : data.optionExpiration || "",
    optionStrike: isStock ? 0 : isPmcc ? Number(data.pmccLongStrike || 0) : isSpread ? Number(data.spreadShortStrike || 0) : Number(data.optionStrike || 0),
    optionSymbol: "",
    contracts: isStock ? 0 : Number(data.contracts || 0),
    contractMultiplier: 100,
    pmccLongExpiration: isPmcc ? data.pmccLongExpiration || "" : "",
    pmccLongStrike: isPmcc ? Number(data.pmccLongStrike || 0) : 0,
    pmccLongDebit: isPmcc ? Number(data.pmccLongDebit || 0) : 0,
    pmccShortExpiration: isPmcc ? data.pmccShortExpiration || "" : "",
    pmccShortStrike: isPmcc ? Number(data.pmccShortStrike || 0) : 0,
    pmccShortCredit: isPmcc ? Number(data.pmccShortCredit || 0) : 0,
    spreadShortStrike: isSpread ? Number(data.spreadShortStrike || 0) : 0,
    spreadLongStrike: isSpread ? Number(data.spreadLongStrike || 0) : 0,
    spreadCallShortStrike: isCondor ? Number(data.spreadCallShortStrike || 0) : 0,
    spreadCallLongStrike: isCondor ? Number(data.spreadCallLongStrike || 0) : 0,
    spreadLongExpiration: isSpread && data.strategy === "Diagonal Credit Spread" ? data.spreadLongExpiration || "" : "",
    entry: isPmcc ? pmccEntry : Number(data.entry),
    exit: Number(data.exit || 0),
    size: Number(isStock ? data.shares : data.contracts || 0),
    fees: Number(existing?.fees || 0),
    stop: Number(existing?.stop || 0),
    target: Number(existing?.target || 0),
    plannedEntry: Number(existing?.plannedEntry || data.entry || 0),
    plannedStop: Number(existing?.plannedStop || 0),
    plannedTarget: Number(existing?.plannedTarget || 0),
    plannedRisk: spreadRisk || Number(existing?.plannedRisk || 0),
    actualRisk: spreadRisk || Number(existing?.actualRisk || 0),
    session: existing?.session || "",
    quality: existing?.quality || "",
    emotion: existing?.emotion || "",
    mistake: existing?.mistake || "",
    market: existing?.market || "",
    image: existing?.image || "",
    customTags: existing?.customTags || "",
    partials: existing?.partials || "",
    notes: existing?.notes || "",
    pmccWeeklyCalls: isPmcc ? [...existingWeeklyCalls, ...initialPmccCall] : [],
    assignedFromCspId: existing?.assignedFromCspId || "",
    assignedPutCreditNet: Number(existing?.assignedPutCreditNet || 0),
    assignedShares: Number(existing?.assignedShares || 0),
    assignedTradeId: existing?.assignedTradeId || "",
    coveredCallForId: existing?.coveredCallForId || "",
    ruleChecks: existing?.ruleChecks || [],
    followedRules: existing?.followedRules ?? true,
  };
  if (editingTradeId) {
    state.trades = state.trades.map((item) => item.id === editingTradeId ? trade : item);
  } else {
    state.trades.unshift(trade);
  }
  selectedTradeId = trade.id;
  selectedDay = tradeRealizedDate(trade) || trade.date;
  const savedToFile = await saveState();
  showToast(savedToFile ? (editingTradeId ? "Trade updated" : "Trade saved") : "Saved in browser only. Start the local server to save to file.");
  tradeDialog.close();
  liveQuotesUpdatedAt = null;
  render();
}

function validateTradeInput(data) {
  if (data.exit !== "" && !data.exitDate) return "Add a close date for the exit price";
  if (data.exitDate && data.exitDate < data.date) return "Close date cannot be before open date";
  const existing = editingTradeId ? state.trades.find((trade) => trade.id === editingTradeId) : null;
  if (data.exit !== "" && isAssignedShareLot(existing) && assignedShareSummary(existing).openCallContracts > 0) {
    return "Close or buy back the covered calls before closing these shares";
  }
  const isStock = data.assetClass === "Stocks";
  if (isStock) {
    if (!Number(data.shares || 0)) return "Add the number of shares purchased";
    if (!data.entry) return "Add the share purchase price";
  } else if (!Number(data.contracts || 0)) {
    return "Add the number of option contracts";
  } else if (isPmccStrategy(data.strategy)) {
    if (!data.pmccLongExpiration || !data.pmccLongStrike || !data.pmccLongDebit) return "Add the long call expiration, strike, and debit";
    const hasShortCall = Boolean(data.pmccShortExpiration || data.pmccShortStrike || data.pmccShortCredit);
    if (hasShortCall) {
      if (!data.pmccShortExpiration || !data.pmccShortStrike || !data.pmccShortCredit) return "Add expiration, strike, and credit for the short call, or leave all three blank";
      if (data.pmccShortExpiration >= data.pmccLongExpiration) return "Short call expiration should be before the long call expiration";
      if (Number(data.pmccShortStrike || 0) <= Number(data.pmccLongStrike || 0)) return "Short call strike should be above the long call strike";
    }
  } else if (isCreditSpreadStrategy(data.strategy)) {
    const validation = validateSpreadInput(data);
    if (validation) return validation;
  } else if (!data.optionExpiration || !data.optionStrike || !data.entry) {
    return "Add expiration, strike, and entry";
  }
  const partials = parsePartials(data.partials || "");
  if (data.partials && !partials.length) return "Use partial format like 186.20@20";
  const partialSize = partials.reduce((sum, item) => sum + item.size, 0);
  const positionSize = Number(isStock ? data.shares : data.contracts || 0);
  if (partialSize > positionSize) return "Partial exits exceed position size";
  const duplicate = state.trades.find((trade) => trade.id !== editingTradeId
    && trade.date === data.date
    && trade.symbol === data.symbol.trim().toUpperCase()
    && trade.assetClass === data.assetClass
    && trade.strategy === (isStock ? "Share Purchase" : data.strategy));
  if (duplicate && !confirm("This looks like a duplicate trade. Save anyway?")) return "Duplicate trade cancelled";
  return "";
}

function validateSpreadInput(data) {
  const shortStrike = Number(data.spreadShortStrike || 0);
  const longStrike = Number(data.spreadLongStrike || 0);
  if (!data.optionExpiration || !shortStrike || !longStrike || data.entry === "") return "Add expiration, short and long strikes, and net credit";
  if (Number(data.entry) <= 0) return "A credit spread should open for a net credit";
  if (data.strategy === "Put Credit Spread" && longStrike >= shortStrike) return "Long put strike should be below the short put strike";
  if (data.strategy === "Call Credit Spread" && longStrike <= shortStrike) return "Long call strike should be above the short call strike";
  if (data.strategy === "Iron Condor") {
    const callShort = Number(data.spreadCallShortStrike || 0);
    const callLong = Number(data.spreadCallLongStrike || 0);
    if (!callShort || !callLong) return "Add the short and long call strikes";
    if (!(longStrike < shortStrike && shortStrike < callShort && callShort < callLong)) {
      return "Strikes should go long put < short put < short call < long call";
    }
  }
  if (data.strategy === "Diagonal Credit Spread") {
    if (!data.spreadLongExpiration) return "Add the long leg expiration";
    if (data.spreadLongExpiration <= data.optionExpiration) return "Long leg expiration should be after the short leg expiration";
    const isPut = data.spreadOptionType === "put";
    if (isPut ? longStrike >= shortStrike : longStrike <= shortStrike) {
      return `Long ${isPut ? "put" : "call"} strike should be further out of the money than the short strike`;
    }
  }
  const callWidth = Math.abs(Number(data.spreadCallShortStrike || 0) - Number(data.spreadCallLongStrike || 0));
  const width = data.strategy === "Diagonal Credit Spread" ? 0
    : data.strategy === "Iron Condor" ? Math.max(Math.abs(shortStrike - longStrike), callWidth)
    : Math.abs(shortStrike - longStrike);
  if (width && Number(data.entry) >= width) return "Net credit should be less than the spread width";
  return "";
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

function deleteCurrentTrade() {
  if (!editingTradeId) return;
  const trade = state.trades.find((item) => item.id === editingTradeId);
  if (isAssignedShareLot(trade) && assignedShareSummary(trade).openCallContracts > 0) {
    showToast("Close or buy back the covered calls before deleting these shares");
    return;
  }
  if (!confirm("Delete this trade? This cannot be undone.")) return;
  lastDeletedTrade = trade;
  state.trades = state.trades.filter((trade) => trade.id !== editingTradeId);
  selectedTradeId = null;
  saveState();
  showToast("Trade deleted", "Undo", () => {
    if (!lastDeletedTrade) return;
    state.trades.unshift(lastDeletedTrade);
    lastDeletedTrade = null;
    saveState();
    render();
  });
  tradeDialog.close();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `trading-journal-${activeJournalId}-${localDateKey()}.json`;
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

function exportCsv(trades = state.trades) {
  const fields = ["id", "date", "exitDate", "entryTime", "exitTime", "symbol", "assetClass", "account", "direction", "strategy", "optionType", "optionExpiration", "optionStrike", "contracts", "contractMultiplier", "pmccLongExpiration", "pmccLongStrike", "pmccLongDebit", "pmccShortExpiration", "pmccShortStrike", "pmccShortCredit", "pmccWeeklyCalls", "spreadShortStrike", "spreadLongStrike", "spreadCallShortStrike", "spreadCallLongStrike", "spreadLongExpiration", "assignedFromCspId", "assignedPutCreditNet", "assignedShares", "assignedTradeId", "coveredCallForId", "entry", "exit", "size", "fees", "plannedRisk", "actualRisk", "session", "quality", "emotion", "mistake", "market", "customTags", "partials", "notes", "followedRules", "reviewed", "journaled"];
  const rows = [
    fields.join(","),
    ...trades.map((trade) => fields.map((field) => csvEscape(field === "pmccWeeklyCalls" ? JSON.stringify(normalizePmccWeeklyCalls(trade.pmccWeeklyCalls)) : trade[field] ?? "")).join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `trading-journal-${activeJournalId}-${localDateKey()}.csv`;
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
      const sourceTrades = lines.filter(Boolean).map((line) => {
        const values = parseCsvLine(line);
        return headers.reduce((acc, header, index) => ({ ...acc, [header]: values[index] ?? "" }), {});
      });
      const importedIds = new Map(sourceTrades.filter((trade) => trade.id).map((trade) => [trade.id, crypto.randomUUID()]));
      const trades = sourceTrades.map((sourceTrade) => {
        const trade = {
          ...sourceTrade,
          id: sourceTrade.id ? importedIds.get(sourceTrade.id) : crypto.randomUUID(),
          assignedFromCspId: importedIds.get(sourceTrade.assignedFromCspId) || sourceTrade.assignedFromCspId || "",
          assignedTradeId: importedIds.get(sourceTrade.assignedTradeId) || sourceTrade.assignedTradeId || "",
          coveredCallForId: importedIds.get(sourceTrade.coveredCallForId) || sourceTrade.coveredCallForId || "",
        };
        return normalizeState({ trades: [trade], strategies: state.strategies, settings: state.settings }).trades[0];
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
    callput: "optionType",
    optiontype: "optionType",
    expiration: "optionExpiration",
    expiry: "optionExpiration",
    optionexpiration: "optionExpiration",
    strike: "optionStrike",
    strikeprice: "optionStrike",
    optionsymbol: "optionSymbol",
    contracts: "contracts",
    multiplier: "contractMultiplier",
    contractmultiplier: "contractMultiplier",
    longcallexpiration: "pmccLongExpiration",
    longcallstrike: "pmccLongStrike",
    longcalldebit: "pmccLongDebit",
    shortcallexpiration: "pmccShortExpiration",
    shortcallstrike: "pmccShortStrike",
    shortcallcredit: "pmccShortCredit",
    pmccweeklycalls: "pmccWeeklyCalls",
    weeklycalls: "pmccWeeklyCalls",
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
  if (toast.showPopover) {
    try {
      toast.hidePopover();
    } catch {
      // Not currently showing.
    }
    toast.showPopover();
  }
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
