import type { NotificationMetrics } from '../../contracts/metrics.ts'

export interface DashboardOptions {
  title?: string
  basePath?: string
  filterQuery?: string
}

/**
 * Generate a complete, self-contained HTML metrics dashboard.
 * Zero external dependencies — everything is embedded.
 */
export function createDashboardHtml(
  metrics: NotificationMetrics,
  options?: DashboardOptions
): string {
  const title = options?.title ?? 'Notification Metrics'
  const basePath = options?.basePath ?? ''
  const filterQuery = options?.filterQuery ?? ''
  const { inbox, deliveries, computedAt } = metrics

  const formatNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`

  // -- Data prep
  const channels = Object.keys(deliveries.byChannelAndStatus).sort()
  const types = Object.keys(deliveries.byType).sort()
  const statusOrder: Array<keyof typeof deliveries.byStatus> = ['sent', 'failed', 'pending', 'skipped']

  const maxTypeVal = Math.max(1, ...types.map((t) => deliveries.byType[t] ?? 0))

  const channelTotals = channels.map((ch) => ({
    name: ch,
    total: Object.values(deliveries.byChannelAndStatus[ch] ?? {}).reduce((a, b) => a + b, 0),
  }))

  const e = escapeHtml

  // Metric card
  const card = (label: string, value: string, cls?: string) => `
    <div class="metric-card${cls ? ' ' + cls : ''}">
      <div class="metric-value">${e(value)}</div>
      <div class="metric-label">${e(label)}</div>
    </div>
  `

  // Table header
  const tableHead = (headers: string[]) => `
    <thead>
      <tr>${headers.map((h) => `<th scope="col">${e(h)}</th>`).join('')}</tr>
    </thead>
  `

  // Channel × status rows
  const deliveryRows = channels
    .map((ch) => {
      const row = deliveries.byChannelAndStatus[ch] ?? {}
      const total = statusOrder.reduce((sum, s) => sum + (row[s] ?? 0), 0)
      return `
        <tr data-sort-total="${total}">
          <td class="col-channel"><span class="channel-badge">${e(ch)}</span></td>
          <td class="col-num">${total}</td>
          ${statusOrder
            .map((s) => `<td class="col-num${row[s] ? ' has-data' : ''}">${row[s] ?? 0}</td>`)
            .join('')}
        </tr>
      `
    })
    .join('')

  // Type rows
  const typeRows = types
    .map((t) => {
      const count = deliveries.byType[t] ?? 0
      return `
        <tr data-sort-total="${count}">
          <td class="col-type"><code>${e(t)}</code></td>
          <td class="col-num">${count}</td>
          <td class="col-chart">
            <div class="bar-bg"><div class="bar-fill" style="width: ${(count / maxTypeVal) * 100}%"></div></div>
          </td>
        </tr>
      `
    })
    .join('')

  // Inbox section
  const inboxSection = inbox
    ? `
    <section class="panel" aria-labelledby="inbox-heading">
      <div class="panel-header">
        <h2 id="inbox-heading">Inbox Metrics</h2>
      </div>
      <div class="metrics-row">
        ${card('Total', String(inbox.total))}
        ${card('Unread', String(inbox.unread), 'accent-unread')}
        ${card('Read', String(inbox.read))}
        ${card('Unseen', String(inbox.unseen))}
      </div>
      ${
        Object.keys(inbox.byType).length
          ? `
      <div class="overflow-panel">
        <table class="data-table">
          <caption>Inbox items by notification type</caption>
          ${tableHead(['Type', 'Count'])}
          <tbody>
            ${Object.entries(inbox.byType)
              .sort((a, b) => b[1] - a[1])
              .map(
                ([t, c]) => `
              <tr>
                <td class="col-type"><code>${e(t)}</code></td>
                <td class="col-num">${c}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      `
          : ''
      }
    </section>
    `
    : ''

  // Status bar chart (SVG)
  const statusBarSvg = (() => {
    const totalStatusCount = statusOrder.reduce((sum, s) => sum + (deliveries.byStatus[s] ?? 0), 0)
    if (totalStatusCount === 0) return ''
    const barHeight = 20
    const barGap = 4
    const chartW = 240
    const chartH = statusOrder.length * (barHeight + barGap)
    const maxStatusVal = Math.max(1, ...statusOrder.map((s) => deliveries.byStatus[s] ?? 0))
    const scaleX = (v: number) => (v / maxStatusVal) * chartW

    return `
      <svg viewBox="0 0 ${chartW} ${chartH}" class="status-chart" role="img" aria-label="Delivery status breakdown">
        ${statusOrder
          .map((s, i) => {
            const val = deliveries.byStatus[s] ?? 0
            const barW = scaleX(val)
            const y = i * (barHeight + barGap)
            return `
            <g>
              <rect x="0" y="${y}" width="${barW}" height="${barHeight}" rx="3"
                class="status-rect status-${s}" />
              <text x="${barW + 6}" y="${y + barHeight / 2}" dominant-baseline="middle" class="chart-label">
                ${e(String(val))} ${e(s)}
              </text>
            </g>
          `
          })
          .join('')}
      </svg>
    `
  })()

  // Channel donut (SVG)
  const channelDonutSvg = (() => {
    if (channelTotals.length === 0) return ''
    const size = 120
    const stroke = 12
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const totalAll = channelTotals.reduce((s, ch) => s + ch.total, 0)
    if (totalAll === 0) return ''

    let offset = 0
    const colors = [
      'var(--donut-0)',
      'var(--donut-1)',
      'var(--donut-2)',
      'var(--donut-3)',
      'var(--donut-4)',
      'var(--donut-5)',
    ]

    const arcs = channelTotals.map((ch, i) => {
      const frac = ch.total / totalAll
      const arcLen = frac * c
      const dash = `${arcLen} ${c - arcLen}`
      const el = `
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${colors[i % colors.length]}"
          stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="-${offset}"
          stroke-linecap="butt" />
      `
      offset += arcLen
      return el
    })

    return `
      <svg viewBox="0 0 ${size} ${size}" class="donut-chart" role="img" aria-label="Channel distribution">
        ${arcs.join('')}
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="donut-center">
          ${e(String(totalAll))}
        </text>
      </svg>
    `
  })()

  // Filter param extraction helper for the form
  const currentQuery = (() => {
    try {
      const params = new URLSearchParams(filterQuery)
      return {
        channel: params.get('channel') ?? '',
        notificationType: params.get('notificationType') ?? '',
        status: params.get('status') ?? '',
        from: params.get('from') ?? '',
        to: params.get('to') ?? '',
      }
    } catch {
      return { channel: '', notificationType: '', status: '', from: '', to: '' }
    }
  })()

  return `<!doctype html>
<html lang="en" data-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(title)}</title>
  <style>
    :root {
      --bg-primary: #f6f4f2;
      --bg-surface: #ffffff;
      --bg-muted: #eeedea;
      --bg-elevated: #faf9f8;
      --text-primary: #1a1a1c;
      --text-secondary: #555351;
      --text-muted: #8a8680;
      --accent: #5a7d9a;
      --accent-hover: #4a6d8a;
      --border: rgba(0,0,0,0.07);
      --border-strong: rgba(0,0,0,0.12);
      --shadow-soft: 0 1px 3px rgba(0,0,0,0.04);
      --radius: 8px;
      --status-sent-bg: #e6f0e8;
      --status-sent-text: #3a6b45;
      --status-failed-bg: #f5e6e6;
      --status-failed-text: #8a3a3a;
      --status-pending-bg: #f5f0e0;
      --status-pending-text: #7a6a2a;
      --status-skipped-bg: #ebe9e7;
      --status-skipped-text: #6a6865;
      --donut-0: #5a7d9a;
      --donut-1: #7a9aaf;
      --donut-2: #9ab5c4;
      --donut-3: #4a6b5a;
      --donut-4: #8a7d6a;
      --donut-5: #9a8a7a;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg-primary: #121214;
        --bg-surface: #1a1a1c;
        --bg-muted: #242426;
        --bg-elevated: #222224;
        --text-primary: #e8e6e3;
        --text-secondary: #b0ada8;
        --text-muted: #7a7770;
        --accent: #7a9dbd;
        --accent-hover: #8aacca;
        --border: rgba(255,255,255,0.07);
        --border-strong: rgba(255,255,255,0.12);
        --shadow-soft: 0 1px 3px rgba(0,0,0,0.2);
        --status-sent-bg: #1e3a28;
        --status-sent-text: #6cc07a;
        --status-failed-bg: #3a1a1a;
        --status-failed-text: #e08a8a;
        --status-pending-bg: #3a3518;
        --status-pending-text: #d4c46a;
        --status-skipped-bg: #2a2a2a;
        --status-skipped-text: #a8a5a0;
        --donut-0: #7a9dbd;
        --donut-1: #5a8a9a;
        --donut-2: #4a7a8a;
        --donut-3: #6a9a7a;
        --donut-4: #8a9a7a;
        --donut-5: #9a8a8a;
      }
    }

    :root[data-theme="dark"] {
      --bg-primary: #121214;
      --bg-surface: #1a1a1c;
      --bg-muted: #242426;
      --bg-elevated: #222224;
      --text-primary: #e8e6e3;
      --text-secondary: #b0ada8;
      --text-muted: #7a7770;
      --accent: #7a9dbd;
      --accent-hover: #8aacca;
      --border: rgba(255,255,255,0.07);
      --border-strong: rgba(255,255,255,0.12);
      --shadow-soft: 0 1px 3px rgba(0,0,0,0.2);
      --status-sent-bg: #1e3a28;
      --status-sent-text: #6cc07a;
      --status-failed-bg: #3a1a1a;
      --status-failed-text: #e08a8a;
      --status-pending-bg: #3a3518;
      --status-pending-text: #d4c46a;
      --status-skipped-bg: #2a2a2a;
      --status-skipped-text: #a8a5a0;
      --donut-0: #7a9dbd;
      --donut-1: #5a8a9a;
      --donut-2: #4a7a8a;
      --donut-3: #6a9a7a;
      --donut-4: #8a9a7a;
      --donut-5: #9a8a8a;
    }

    *, *::before, *::after { box-sizing: border-box; }

    html {
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.55;
      color: var(--text-primary);
      background: var(--bg-primary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      margin: 0;
      min-height: 100vh;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 20px 40px;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    .page-header h1 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 650;
      letter-spacing: -0.01em;
    }

    .page-header time {
      font-size: 12px;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border-strong);
      background: var(--bg-surface);
      color: var(--text-secondary);
      font: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease-out, border-color 0.15s ease-out;
    }
    .btn:hover {
      background: var(--bg-muted);
      border-color: var(--text-muted);
    }
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }
    .btn[aria-pressed="true"] {
      background: var(--bg-muted);
      border-color: var(--text-secondary);
    }

    .theme-toggle svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    /* Breadcrumb */
    .breadcrumb {
      margin-bottom: 8px;
      font-size: 12px;
    }
    .breadcrumb a { color: var(--text-muted); }
    .breadcrumb a:hover { color: var(--accent); }

    /* Panels */
    .panel {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-soft);
      margin-bottom: 20px;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 0;
    }
    .panel-header h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }

    /* Metrics */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 14px 16px;
    }
    @media (min-width: 600px) {
      .metrics-row { grid-template-columns: repeat(4, 1fr); }
    }
    @media (min-width: 900px) {
      .metrics-row { grid-template-columns: repeat(7, 1fr); }
    }

    .metric-card {
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-elevated);
    }
    .metric-card.accent-failure {
      border-color: var(--status-failed-bg);
      background: var(--status-failed-bg);
    }
    .metric-value {
      font-size: 18px;
      font-weight: 650;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .metric-label {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Tables */
    .overflow-panel { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .data-table caption {
      text-align: left;
      padding: 10px 16px;
      font-size: 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      caption-side: top;
    }
    .data-table th {
      text-align: left;
      padding: 9px 14px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
    }
    .data-table th:hover { color: var(--text-primary); }
    .data-table th.sortable::after {
      content: " \\2195";
      opacity: 0.3;
      font-size: 10px;
    }
    .data-table th.sort-asc::after { content: " \\2191"; opacity: 1; }
    .data-table th.sort-desc::after { content: " \\2193"; opacity: 1; }
    .data-table td {
      padding: 9px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: var(--bg-elevated); }

    .col-num { text-align: right; font-variant-numeric: tabular-nums; }
    .col-channel { white-space: nowrap; }
    .col-type code {
      font-family: var(--font-mono);
      font-size: 12px;
      padding: 2px 5px;
      border-radius: 4px;
      background: var(--bg-muted);
      color: var(--text-secondary);
    }

    .channel-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--bg-muted);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .status-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Chart cells */
    .bar-bg {
      width: 100%;
      height: 6px;
      background: var(--bg-muted);
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 3px;
      transition: width 0.5s cubic-bezier(0.25, 1, 0.5, 1);
    }

    /* SVG charts */
    .chart-row {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 14px 16px;
      flex-wrap: wrap;
    }
    .chart-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .chart-block-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .status-chart { width: 240px; height: auto; }
    .status-chart .status-rect { opacity: 0.9; }
    .status-chart .status-sent { fill: var(--status-sent-text); }
    .status-chart .status-failed { fill: var(--status-failed-text); }
    .status-chart .status-pending { fill: var(--status-pending-text); }
    .status-chart .status-skipped { fill: var(--status-skipped-text); }
    .chart-label {
      font-size: 11px;
      fill: var(--text-secondary);
    }
    .donut-chart { width: 120px; height: auto; }
    .donut-center {
      font-size: 14px;
      font-weight: 650;
      fill: var(--text-primary);
    }

    /* Channel legend */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      padding: 0 16px 14px;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    .legend-swatch {
      width: 8px;
      height: 8px;
      border-radius: 2px;
    }

    /* Filter form */
    .filter-form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .filter-field label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .filter-field input,
    .filter-field select {
      padding: 5px 8px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--bg-surface);
      color: var(--text-primary);
      font: inherit;
      font-size: 13px;
      min-width: 120px;
    }
    .filter-field input:focus,
    .filter-field select:focus {
      outline: 2px solid var(--accent);
      outline-offset: -1px;
    }

    /* Auto-refresh */
    .refresh-indicator {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--status-sent-text);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .bar-fill { transition: none; }
      .pulse { animation: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="page-header" role="banner">
      <div>
        ${basePath ? `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${e(basePath)}">Dashboard</a> / <span aria-current="page">${e(title)}</span></nav>` : ''}
        <h1>${e(title)}</h1>
        <time datetime="${e(computedAt)}">Computed at ${new Date(computedAt).toLocaleString()}</time>
      </div>
      <div class="header-actions">
        <button class="btn theme-toggle" id="themeToggle" title="Toggle theme" aria-label="Toggle dark mode">
          <svg viewBox="0 0 24 24" aria-hidden="true" id="themeIcon"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.3 2.1 5.403 5.403 0 0 1-3.14-9.8c.44-.06.89-.1 1.34-.11h.2z"/></svg>
        </button>
        <button class="btn" id="csvBtn" title="Download CSV">Export CSV</button>
        <button class="btn" id="jsonBtn" title="Download JSON">Export JSON</button>
      </div>
    </header>

    <section class="panel" aria-labelledby="overview-heading">
      <form class="filter-form" id="filterForm" method="get" action="">
        <div class="filter-field">
          <label for="f-channel">Channel</label>
          <select id="f-channel" name="channel">
            <option value="">All</option>
            ${channels.map((ch) => `<option value="${e(ch)}"${currentQuery.channel === ch ? ' selected' : ''}>${e(ch)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-field">
          <label for="f-type">Type</label>
          <select id="f-type" name="notificationType">
            <option value="">All</option>
            ${types.map((t) => `<option value="${e(t)}"${currentQuery.notificationType === t ? ' selected' : ''}>${e(t)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-field">
          <label for="f-status">Status</label>
          <select id="f-status" name="status">
            <option value="">All</option>
            ${['sent', 'failed', 'pending', 'skipped'].map((s) => `<option value="${s}"${currentQuery.status === s ? ' selected' : ''}>${e(s[0].toUpperCase() + s.slice(1))}</option>`).join('')}
          </select>
        </div>
        <div class="filter-field">
          <label for="f-from">From</label>
          <input type="date" id="f-from" name="from" value="${e(currentQuery.from)}">
        </div>
        <div class="filter-field">
          <label for="f-to">To</label>
          <input type="date" id="f-to" name="to" value="${e(currentQuery.to)}">
        </div>
        <div class="filter-field">
          <button type="submit" class="btn btn-primary">Apply</button>
          <button type="button" class="btn" id="clearFilters">Clear</button>
        </div>
      </form>

      <div class="metrics-row">
        ${card('Total Deliveries', String(deliveries.total))}
        ${card('Sent', String(deliveries.byStatus.sent ?? 0))}
        ${card('Failed', String(deliveries.byStatus.failed ?? 0), 'accent-failure')}
        ${card('Pending', String(deliveries.byStatus.pending ?? 0))}
        ${card('Skipped', String(deliveries.byStatus.skipped ?? 0))}
        ${card('Failure Rate', formatPct(deliveries.failureRate), deliveries.failureRate > 0.05 ? 'accent-failure' : '')}
        ${card('Avg Attempts', formatNum(deliveries.averageAttempts))}
      </div>

      <div class="chart-row">
        <div class="chart-block">
          <span class="chart-block-label">Status Breakdown</span>
          ${statusBarSvg}
        </div>
        <div class="chart-block">
          <span class="chart-block-label">Channels</span>
          ${channelDonutSvg}
        </div>
        ${channelTotals.length > 0 ? `
        <div class="legend">
          ${channelTotals.map((ch, i) => {
            const colors = ['#5a7d9a','#7a9aaf','#9ab5c4','#4a6b5a','#8a7d6a','#9a8a7a']
            return `<span class="legend-item"><span class="legend-swatch" style="background:${colors[i % colors.length]}"></span>${e(ch.name)}</span>`
          }).join('')}
        </div>
        ` : ''}
      </div>
    </section>

    ${
      channels.length > 0
        ? `
    <section class="panel" aria-labelledby="channel-heading">
      <div class="panel-header">
        <h2 id="channel-heading">Deliveries by Channel</h2>
        <span class="refresh-indicator"><span class="pulse" aria-hidden="true"></span><span id="refreshLabel">Refreshing in 30s</span></span>
      </div>
      <div class="overflow-panel">
        <table class="data-table" id="channelTable">
          <caption>Delivery counts grouped by channel and current status</caption>
          ${tableHead(['Channel', 'Total', 'Sent', 'Failed', 'Pending', 'Skipped'])}
          <tbody>${deliveryRows}</tbody>
        </table>
      </div>
    </section>
    `
        : ''
    }

    ${
      types.length > 0
        ? `
    <section class="panel" aria-labelledby="type-heading">
      <div class="panel-header">
        <h2 id="type-heading">By Notification Type</h2>
      </div>
      <div class="overflow-panel">
        <table class="data-table" id="typeTable">
          <caption>Counts per notification type with proportional bar</caption>
          ${tableHead(['Type', 'Count', 'Distribution'])}
          <tbody>${typeRows}</tbody>
        </table>
      </div>
    </section>
    `
        : ''
    }

    ${inboxSection}

    <footer role="contentinfo" style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
      <p>AdonisJS Notification Dashboard &mdash; Built for operators who value signal over noise.</p>
    </footer>
  </div>

  <script>
    (() => {
      // Theme toggle
      const html = document.documentElement
      const themeBtn = document.getElementById('themeToggle')
      const themeIcon = document.getElementById('themeIcon')
      const stored = localStorage.getItem('dashboard.theme')
      if (stored) html.setAttribute('data-theme', stored)
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) html.setAttribute('data-theme', 'dark')

      function updateIcon() {
        const isDark = html.getAttribute('data-theme') === 'dark'
        themeIcon.innerHTML = isDark
          ? '<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-2a1 1 0 0 0 1-1V2a1 1 0 0 0-2 0v2a1 1 0 0 0 1 1zm0 16a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1zm9.07-7.07a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 1.414l1.414 1.414a1 1 0 0 0 1.414 0zM5.343 5.343a1 1 0 0 0 1.414-1.414L5.343 2.515a1 1 0 1 0-1.414 1.414l1.414 1.414zm12.728 12.728a1 1 0 0 0-1.414 1.414l1.414 1.414a1 1 0 0 0 1.414-1.414l-1.414-1.414zM2 12a1 1 0 0 0 1 1h2a1 1 0 0 0 0-2H3a1 1 0 0 0-1 1zm19 1h2a1 1 0 0 0 0-2h-2a1 1 0 0 0 0 2z"/>'
          : '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.3 2.1 5.403 5.403 0 0 1-3.14-9.8c.44-.06.89-.1 1.34-.11h.2z"/>'
      }
      updateIcon()

      themeBtn.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
        html.setAttribute('data-theme', next)
        localStorage.setItem('dashboard.theme', next)
        updateIcon()
      })

      // Clear filters
      document.getElementById('clearFilters').addEventListener('click', () => {
        window.location.href = window.location.pathname
      })

      // Table sort
      function makeSortable(table) {
        const headers = table.querySelectorAll('th')
        headers.forEach((th, colIdx) => {
          th.classList.add('sortable')
          th.addEventListener('click', () => {
            const tbody = table.querySelector('tbody')
            const rows = Array.from(tbody.querySelectorAll('tr'))
            const isAsc = !th.classList.contains('sort-asc')
            headers.forEach((h) => h.classList.remove('sort-asc', 'sort-desc'))
            th.classList.add(isAsc ? 'sort-asc' : 'sort-desc')

            rows.sort((a, b) => {
              const av = a.children[colIdx]?.textContent.trim() ?? ''
              const bv = b.children[colIdx]?.textContent.trim() ?? ''
              const an = parseFloat(av.replace(/[^0-9.\-]/g, ''))
              const bn = parseFloat(bv.replace(/[^0-9.\-]/g, ''))
              const bothNum = !isNaN(an) && !isNaN(bn) && av === String(an) && bv === String(bn)
              if (bothNum) return isAsc ? an - bn : bn - an
              return isAsc ? av.localeCompare(bv) : bv.localeCompare(av)
            })

            rows.forEach((r) => tbody.appendChild(r))
          })
        })
      }
      document.querySelectorAll('.data-table').forEach(makeSortable)

      // CSV export
      function download(name, mime, body) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([body], { type: mime }))
        a.download = name
        a.click()
        URL.revokeObjectURL(a.href)
      }

      document.getElementById('csvBtn').addEventListener('click', () => {
        const rows = [['Channel','Total','Sent','Failed','Pending','Skipped']]
        document.querySelectorAll('#channelTable tbody tr').forEach((tr) => {
          rows.push(Array.from(tr.children).map((td) => td.textContent.trim()))
        })
        download('notification-metrics.csv', 'text/csv', rows.map((r) => r.join(',')).join('\n'))
      })

      document.getElementById('jsonBtn').addEventListener('click', () => {
        const data = {
          title: ${JSON.stringify(title)},
          computedAt: ${JSON.stringify(computedAt)},
          deliveries: {
            total: ${deliveries.total},
            byStatus: ${JSON.stringify(deliveries.byStatus)},
            byChannel: ${JSON.stringify(deliveries.byChannel)},
            byType: ${JSON.stringify(deliveries.byType)},
            byChannelAndStatus: ${JSON.stringify(deliveries.byChannelAndStatus)},
            averageAttempts: ${deliveries.averageAttempts},
            failureRate: ${deliveries.failureRate},
          },
          inbox: ${inbox ? JSON.stringify(inbox) : 'null'}
        }
        download('notification-metrics.json', 'application/json', JSON.stringify(data, null, 2))
      })

      // Auto-refresh
      let refreshSec = 30
      let refreshTimer = refreshSec
      const refreshLabel = document.getElementById('refreshLabel')
      let intervalId

      function tick() {
        refreshTimer--
        if (refreshTimer <= 0) {
          window.location.reload()
          return
        }
        refreshLabel.textContent = 'Refreshing in ' + refreshTimer + 's'
      }

      intervalId = setInterval(tick, 1000)

      // Pause refresh on interaction
      const pauseEvents = ['mousemove', 'keydown', 'touchstart', 'scroll']
      let paused = false
      function pause() {
        if (paused) return
        paused = true
        clearInterval(intervalId)
        refreshLabel.textContent = 'Paused'
      }
      pauseEvents.forEach((e) => document.addEventListener(e, pause, { passive: true }))
    })()
  </script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
