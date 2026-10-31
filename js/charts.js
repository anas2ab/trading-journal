// Dependency-free SVG charts. A chart is declared in markup with chartSlot(),
// then drawn at the element's real pixel size and redrawn when it resizes, so
// labels stay crisp. All colors come from CSS variables and follow the theme.

const chartSpecs = new Map();
let chartSpecCounter = 0;

function chartSlot(spec) {
  const id = `chart-${++chartSpecCounter}`;
  chartSpecs.set(id, spec);
  return `<div class="viz" data-chart-id="${id}" style="height:${spec.height || 240}px" role="img" aria-label="${escapeHtml(spec.label || "Chart")}"></div>`;
}

const chartResizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => drawChart(entry.target));
});

function hydrateCharts(root = document) {
  root.querySelectorAll("[data-chart-id]").forEach((element) => {
    if (element.dataset.hydrated) return;
    element.dataset.hydrated = "1";
    element.chartSpec = chartSpecs.get(element.dataset.chartId);
    chartSpecs.delete(element.dataset.chartId);
    chartResizeObserver.observe(element);
  });
}

function drawChart(element) {
  const spec = element.chartSpec;
  if (!spec || !element.clientWidth || !element.isConnected) return;
  ({ area: drawAreaChart, bars: drawBarChart, grouped: drawGroupedChart }[spec.type] || (() => {}))(element, spec);
}

function niceTicks(min, max, count = 4) {
  if (min === max) {
    const pad = Math.abs(max) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = start; value <= end + step / 2; value += step) ticks.push(Math.round(value / step) * step);
  return ticks;
}

function axisMoney(value) {
  return compactMoney(value);
}

function svgFrame(width, height, inner) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${inner}</svg>`;
}

function yAxisMarkup(ticks, scale, width, left, right, format) {
  return ticks.map((tick) => `
    <line class="viz-grid ${tick === 0 ? "viz-zero" : ""}" x1="${left}" x2="${width - right}" y1="${scale(tick)}" y2="${scale(tick)}" />
    <text class="viz-tick" x="${left - 8}" y="${scale(tick) + 4}" text-anchor="end">${escapeHtml(format(tick))}</text>
  `).join("");
}

function showChartTooltip(event, rows, heading) {
  const tip = document.querySelector("#chartTip");
  if (!tip) return;
  tip.replaceChildren();
  if (heading) {
    const head = document.createElement("div");
    head.className = "tip-head";
    head.textContent = heading;
    tip.append(head);
  }
  rows.forEach(({ value, label, tone, key }) => {
    const row = document.createElement("div");
    row.className = "tip-row";
    if (key) {
      const swatch = document.createElement("i");
      swatch.style.background = key;
      row.append(swatch);
    }
    const strong = document.createElement("strong");
    strong.textContent = value;
    if (tone) strong.className = tone;
    const span = document.createElement("span");
    span.textContent = label;
    row.append(strong, span);
    tip.append(row);
  });
  tip.hidden = false;
  const box = tip.getBoundingClientRect();
  const x = event.clientX + 14 + box.width > window.innerWidth ? event.clientX - box.width - 14 : event.clientX + 14;
  const y = Math.max(8, Math.min(event.clientY - box.height - 12, window.innerHeight - box.height - 8));
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y < 8 ? event.clientY + 16 : y)}px)`;
}

function hideChartTooltip() {
  const tip = document.querySelector("#chartTip");
  if (tip) tip.hidden = true;
}

// Time series on a true date axis: spec.points = [{ date, value, rows? }].
function drawAreaChart(element, spec) {
  const points = spec.points || [];
  if (!points.length) {
    element.innerHTML = `<div class="viz-empty">${escapeHtml(spec.empty || "No data in this period yet.")}</div>`;
    return;
  }
  const width = element.clientWidth;
  const height = element.clientHeight;
  const left = 54;
  const right = 12;
  const top = 12;
  const bottom = 24;
  const values = points.map((point) => point.value);
  const domainValues = spec.baseline === undefined ? values : [...values, spec.baseline];
  const ticks = niceTicks(Math.min(...domainValues), Math.max(...domainValues));
  const yMin = ticks[0];
  const yMax = ticks.at(-1);
  const y = (value) => top + (1 - (value - yMin) / (yMax - yMin)) * (height - top - bottom);
  const times = points.map((point) => new Date(`${point.date}T00:00:00`).getTime());
  const t0 = times[0];
  const t1 = times.at(-1);
  const x = (time) => (t1 === t0 ? (left + width - right) / 2 : left + ((time - t0) / (t1 - t0)) * (width - left - right));
  const coords = points.map((point, index) => [x(times[index]), y(point.value)]);
  const line = coords.map(([px, py], index) => `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join("");
  const floor = spec.baseline === undefined ? y(yMin) : y(spec.baseline);
  const fill = `${line}L${coords.at(-1)[0].toFixed(1)} ${floor}L${coords[0][0].toFixed(1)} ${floor}Z`;
  const gradientId = `${element.dataset.chartId}-fill`;
  const tone = spec.tone || "accent";
  const xLabels = Math.max(2, Math.min(6, Math.floor((width - left - right) / 110)));
  const labelIndexes = [...new Set(Array.from({ length: xLabels }, (_, index) => Math.round((index / (xLabels - 1)) * (points.length - 1))))];
  const end = coords.at(-1);
  element.innerHTML = svgFrame(width, height, `
    <defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="var(--viz-${tone})" stop-opacity="0.22" />
      <stop offset="1" stop-color="var(--viz-${tone})" stop-opacity="0" />
    </linearGradient></defs>
    ${yAxisMarkup(ticks, y, width, left, right, spec.format || axisMoney)}
    ${spec.baseline !== undefined && !ticks.includes(spec.baseline) ? `<line class="viz-grid viz-zero" x1="${left}" x2="${width - right}" y1="${y(spec.baseline)}" y2="${y(spec.baseline)}" />` : ""}
    ${points.length > 1 ? `<path d="${fill}" fill="url(#${gradientId})" />` : ""}
    <path class="viz-line" d="${line}" stroke="var(--viz-${tone})" />
    <circle class="viz-end" cx="${end[0]}" cy="${end[1]}" r="4" fill="var(--viz-${tone})" />
    ${labelIndexes.map((index) => {
      const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
      return `<text class="viz-tick" x="${coords[index][0]}" y="${height - 6}" text-anchor="${anchor}">${escapeHtml(shortDate(points[index].date))}</text>`;
    }).join("")}
    <g class="viz-cross" hidden>
      <line x1="0" x2="0" y1="${top}" y2="${height - bottom}" />
      <circle r="5" fill="var(--viz-${tone})" />
    </g>
    <rect class="viz-hit" x="${left}" y="0" width="${width - left - right}" height="${height}" fill="transparent" />
  `);
  const cross = element.querySelector(".viz-cross");
  const hit = element.querySelector(".viz-hit");
  hit.addEventListener("pointermove", (event) => {
    const bounds = element.getBoundingClientRect();
    const px = event.clientX - bounds.left;
    let nearest = 0;
    coords.forEach(([cx], index) => {
      if (Math.abs(cx - px) < Math.abs(coords[nearest][0] - px)) nearest = index;
    });
    const point = points[nearest];
    const [cx, cy] = coords[nearest];
    cross.removeAttribute("hidden");
    cross.querySelector("line").setAttribute("x1", cx);
    cross.querySelector("line").setAttribute("x2", cx);
    cross.querySelector("circle").setAttribute("cx", cx);
    cross.querySelector("circle").setAttribute("cy", cy);
    showChartTooltip(event, point.rows || [{ value: (spec.tooltipFormat || money)(point.value), label: spec.seriesName || "Value" }], longDateShort(point.date));
  });
  hit.addEventListener("pointerleave", () => {
    cross.setAttribute("hidden", "");
    hideChartTooltip();
  });
}

function longDateShort(key) {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function roundedBarPath(x, y0, y1, width, radius) {
  const up = y1 < y0;
  const h = Math.abs(y1 - y0);
  const r = Math.min(radius, width / 2, h);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  if (up) return `M${x} ${bottom}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + width - r}Q${x + width} ${top} ${x + width} ${top + r}V${bottom}Z`;
  return `M${x} ${top}V${bottom - r}Q${x} ${bottom} ${x + r} ${bottom}H${x + width - r}Q${x + width} ${bottom} ${x + width} ${bottom - r}V${top}Z`;
}

// Single-measure bars around zero: spec.items = [{ label, value, heading?, tone? }].
function drawBarChart(element, spec) {
  const items = spec.items || [];
  if (!items.length) {
    element.innerHTML = `<div class="viz-empty">${escapeHtml(spec.empty || "No data in this period yet.")}</div>`;
    return;
  }
  const width = element.clientWidth;
  const height = element.clientHeight;
  const left = 54;
  const right = 8;
  const top = 10;
  const bottom = 24;
  const values = items.map((item) => item.value);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const yMin = ticks[0];
  const yMax = ticks.at(-1);
  const y = (value) => top + (1 - (value - yMin) / (yMax - yMin)) * (height - top - bottom);
  const slot = (width - left - right) / items.length;
  const barWidth = Math.max(2, Math.min(26, slot - Math.max(2, slot * 0.28)));
  const labelEvery = Math.max(1, Math.ceil(64 / slot));
  element.innerHTML = svgFrame(width, height, `
    ${yAxisMarkup(ticks, y, width, left, right, spec.format || axisMoney)}
    ${items.map((item, index) => {
      const cx = left + slot * index + slot / 2;
      const tone = item.tone || (item.value >= 0 ? "gain" : "loss");
      const y1 = y(item.value);
      const y0 = y(0);
      const visibleY1 = Math.abs(y1 - y0) < 2 ? y0 - (item.value >= 0 ? 2 : -2) : y1;
      return `
        <g class="viz-bar" data-index="${index}" ${spec.clickable ? `data-clickable="1"` : ""}>
          <rect x="${left + slot * index}" y="0" width="${slot}" height="${height - bottom}" fill="transparent" />
          <path d="${roundedBarPath(cx - barWidth / 2, y0, visibleY1, barWidth, 4)}" fill="var(--viz-${tone})" />
        </g>
        ${index % labelEvery === 0 ? `<text class="viz-tick" x="${cx}" y="${height - 6}" text-anchor="middle">${escapeHtml(item.label)}</text>` : ""}
      `;
    }).join("")}
  `);
  element.querySelectorAll(".viz-bar").forEach((bar) => {
    const item = items[Number(bar.dataset.index)];
    bar.addEventListener("pointermove", (event) => {
      showChartTooltip(event, item.rows || [{ value: (spec.tooltipFormat || signedMoney)(item.value), label: spec.seriesName || "", tone: pnlClass(item.value) }], item.heading || item.label);
    });
    bar.addEventListener("pointerleave", hideChartTooltip);
    if (spec.onClick) bar.addEventListener("click", () => spec.onClick(item));
  });
}

// Two series in one unit, side by side, on one axis.
function drawGroupedChart(element, spec) {
  const groups = spec.groups || [];
  if (!groups.length) {
    element.innerHTML = `<div class="viz-empty">${escapeHtml(spec.empty || "No data in this period yet.")}</div>`;
    return;
  }
  const width = element.clientWidth;
  const height = element.clientHeight;
  const left = 54;
  const right = 8;
  const top = 10;
  const bottom = 24;
  const values = groups.flatMap((group) => group.values);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const yMin = ticks[0];
  const yMax = ticks.at(-1);
  const y = (value) => top + (1 - (value - yMin) / (yMax - yMin)) * (height - top - bottom);
  const slot = (width - left - right) / groups.length;
  const barWidth = Math.max(3, Math.min(18, (slot - 10) / 2 - 1));
  const labelEvery = Math.max(1, Math.ceil(56 / slot));
  element.innerHTML = svgFrame(width, height, `
    ${yAxisMarkup(ticks, y, width, left, right, spec.format || axisMoney)}
    ${groups.map((group, index) => {
      const cx = left + slot * index + slot / 2;
      return `
        <g class="viz-bar" data-index="${index}">
          <rect x="${left + slot * index}" y="0" width="${slot}" height="${height - bottom}" fill="transparent" />
          ${group.values.map((value, seriesIndex) => {
            const x0 = cx + (seriesIndex === 0 ? -barWidth - 1 : 1);
            return `<path d="${roundedBarPath(x0, y(0), Math.abs(y(value) - y(0)) < 2 ? y(0) - (value >= 0 ? 2 : -2) : y(value), barWidth, 4)}" fill="var(--viz-${spec.series[seriesIndex].tone})" />`;
          }).join("")}
        </g>
        ${index % labelEvery === 0 ? `<text class="viz-tick" x="${cx}" y="${height - 6}" text-anchor="middle">${escapeHtml(group.label)}</text>` : ""}
      `;
    }).join("")}
  `);
  element.querySelectorAll(".viz-bar").forEach((bar) => {
    const group = groups[Number(bar.dataset.index)];
    bar.addEventListener("pointermove", (event) => {
      showChartTooltip(event, spec.series.map((series, seriesIndex) => ({
        value: money(group.values[seriesIndex]),
        label: series.name,
        key: `var(--viz-${series.tone})`,
      })), group.heading || group.label);
    });
    bar.addEventListener("pointerleave", hideChartTooltip);
  });
}

function chartLegend(series) {
  return `<div class="viz-legend">${series.map((item) => `<span><i style="background:var(--viz-${item.tone})"></i>${escapeHtml(item.name)}</span>`).join("")}</div>`;
}

function sparkline(values, tone = "accent") {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${((index / (values.length - 1)) * 100).toFixed(2)},${(28 - ((value - min) / span) * 24).toFixed(2)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" stroke="var(--viz-${tone})" /></svg>`;
}

// Ranked rows diverging from a shared zero, as HTML so labels never clip.
function rankBars(rows, { format = signedMoney, meta = () => "", onClickAttr = () => "", neutral = false } = {}) {
  if (!rows.length) return `<div class="viz-empty">Nothing to show yet.</div>`;
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  const hasNegative = !neutral && rows.some((row) => row.value < 0);
  return `<div class="rank-bars">${rows.map((row) => {
    const widthPct = (Math.abs(row.value) / max) * (hasNegative ? 50 : 100);
    const style = hasNegative
      ? (row.value >= 0 ? `left:50%;width:${widthPct}%` : `right:50%;width:${widthPct}%`)
      : `left:0;width:${widthPct}%`;
    return `
      <div class="rank-bar-row" ${onClickAttr(row)}>
        <div class="rank-bar-label"><strong>${escapeHtml(row.label)}</strong><small>${meta(row)}</small></div>
        <div class="rank-bar-track ${hasNegative ? "is-diverging" : ""}"><span class="${neutral ? "neutral" : row.value >= 0 ? "gain" : "loss"}" style="${style}"></span></div>
        <div class="rank-bar-value ${neutral ? "" : pnlClass(row.value)}">${format(row.value)}</div>
      </div>
    `;
  }).join("")}</div>`;
}
