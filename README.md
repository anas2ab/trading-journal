# Trading Journal

A personal, manual trading journal inspired by TradeZella’s journaling workflow. The app is focused on logging trades, reviewing sessions, tracking mistakes, and finding performance patterns without connecting to brokers, charting platforms, or trading APIs.

## What It Does

- **Dashboard overview** with net P&L, win rate, profit factor, average R, review progress, and recent session performance.
- **Manual trade log** with searchable and filterable trades.
- **Expanded trade entry** for asset class, account, session, planned vs actual levels, planned vs actual risk, custom tags, and partial exits.
- **Screenshot uploads** saved into the local journal file.
- **Screenshot file storage** in `data/uploads/` when running through the local server.
- **Trade review screen** with notes, strategy, market condition, emotion, mistakes, rule adherence, R multiple, and P&L.
- **Calendar view** for monthly P&L, trade count, and daily review shortcuts.
- **Daily journal** for pre-market plans, end-of-day recaps, mental state, and daily process checklist.
- **Weekly review** for best/worst trade, biggest mistake, best setup, and next-week improvement.
- **Playbook** for defining strategies and reviewing how each setup performs.
- **Strategy rule checklists** with per-trade rule scoring and execution scoring.
- **Reports** grouped by strategy, mistake, emotion, and market condition.
- **Risk dashboard** with average risk, expectancy, max drawdown, biggest win/loss, and max daily loss guard.
- **Equity curve and drawdown charts** for account-level review.
- **Mistake analytics** showing mistake cost, common mistakes, and mistakes by emotion/session.
- **Notebook** for searchable lessons and observations.
- **Blocked trade log** for trades you skipped because they violated your plan.
- **Review reminders** for open trades in the dashboard queue.
- **Autosave** for daily and weekly journal notes.
- **Import/export** support for JSON backups.
- **CSV export/import** for spreadsheet workflows.
- **Automatic backup rotation** in `data/backups/`.
- **Undo delete**, duplicate trade detection, partial-exit validation, weekly review printing, and dark mode.
- **File-backed persistence** through a local Node server.

## Project Files

```text
trading-journal/
├── index.html       # Main app markup
├── styles.css       # Full app styling
├── app.js           # Journal state, UI rendering, metrics, and interactions
├── server.js        # Local server and JSON persistence API
└── data/
    └── journal.json # Created automatically after saving through the server
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

The server serves the app and saves your journal data to:

```text
data/journal.json
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

5. Add or edit a trade. The app should show a save status in the top bar.

6. Confirm your data file exists:

   ```text
   data/journal.json
   ```

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

1. **Primary:** `data/journal.json` when running through `node server.js`.
2. **Fallback:** browser `localStorage` if you open `index.html` directly without the server.

For the most reliable setup, use the local server URL instead of opening the HTML file directly.

Your journal data is local to your machine. Run the app with `node server.js`, then use `http://localhost:4173`; the top bar should show **Saved to file** after edits or imports. If it shows **Saved in browser**, the local server is not running and changes are only in that browser profile.

`data/journal.json`, `data/backups/`, and `data/uploads/` are ignored for future local data changes so users can keep private journal files on their own machines.

## Basic Workflow

1. Open the dashboard.
2. Click **New Trade** to manually enter a trade.
3. Add trade notes, strategy, emotion, mistake, setup quality, and rule-following status.
4. Review trades from the **Trade Log** and mark them reviewed.
5. Use **Daily Journal** to write your pre-market plan and end-of-day recap.
6. Maintain strategies in **Playbook**.
7. Use **Reports** to spot patterns in wins, losses, mistakes, and market conditions.

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
- Live market data

That keeps it lightweight, private, and easy to customize.

## Next Ideas

- Add image upload for chart screenshots instead of URL-only screenshots.
- Add calendar-style monthly P&L view.
- Add custom tag categories.
- Add weekly review templates.
- Add CSV import/export.
- Add risk settings and max daily loss tracking.
