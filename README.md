# Trading Journal

A personal, manual trading journal inspired by TradeZella’s journaling workflow. The app is focused on logging trades, reviewing sessions, tracking mistakes, and finding performance patterns without connecting to brokers, charting platforms, or trading APIs.

## What It Does

- **Dashboard overview** with net P&L, win rate, profit factor, average R, review progress, and recent session performance.
- **Manual trade log** with searchable and filterable trades.
- **Trade review screen** with notes, strategy, market condition, emotion, mistakes, rule adherence, R multiple, and P&L.
- **Daily journal** for pre-market plans, end-of-day recaps, mental state, and daily process checklist.
- **Playbook** for defining strategies and reviewing how each setup performs.
- **Reports** grouped by strategy, mistake, emotion, and market condition.
- **Import/export** support for JSON backups.
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
