# Trading Journal

A personal, manual trading journal inspired by TradeZella’s journaling workflow. The app is focused on logging trades and finding performance patterns without connecting to brokers, charting platforms, or trading APIs.

## What It Does

- **Dashboard overview** with current balance, net P&L, open positions, win rate, and recent session performance.
- **Manual trade log** with searchable and filterable trades, including open multi-day positions that can be closed later.
- **Option and share-purchase entry** for logging contracts or open stock holdings from the same New Trade action.
- **Poor man's covered call entry** for ongoing long-call diagonal setups with long-call and short-call legs.
- **Cash-secured put assignment** into share positions, with covered-call tracking and premium-adjusted average cost.
- **Options strategy support** including long calls, long puts, cash-secured puts, poor man's covered calls, and credit spreads (put/call credit spreads, neutral iron condors, and diagonal credit spreads) with max loss filled in as trade risk.
- **Options flow scanner** that ranks unusual contracts (volume above open interest, large premium) from Cboe's free delayed chains, with call/put premium split per ticker and a flag on contracts you hold.
- **Gamma exposure (GEX/DEX)** by strike with gamma flip, call wall and put wall, filters for all expirations, this week or 0DTE, and an intraday heatmap the server records every 5 minutes during market hours.
- **Expected move and IV rank** per ticker: straddle-implied and 1 SD moves for the next 12 expirations, IV rank/percentile (from Cboe volatility indexes where available, otherwise from IV30 recorded daily), HV30, and a check of your open short strikes against the expected move.
- **Best-effort delayed live valuation** for open shares, option contracts, PMCC legs, and every leg of a credit spread, with unrealized P&L shown on the dashboard.
- **Calendar view** for monthly P&L and trade count.
- **Strategy rule checklists** with per-trade rule scoring and execution scoring.
- **Starting balance setting** with equity curve and drawdown charts for account-level analysis.
- **Import/export** support for JSON backups.
- **CSV export/import** for spreadsheet workflows.
- **Automatic backup rotation** in `data/backups/`.
- **Undo delete**, duplicate trade detection, partial-exit validation, and dark mode.
- **File-backed persistence** through a local Node server.

## Project Files

```text
trading-journal/
├── index.html       # Main app markup
├── styles.css       # Full app styling
├── app.js           # Journal state, UI rendering, metrics, and interactions
└── server.js        # Local server and JSON persistence API
```

## How To Run

Start the local server from the project folder:

```bash
node server.js
```

Then open:

```text
http://localhost:4173
```

The server serves the app and saves your private journal files under:

```text
data/
```

## Local Setup

### Prerequisites

- Node.js installed on your machine.
- A terminal app.
- A browser such as Chrome, Safari, Firefox, or Edge.

You do not need npm packages, a database, or a build step. The app uses plain HTML, CSS, JavaScript, and Node’s built-in server modules.

### Setup Steps

1. Put the project folder somewhere you want to keep it, for example:

   ```text
   Documents/trading-journal
   ```

2. Open a terminal in the project folder:

   ```bash
   cd path/to/trading-journal
   ```

3. Start the app:

   ```bash
   node server.js
   ```

4. Open this URL in your browser:

   ```text
   http://localhost:4173
   ```

5. Add or edit a trade. The app should show **Saved to file** in the top bar.

6. Confirm your local data file exists:

   ```text
   data/journal-mine.json
   ```

The `data/` folder is ignored by git, so each person using the app keeps their own trades, backups, and uploads locally.

### Stopping The App

In the terminal where the server is running, press:

```text
Control + C
```

### Running On A Different Port

If port `4173` is already in use, start the server with another port:

```bash
PORT=5000 node server.js
```

Then open:

```text
http://localhost:5000
```

### Direct File Fallback

You can open `index.html` directly in a browser, but that uses browser `localStorage` only. For durable file-backed saving, run the app with:

```bash
node server.js
```

## Persistence

The app uses two persistence layers:

1. **Primary:** JSON files in `data/` when running through `node server.js`.
2. **Fallback:** browser `localStorage` if you open `index.html` directly without the server.

For the most reliable setup, use the local server URL instead of opening the HTML file directly.

Your journal data is local to your machine. Run the app with `node server.js`, then use `http://localhost:4173`; the top bar should show **Saved to file** after edits or imports. If it shows **Saved in browser**, the local server is not running and changes are only in that browser profile.

The server creates these files as needed:

```text
data/journal-mine.json
data/backups/
data/uploads/
```

The entire `data/` folder is ignored by git. To set up the app on another machine, clone the repo, run `node server.js`, and start entering trades. To move existing data to another machine, export a JSON backup from the top bar and import it there, or manually copy your local `data/` folder.

## Basic Workflow

1. Open the dashboard.
2. Click **New Trade** to manually enter a trade.
3. Choose an option trade or share purchase, then add the entry and optional exit.
4. Set your starting balance in **Settings**.

## Data Backups

Use **Export** in the top bar to download a JSON backup of your journal.

Use **Import** to restore a previously exported journal file.

## Current Scope

This app intentionally does not include:

- Broker sync
- Charting platform integrations
- Automatic trade importing
- Login/accounts
- Cloud sync
- Guaranteed broker-grade or real-time market data (quotes are best-effort and may be delayed)

That keeps it lightweight, private, and easy to customize.

## Next Ideas

- Add image upload for chart screenshots instead of URL-only screenshots.
- Add calendar-style monthly P&L view.
- Add custom tag categories.
- Add CSV import/export.
- Add risk settings and max daily loss tracking.
