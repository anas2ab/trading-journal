const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "journal.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const GEX_DIR = path.join(DATA_DIR, "gex");
const IV_DIR = path.join(DATA_DIR, "iv");
const JOURNALS = new Set(["mine"]);
const BACKUP_MIN_INTERVAL_MS = 10 * 60 * 1000;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${PORT}`);

    if (url.pathname === "/api/journal" && request.method === "GET") {
      await sendJournal(request, response);
      return;
    }

    if (url.pathname === "/api/quote" && request.method === "GET") {
      await sendQuote(request, response);
      return;
    }

    if (url.pathname === "/api/flow" && request.method === "GET") {
      await sendFlow(request, response);
      return;
    }

    if (url.pathname === "/api/volatility" && request.method === "GET") {
      await sendVolatility(request, response);
      return;
    }

    if (url.pathname === "/api/gex" && request.method === "GET") {
      await sendGex(request, response);
      return;
    }

    if (url.pathname === "/api/journal" && request.method === "PUT") {
      await saveJournal(request, response);
      return;
    }

    if (url.pathname === "/api/upload" && request.method === "POST") {
      await saveUpload(request, response);
      return;
    }

    if (request.method === "GET") {
      await sendStatic(request, response);
      return;
    }

    send(response, 405, "Method not allowed", "text/plain; charset=utf-8");
  } catch (error) {
    console.error(error);
    send(response, 500, JSON.stringify({ error: "Server error" }), "application/json; charset=utf-8");
  }
});

async function sendJournal(request, response) {
  try {
    const file = journalFile(request);
    const data = await fs.readFile(file, "utf8").catch(async (error) => {
      if (error.code === "ENOENT" && journalId(request) === "mine") {
        return fs.readFile(DATA_FILE, "utf8");
      }
      throw error;
    });
    send(response, 200, data, "application/json; charset=utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    send(response, 404, JSON.stringify({ error: "No journal file yet" }), "application/json; charset=utf-8");
  }
}

async function saveJournal(request, response) {
  const body = await readBody(request);
  JSON.parse(body);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await backupJournal(request);
  await fs.writeFile(journalFile(request), `${body}\n`, "utf8");
  send(response, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
}

function journalId(request) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const id = String(url.searchParams.get("journal") || "mine").trim().toLowerCase();
  return JOURNALS.has(id) ? id : "mine";
}

function journalFile(request) {
  const id = journalId(request);
  return id === "mine" ? path.join(DATA_DIR, "journal-mine.json") : path.join(DATA_DIR, `journal-${id}.json`);
}

async function sendQuote(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  const optionType = String(url.searchParams.get("optionType") || "").trim().toLowerCase();
  const expiration = String(url.searchParams.get("expiration") || "").trim();
  const strike = Number(url.searchParams.get("strike") || 0);
  const optionSymbol = String(url.searchParams.get("optionSymbol") || "").trim().toUpperCase();
  if (!/^[A-Z0-9.^=$-]{1,32}$/.test(symbol)) {
    send(response, 400, JSON.stringify({ error: "Enter a valid stock, ETF, or Yahoo option symbol" }), "application/json; charset=utf-8");
    return;
  }

  const quote = optionSymbol
    ? await fetchYahooOptionContractQuote(optionSymbol)
    : optionType && expiration && strike
      ? await fetchYahooOptionQuote(symbol, optionType, expiration, strike)
      : await fetchYahooQuote(symbol);
  if (quote && optionSymbol) quote.contractSymbol = optionSymbol;
  if (quote && optionType && expiration && strike) quote.contractSymbol ||= buildYahooOptionSymbol(symbol, optionType, expiration, strike);
  if (!quote) {
    send(response, 404, JSON.stringify({ error: "Quote unavailable. Enter the price manually." }), "application/json; charset=utf-8");
    return;
  }
  send(response, 200, JSON.stringify(quote), "application/json; charset=utf-8");
}

async function fetchYahooOptionQuote(symbol, optionType, expiration, strike) {
  if (!["call", "put"].includes(optionType)) return null;
  const directQuote = await fetchYahooOptionContractQuote(buildYahooOptionSymbol(symbol, optionType, expiration, strike));
  if (directQuote) return directQuote;

  const date = new Date(`${expiration}T00:00:00Z`);
  const expirationUnix = Math.floor(date.getTime() / 1000);
  if (!Number.isFinite(expirationUnix)) return null;

  const headers = {
    "User-Agent": "Mozilla/5.0 TradingJournal/1.0",
    "Accept": "application/json,text/plain,*/*",
  };

  try {
    const chainUrl = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?date=${expirationUnix}`;
    const chainResponse = await fetch(chainUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (!chainResponse.ok) return null;
    const data = await chainResponse.json();
    const result = data.optionChain?.result?.[0];
    const chain = result?.options?.[0]?.[optionType === "call" ? "calls" : "puts"] || [];
    const contract = chain.find((item) => Math.abs(Number(item.strike) - strike) < 0.001);
    if (!contract) return null;
    const bid = Number(contract.bid || 0);
    const ask = Number(contract.ask || 0);
    const last = Number(contract.lastPrice || 0);
    const price = bid > 0 && ask > 0 ? (bid + ask) / 2 : last || bid || ask;
    if (price <= 0) return null;
    return {
      symbol: `${symbol} ${expiration} ${strike} ${optionType.toUpperCase()}`,
      contractSymbol: contract.contractSymbol || "",
      price,
      bid,
      ask,
      lastPrice: last,
      currency: result.quote?.currency || "USD",
      source: "Yahoo Finance options",
      delay: "delayed",
      marketTime: contract.lastTradeDate ? new Date(contract.lastTradeDate * 1000).toISOString() : "",
    };
  } catch {
    return null;
  }
}

function buildYahooOptionSymbol(symbol, optionType, expiration, strike) {
  const [year, month, day] = expiration.split("-");
  const optionCode = optionType === "call" ? "C" : "P";
  const strikeCode = String(Math.round(Number(strike) * 1000)).padStart(8, "0");
  return `${symbol}${year.slice(2)}${month}${day}${optionCode}${strikeCode}`;
}

async function fetchYahooOptionContractQuote(contractSymbol) {
  if (!/^[A-Z0-9.^=$-]{10,32}$/.test(contractSymbol)) return null;
  const quote = await fetchYahooQuote(contractSymbol);
  if (!quote) return null;
  return {
    ...quote,
    contractSymbol,
    source: "Yahoo Finance option quote",
  };
}

async function fetchYahooQuote(symbol) {
  const headers = {
    "User-Agent": "Mozilla/5.0 TradingJournal/1.0",
    "Accept": "application/json,text/plain,*/*",
  };

  try {
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const quoteResponse = await fetch(quoteUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (quoteResponse.ok) {
      const data = await quoteResponse.json();
      const result = data.quoteResponse?.result?.[0];
      const price = Number(result?.regularMarketPrice || result?.postMarketPrice || result?.preMarketPrice || 0);
      if (price > 0) {
        return {
          symbol: result.symbol || symbol,
          price,
          currency: result.currency || "USD",
          source: "Yahoo Finance",
          delay: result.exchangeDataDelayedBy ? `${result.exchangeDataDelayedBy} min delayed` : "delayed",
          marketTime: result.regularMarketTime ? new Date(result.regularMarketTime * 1000).toISOString() : "",
          previousClose: Number(result.regularMarketPreviousClose || 0),
        };
      }
    }
  } catch {
    // Fall back to the chart endpoint below.
  }

  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const chartResponse = await fetch(chartUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (!chartResponse.ok) return null;
    const data = await chartResponse.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    const price = Number(meta?.regularMarketPrice || meta?.previousClose || 0);
    if (price <= 0) return null;
    return {
      symbol: meta.symbol || symbol,
      price,
      currency: meta.currency || "USD",
      source: "Yahoo Finance",
      delay: "delayed",
      marketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : "",
      previousClose: Number(meta.chartPreviousClose || meta.previousClose || 0),
    };
  } catch {
    return null;
  }
}

// Options flow scanner built from Cboe's free delayed chain snapshot. It has
// per-contract volume and open interest but no individual prints, so "side" is
// inferred from where the last trade printed relative to the bid/ask.
const CBOE_INDEX_SYMBOLS = new Set(["SPX", "SPXW", "NDX", "RUT", "VIX", "XSP", "DJX", "OEX"]);
const FLOW_CACHE_MS = 60 * 1000;
const flowCache = new Map();

async function sendFlow(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const symbols = [...new Set(String(url.searchParams.get("symbols") || "")
    .split(/[\s,]+/)
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z0-9.]{1,10}$/.test(symbol)))].slice(0, 10);
  if (!symbols.length) {
    send(response, 400, JSON.stringify({ error: "Enter at least one ticker" }), "application/json; charset=utf-8");
    return;
  }
  const filters = {
    minPremium: Math.max(0, Number(url.searchParams.get("minPremium") || 25000)),
    minVolume: Math.max(0, Number(url.searchParams.get("minVolume") || 100)),
    maxDays: Number(url.searchParams.get("maxDays") || 0),
    unusualOnly: url.searchParams.get("unusualOnly") !== "false",
  };

  const results = await Promise.all(symbols.map(async (symbol) => {
    const chain = await fetchCboeChain(symbol);
    return chain ? summarizeFlow(symbol, chain, filters) : { symbol, error: "No option data" };
  }));
  const contracts = results
    .flatMap((result) => result.contracts || [])
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 150);
  send(response, 200, JSON.stringify({
    source: "Cboe delayed quotes",
    symbols: results.map(({ contracts: _, ...summary }) => summary),
    contracts,
  }), "application/json; charset=utf-8");
}

async function fetchCboeChain(symbol) {
  const cached = flowCache.get(symbol);
  if (cached && Date.now() - cached.at < FLOW_CACHE_MS) return cached.data;
  const cboeSymbol = CBOE_INDEX_SYMBOLS.has(symbol) ? `_${symbol}` : symbol;
  try {
    const chainResponse = await fetch(`https://cdn.cboe.com/api/global/delayed_quotes/options/${encodeURIComponent(cboeSymbol)}.json`, {
      headers: { "User-Agent": "Mozilla/5.0 TradingJournal/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!chainResponse.ok) return null;
    const payload = await chainResponse.json();
    if (!Array.isArray(payload.data?.options)) return null;
    const data = { ...payload.data, timestamp: payload.timestamp || "" };
    flowCache.set(symbol, { at: Date.now(), data });
    await recordDailyIv(symbol, Number(data.iv30 || 0)).catch((error) => console.error(`IV record failed for ${symbol}`, error));
    return data;
  } catch {
    return null;
  }
}

function summarizeFlow(symbol, chain, filters) {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const summary = { callPremium: 0, putPremium: 0, callVolume: 0, putVolume: 0 };
  const contracts = [];
  chain.options.forEach((option) => {
    const contract = parseCboeOption(option);
    if (!contract) return;
    const { type, expiration, strike } = contract;
    const volume = Number(option.volume || 0);
    const daysToExpiration = Math.round((new Date(`${expiration}T00:00:00Z`) - today) / 86400000);
    // The snapshot keeps yesterday's expired contracts until it rolls over.
    if (!volume || daysToExpiration < 0) return;
    const bid = Number(option.bid || 0);
    const ask = Number(option.ask || 0);
    const last = Number(option.last_trade_price || 0) || (bid && ask ? (bid + ask) / 2 : 0);
    const premium = volume * last * 100;
    summary[`${type}Premium`] += premium;
    summary[`${type}Volume`] += volume;

    const openInterest = Number(option.open_interest || 0);
    // A last print from an earlier session can't be compared to today's quote.
    const printedToday = Boolean(chain.timestamp) && String(option.last_trade_time || "").slice(0, 10) === chain.timestamp.slice(0, 10);
    const unusual = volume > openInterest;
    if (volume < filters.minVolume || premium < filters.minPremium) return;
    if (filters.maxDays && daysToExpiration > filters.maxDays) return;
    if (filters.unusualOnly && !unusual) return;
    contracts.push({
      symbol,
      contractSymbol: option.option,
      type,
      expiration,
      daysToExpiration,
      strike,
      volume,
      openInterest,
      volumeOiRatio: openInterest ? volume / openInterest : null,
      unusual,
      last,
      bid,
      ask,
      side: !printedToday || (!bid && !ask) ? "" : last >= ask ? "ask" : last <= bid ? "bid" : "mid",
      premium,
      iv: Number(option.iv || 0),
      delta: Number(option.delta || 0),
      lastTradeTime: option.last_trade_time || "",
    });
  });
  return {
    symbol,
    price: Number(chain.current_price || 0),
    priceChangePercent: Number(chain.price_change_percent || 0),
    iv30: Number(chain.iv30 || 0),
    timestamp: chain.timestamp,
    ...summary,
    putCallVolumeRatio: summary.callVolume ? summary.putVolume / summary.callVolume : null,
    contracts,
  };
}

function parseCboeOption(option) {
  const match = /^(.+?)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(option.option || "");
  if (!match) return null;
  const [, , year, month, day, typeCode, strikeCode] = match;
  return {
    type: typeCode === "C" ? "call" : "put",
    expiration: `20${year}-${month}-${day}`,
    strike: Number(strikeCode) / 1000,
  };
}

// Gamma exposure (GEX) from open interest, using the common dealer convention:
// dealers are long the calls and short the puts customers hold, so call gamma
// counts positive and put gamma negative. GEX is dollars per 1% move in the
// underlying; DEX is the dollar delta of open interest.
const GEX_EXPIRY_FILTERS = ["all", "week", "0dte"];
const GEX_RECORD_MS = 5 * 60 * 1000;
const GEX_WATCH_DAYS = 3;
const GEX_HISTORY_RANGE = 0.1;
const RISK_FREE_RATE = 0.04;
let gexWatchlist = null;

async function sendGex(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  const expiry = GEX_EXPIRY_FILTERS.includes(url.searchParams.get("expiry")) ? url.searchParams.get("expiry") : "all";
  if (!/^[A-Z0-9.]{1,10}$/.test(symbol)) {
    send(response, 400, JSON.stringify({ error: "Enter a valid ticker" }), "application/json; charset=utf-8");
    return;
  }
  const chain = await fetchCboeChain(symbol);
  if (!chain) {
    send(response, 404, JSON.stringify({ error: `No option data for ${symbol}` }), "application/json; charset=utf-8");
    return;
  }
  await watchGexSymbol(symbol);
  const history = await recordGexSnapshot(symbol, chain);
  const exposure = computeGex(chain, expiry);
  const range = Number(chain.current_price || 0) * 0.15;
  const moves = expectedMoves(chain);
  // Match the expiration filter: today's move for 0DTE, the last expiry this
  // week for "week", and the expiry closest to 30 days for "all".
  const now = easternNow();
  const expectedMove = expiry === "all"
    ? moves.reduce((best, move) => (!best || Math.abs(move.daysToExpiration - 30) < Math.abs(best.daysToExpiration - 30) ? move : best), null)
    : moves.filter((move) => expiryMatches(expiry, move.expiration, now)).at(-1) || null;
  send(response, 200, JSON.stringify({
    symbol,
    expiry,
    source: "Cboe delayed quotes",
    timestamp: chain.timestamp,
    spot: Number(chain.current_price || 0),
    priceChangePercent: Number(chain.price_change_percent || 0),
    ...exposure,
    strikes: exposure.strikes.filter((row) => Math.abs(row.strike - chain.current_price) <= range),
    expectedMove,
    history,
  }), "application/json; charset=utf-8");
}

function easternNow(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date: dateKey,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: new Date(`${dateKey}T00:00:00Z`).getUTCDay(),
  };
}

function daysBetween(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
}

function expiryMatches(filter, expiration, now) {
  const days = daysBetween(now.date, expiration);
  if (days < 0) return false;
  if (filter === "0dte") return days === 0;
  // Through the coming Friday; on weekends that is next week's Friday.
  if (filter === "week") return days <= (5 - now.weekday + 7) % 7;
  return true;
}

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function blackScholesGamma(spot, strike, years, iv) {
  const volSqrtT = iv * Math.sqrt(years);
  const d1 = (Math.log(spot / strike) + (RISK_FREE_RATE + iv * iv / 2) * years) / volSqrtT;
  return normalPdf(d1) / (spot * volSqrtT);
}

function computeGex(chain, filter, now = easternNow()) {
  const spot = Number(chain.current_price || 0);
  const byStrike = new Map();
  const profileInputs = [];
  chain.options.forEach((option) => {
    const contract = parseCboeOption(option);
    const openInterest = Number(option.open_interest || 0);
    if (!contract || !openInterest || !expiryMatches(filter, contract.expiration, now)) return;
    const sign = contract.type === "call" ? 1 : -1;
    const gex = sign * Number(option.gamma || 0) * openInterest * 100 * spot * spot * 0.01;
    const dex = Number(option.delta || 0) * openInterest * 100 * spot;
    const row = byStrike.get(contract.strike) || { strike: contract.strike, callGex: 0, putGex: 0, callDex: 0, putDex: 0, callOi: 0, putOi: 0 };
    row[`${contract.type}Gex`] += gex;
    row[`${contract.type}Dex`] += dex;
    row[`${contract.type}Oi`] += openInterest;
    byStrike.set(contract.strike, row);
    const iv = Number(option.iv || 0);
    if (iv > 0) {
      // Time to the 4pm ET close on expiration day, floored at 15 minutes.
      const days = Math.max(daysBetween(now.date, contract.expiration) + (960 - now.minutes) / 1440, 15 / 1440);
      profileInputs.push({ sign, strike: contract.strike, years: days / 365, iv, openInterest });
    }
  });
  const strikes = [...byStrike.values()]
    .map((row) => ({ ...row, netGex: row.callGex + row.putGex, netDex: row.callDex + row.putDex }))
    .sort((a, b) => a.strike - b.strike);
  // Walls are the biggest call gamma at or above spot and put gamma at or below it.
  const largest = (key, direction, side) => strikes
    .filter((row) => side * (row.strike - spot) >= 0)
    .reduce((best, row) => (!best || row[key] * direction > best[key] * direction ? row : best), null);
  return {
    strikes,
    levels: {
      netGex: strikes.reduce((sum, row) => sum + row.netGex, 0),
      netDex: strikes.reduce((sum, row) => sum + row.netDex, 0),
      callWall: largest("callGex", 1, 1)?.strike ?? null,
      putWall: largest("putGex", -1, -1)?.strike ?? null,
      gammaFlip: gammaFlip(profileInputs, spot),
    },
  };
}

// The gamma flip is the underlying price where total GEX changes sign.
// Re-price every contract's gamma across a ±15% grid and take the zero
// crossing nearest the current price.
function gammaFlip(inputs, spot) {
  if (!inputs.length || !spot) return null;
  const totalAt = (price) => inputs.reduce((sum, item) => sum
    + item.sign * blackScholesGamma(price, item.strike, item.years, item.iv) * item.openInterest * 100 * price * price * 0.01, 0);
  let best = null;
  let previousPrice = spot * 0.85;
  let previousTotal = totalAt(previousPrice);
  for (let step = 1; step <= 120; step += 1) {
    const price = spot * (0.85 + step * 0.0025);
    const total = totalAt(price);
    if (Math.sign(total) !== Math.sign(previousTotal) && total !== 0) {
      const crossing = previousPrice + (price - previousPrice) * (previousTotal / (previousTotal - total));
      if (best === null || Math.abs(crossing - spot) < Math.abs(best - spot)) best = crossing;
    }
    previousPrice = price;
    previousTotal = total;
  }
  return best;
}

// Expected move per expiration, from the at-the-money straddle (what the
// market charges for a move either way) and from ATM implied volatility
// (a one standard deviation move).
function expectedMoves(chain, now = easternNow(), limit = 12) {
  const spot = Number(chain.current_price || 0);
  if (!spot) return [];
  const byExpiration = new Map();
  chain.options.forEach((option) => {
    const contract = parseCboeOption(option);
    if (!contract || daysBetween(now.date, contract.expiration) < 0) return;
    const strikes = byExpiration.get(contract.expiration) || new Map();
    const pair = strikes.get(contract.strike) || {};
    // Index chains list AM and PM roots at the same strike; keep the first quoted one.
    if (!pair[contract.type] || !optionMid(pair[contract.type])) pair[contract.type] = option;
    strikes.set(contract.strike, pair);
    byExpiration.set(contract.expiration, strikes);
  });
  return [...byExpiration.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limit)
    .map(([expiration, strikes]) => {
      const candidates = [...strikes.entries()].filter(([, pair]) => optionMid(pair.call) && optionMid(pair.put));
      if (!candidates.length) return null;
      const [strike, pair] = candidates.reduce((best, item) => (Math.abs(item[0] - spot) < Math.abs(best[0] - spot) ? item : best));
      const straddle = optionMid(pair.call) + optionMid(pair.put);
      const ivs = [pair.call.iv, pair.put.iv].map(Number).filter((iv) => iv > 0);
      const atmIv = ivs.length ? ivs.reduce((sum, iv) => sum + iv, 0) / ivs.length : 0;
      const days = Math.max(daysBetween(now.date, expiration) + (960 - now.minutes) / 1440, 15 / 1440);
      return {
        expiration,
        daysToExpiration: daysBetween(now.date, expiration),
        strike,
        straddle,
        movePercent: straddle / spot * 100,
        low: spot - straddle,
        high: spot + straddle,
        atmIv,
        ivMove: atmIv ? spot * atmIv * Math.sqrt(days / 365) : 0,
      };
    })
    .filter(Boolean);
}

function optionMid(option) {
  if (!option) return 0;
  const bid = Number(option.bid || 0);
  const ask = Number(option.ask || 0);
  return bid > 0 && ask > 0 ? (bid + ask) / 2 : Number(option.last_trade_price || 0);
}

// IV rank needs a year of implied volatility. Cboe publishes free history for
// its volatility indexes, so tickers with one get a real rank immediately;
// every other ticker uses IV30 recorded daily by this server.
const CBOE_VOL_INDEXES = {
  SPX: "VIX", SPY: "VIX", XSP: "VIX", SPXW: "VIX",
  NDX: "VXN", QQQ: "VXN",
  RUT: "RVX", IWM: "RVX",
  DIA: "VXD", DJX: "VXD",
  AAPL: "VXAPL", AMZN: "VXAZN", GOOG: "VXGOG", GOOGL: "VXGOG", GS: "VXGS", IBM: "VXIBM",
  GLD: "GVZ", USO: "OVX", EEM: "VXEEM", SLV: "VXSLV", EFA: "VXEFA",
};
const HISTORY_CACHE_MS = 6 * 60 * 60 * 1000;
const IV_RANK_MIN_DAYS = 20;
const historyCache = new Map();

async function sendVolatility(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!/^[A-Z0-9.]{1,10}$/.test(symbol)) {
    send(response, 400, JSON.stringify({ error: "Enter a valid ticker" }), "application/json; charset=utf-8");
    return;
  }
  const chain = await fetchCboeChain(symbol);
  if (!chain) {
    send(response, 404, JSON.stringify({ error: `No option data for ${symbol}` }), "application/json; charset=utf-8");
    return;
  }
  const [ivRank, prices] = await Promise.all([
    impliedVolatilityRank(symbol, Number(chain.iv30 || 0)),
    fetchCboeHistory(CBOE_INDEX_SYMBOLS.has(symbol) ? `_${symbol}` : symbol),
  ]);
  const hv30 = realizedVolatility(prices, 30);
  send(response, 200, JSON.stringify({
    symbol,
    source: "Cboe delayed quotes",
    timestamp: chain.timestamp,
    spot: Number(chain.current_price || 0),
    priceChangePercent: Number(chain.price_change_percent || 0),
    iv30: Number(chain.iv30 || 0),
    hv30,
    ...ivRank,
    expectedMoves: expectedMoves(chain),
  }), "application/json; charset=utf-8");
}

async function fetchCboeHistory(cboeSymbol) {
  const cached = historyCache.get(cboeSymbol);
  if (cached && Date.now() - cached.at < HISTORY_CACHE_MS) return cached.data;
  try {
    const historyResponse = await fetch(`https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/${encodeURIComponent(cboeSymbol)}.json`, {
      headers: { "User-Agent": "Mozilla/5.0 TradingJournal/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!historyResponse.ok) return [];
    const payload = await historyResponse.json();
    const data = (payload.data || [])
      .map((day) => ({ date: day.date, close: Number(day.close) }))
      .filter((day) => day.date && day.close > 0);
    historyCache.set(cboeSymbol, { at: Date.now(), data });
    return data;
  } catch {
    return [];
  }
}

async function fetchCboeQuote(cboeSymbol) {
  try {
    const quoteResponse = await fetch(`https://cdn.cboe.com/api/global/delayed_quotes/quotes/${encodeURIComponent(cboeSymbol)}.json`, {
      headers: { "User-Agent": "Mozilla/5.0 TradingJournal/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!quoteResponse.ok) return 0;
    return Number((await quoteResponse.json()).data?.current_price || 0);
  } catch {
    return 0;
  }
}

// Annualized standard deviation of daily log returns, in percent.
function realizedVolatility(prices, days) {
  const closes = prices.slice(-(days + 1)).map((day) => day.close);
  if (closes.length < days + 1) return null;
  const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index]));
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance * 252) * 100;
}

function rankAgainst(current, series) {
  const low = Math.min(...series);
  const high = Math.max(...series);
  return {
    ivRank: high > low ? (current - low) / (high - low) * 100 : null,
    ivPercentile: series.filter((value) => value < current).length / series.length * 100,
    ivLow: low,
    ivHigh: high,
  };
}

async function impliedVolatilityRank(symbol, iv30) {
  const index = CBOE_VOL_INDEXES[symbol];
  if (index) {
    const history = (await fetchCboeHistory(`_${index}`)).slice(-252);
    const current = await fetchCboeQuote(`_${index}`) || history.at(-1)?.close || 0;
    if (history.length >= IV_RANK_MIN_DAYS && current) {
      return { ivSource: index, ivCurrent: current, ivHistoryDays: history.length, ...rankAgainst(current, history.map((day) => day.close)) };
    }
  }
  const recorded = Object.entries(await readDailyIv(symbol))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-252)
    .map(([, value]) => value);
  const base = { ivSource: "recorded", ivCurrent: iv30, ivHistoryDays: recorded.length };
  if (recorded.length < IV_RANK_MIN_DAYS || !iv30) return { ...base, ivRank: null, ivPercentile: null, ivLow: null, ivHigh: null };
  return { ...base, ...rankAgainst(iv30, recorded) };
}

async function readDailyIv(symbol) {
  try {
    return JSON.parse(await fs.readFile(path.join(IV_DIR, `${symbol}.json`), "utf8"));
  } catch {
    return {};
  }
}

// Keeps the latest IV30 seen each trading day, building IV rank history for
// tickers without a Cboe volatility index.
async function recordDailyIv(symbol, iv30) {
  const now = easternNow();
  if (!iv30 || now.weekday === 0 || now.weekday === 6 || now.minutes < 570) return;
  const history = await readDailyIv(symbol);
  if (history[now.date] === iv30) return;
  history[now.date] = iv30;
  await fs.mkdir(IV_DIR, { recursive: true });
  await fs.writeFile(path.join(IV_DIR, `${symbol}.json`), `${JSON.stringify(history, null, 2)}\n`, "utf8");
}

async function loadGexWatchlist() {
  if (gexWatchlist) return gexWatchlist;
  try {
    gexWatchlist = JSON.parse(await fs.readFile(path.join(GEX_DIR, "watchlist.json"), "utf8"));
  } catch {
    gexWatchlist = {};
  }
  return gexWatchlist;
}

async function watchGexSymbol(symbol) {
  const watchlist = await loadGexWatchlist();
  watchlist[symbol] = new Date().toISOString();
  await fs.mkdir(GEX_DIR, { recursive: true });
  await fs.writeFile(path.join(GEX_DIR, "watchlist.json"), `${JSON.stringify(watchlist, null, 2)}\n`, "utf8");
}

function gexHistoryFile(symbol, date) {
  return path.join(GEX_DIR, symbol, `${date}.json`);
}

async function readGexHistory(symbol, date) {
  try {
    return JSON.parse(await fs.readFile(gexHistoryFile(symbol, date), "utf8"));
  } catch {
    return { symbol, date, snapshots: [] };
  }
}

// Records one heatmap column per new Cboe snapshot during regular hours.
// Each row is [strike, gex all, gex week, gex 0dte, dex all, dex week, dex 0dte].
async function recordGexSnapshot(symbol, chain) {
  const snapshotTime = new Date(`${String(chain.timestamp).replace(" ", "T")}Z`);
  const now = easternNow(Number.isNaN(snapshotTime.getTime()) ? new Date() : snapshotTime);
  const history = await readGexHistory(symbol, now.date);
  const isRegularHours = now.weekday >= 1 && now.weekday <= 5 && now.minutes >= 570 && now.minutes <= 975;
  const last = history.snapshots.at(-1);
  const lastAt = last ? Date.parse(last.time) : 0;
  if (!isRegularHours || last?.timestamp === chain.timestamp || snapshotTime - lastAt < GEX_RECORD_MS - 30000) return history;

  const spot = Number(chain.current_price || 0);
  const rows = new Map();
  GEX_EXPIRY_FILTERS.forEach((filter, index) => {
    computeGex(chain, filter, now).strikes.forEach((row) => {
      if (Math.abs(row.strike - spot) > spot * GEX_HISTORY_RANGE) return;
      const values = rows.get(row.strike) || [row.strike, 0, 0, 0, 0, 0, 0];
      values[1 + index] = Math.round(row.netGex);
      values[4 + index] = Math.round(row.netDex);
      rows.set(row.strike, values);
    });
  });
  history.snapshots.push({
    time: snapshotTime.toISOString(),
    timestamp: chain.timestamp,
    spot,
    rows: [...rows.values()],
  });
  await fs.mkdir(path.dirname(gexHistoryFile(symbol, now.date)), { recursive: true });
  await fs.writeFile(gexHistoryFile(symbol, now.date), JSON.stringify(history), "utf8");
  return history;
}

async function recordWatchedGex() {
  const watchlist = await loadGexWatchlist();
  const cutoff = Date.now() - GEX_WATCH_DAYS * 86400000;
  for (const [symbol, lastRequested] of Object.entries(watchlist)) {
    if (Date.parse(lastRequested) < cutoff) continue;
    const chain = await fetchCboeChain(symbol);
    if (chain) await recordGexSnapshot(symbol, chain).catch((error) => console.error(`GEX record failed for ${symbol}`, error));
  }
}

async function backupJournal(request) {
  const id = journalId(request);
  const file = journalFile(request);
  try {
    const current = await fs.readFile(file, "utf8").catch(async (error) => {
      if (error.code === "ENOENT" && id === "mine") return fs.readFile(DATA_FILE, "utf8");
      throw error;
    });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const existing = (await fs.readdir(BACKUP_DIR))
      .filter((name) => name.startsWith(`journal-${id}-backup-`))
      .sort()
      .reverse();
    // Journal notes autosave often. Space backups out so a busy writing session
    // cannot rotate the older restore points out of the kept set.
    if (existing[0]) {
      const newest = await fs.stat(path.join(BACKUP_DIR, existing[0]));
      if (Date.now() - newest.mtimeMs < BACKUP_MIN_INTERVAL_MS) return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(path.join(BACKUP_DIR, `journal-${id}-backup-${stamp}.json`), current, "utf8");
    const backups = (await fs.readdir(BACKUP_DIR))
      .filter((name) => name.startsWith(`journal-${id}-backup-`))
      .sort()
      .reverse();
    await Promise.all(backups.slice(25).map((name) => fs.unlink(path.join(BACKUP_DIR, name))));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function saveUpload(request, response) {
  const body = JSON.parse(await readBody(request));
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(body.data || "");
  if (!match) {
    send(response, 400, JSON.stringify({ error: "Invalid image data" }), "application/json; charset=utf-8");
    return;
  }
  const extension = mimeExtension(match[1]);
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(match[2], "base64"));
  send(response, 200, JSON.stringify({ path: `/data/uploads/${filename}` }), "application/json; charset=utf-8");
}

function mimeExtension(mime) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  }[mime] || "png";
}

async function sendStatic(request, response) {
  const urlPath = new URL(request.url, `http://localhost:${PORT}`).pathname;
  const cleanPath = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const filePath = path.normalize(path.join(ROOT, cleanPath));

  if (!filePath.startsWith(ROOT)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const type = contentTypes[path.extname(filePath)] || "application/octet-stream";
    send(response, 200, data, type);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    send(response, 404, "Not found", "text/plain; charset=utf-8");
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function send(response, status, body, type) {
  response.writeHead(status, { "Content-Type": type });
  response.end(body);
}

setInterval(() => recordWatchedGex().catch((error) => console.error(error)), GEX_RECORD_MS);

server.listen(PORT, () => {
  console.log(`Trading Journal running at http://localhost:${PORT}`);
  console.log(`Journal file: ${path.join(DATA_DIR, "journal-mine.json")}`);
});
