import type { NotificationMetrics } from '../../contracts/metrics.ts'
import type { DatabaseNotificationRow } from '../../contracts/repository.ts'

export interface DashboardOptions {
  title?: string
  basePath?: string
  filterQuery?: string
  csrfToken?: string
}

export interface InboxPageParams {
  metrics: NotificationMetrics
  notifications: DatabaseNotificationRow[]
  notifiableType: string
  notifiableId: string | number
  total: number
  unreadCount: number
  currentPage: number
  perPage: number
  unreadOnly: boolean
  basePath?: string
  csrfToken?: string
}

export interface InboxListParams {
  notifications: DatabaseNotificationRow[]
  notifiableType: string
  notifiableId: string | number
  total: number
  currentPage: number
  perPage: number
  unreadOnly: boolean
  basePath?: string
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tailwindCdn(): string {
  return `<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          sand: {
            50: '#f6f4f2',
            100: '#eeedea',
            150: '#e8e6e3',
            200: '#e5e3e0',
            300: '#d4d1cc',
            400: '#a09c97',
            500: '#8a8680',
            550: '#7a7770',
            600: '#6b6865',
            700: '#555351',
            800: '#3a3835',
            900: '#1a1a1c',
            950: '#121214',
          },
          dust: {
            DEFAULT: '#5a7d9a',
            hover: '#4a6d8a',
            dark: '#7a9dbd',
            'dark-hover': '#8aacca',
          },
          status: {
            sent: '#4a7c59',
            'sent-bg': '#e6f0e8',
            'sent-dark': '#6cc07a',
            'sent-bg-dark': '#1e3a28',
            failed: '#9a4a4a',
            'failed-bg': '#f5e6e6',
            'failed-dark': '#e08a8a',
            'failed-bg-dark': '#3a1a1a',
            pending: '#8a7c3a',
            'pending-bg': '#f5f0e0',
            'pending-dark': '#d4c46a',
            'pending-bg-dark': '#3a3518',
            skipped: '#7a7a7a',
            'skipped-bg': '#ebe9e7',
            'skipped-dark': '#a8a5a0',
            'skipped-bg-dark': '#2a2a2a',
          }
        },
        fontFamily: {
          sans: ['-apple-system', 'BlinkMacSystemFont', '\"Segoe UI\"', 'Roboto', '\"Helvetica Neue\"', 'sans-serif'],
          mono: ['ui-monospace', 'SFMono-Regular', '\"SF Mono\"', 'Menlo', 'Consolas', 'monospace'],
        },
      }
    }
  }
</script>`
}

function sharedStyles(): string {
  return `<style>
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    @keyframes toast-fade {
      0%   { opacity: 1; transform: translateY(0); }
      80%  { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(10px); }
    }
    :root {
      --status-sent-text: #3a6b45;
      --status-sent-bg: #e6f0e8;
      --status-failed-text: #8a3a3a;
      --status-failed-bg: #f5e6e6;
      --status-pending-text: #7a6a2a;
      --status-pending-bg: #f5f0e0;
      --status-skipped-text: #6a6865;
      --status-skipped-bg: #ebe9e7;
      --text-secondary: #555351;
      --text-primary: #1a1a1c;
      --donut-0: #5a7d9a;
      --donut-1: #7a9aaf;
      --donut-2: #9ab5c4;
      --donut-3: #4a6b5a;
      --donut-4: #8a7d6a;
      --donut-5: #9a8a7a;
    }
    .dark {
      --status-sent-text: #6cc07a;
      --status-sent-bg: #1e3a28;
      --status-failed-text: #e08a8a;
      --status-failed-bg: #3a1a1a;
      --status-pending-text: #d4c46a;
      --status-pending-bg: #3a3518;
      --status-skipped-text: #a8a5a0;
      --status-skipped-bg: #2a2a2a;
      --text-secondary: #b0ada8;
      --text-primary: #e8e6e3;
      --donut-0: #7a9dbd;
      --donut-1: #5a8a9a;
      --donut-2: #4a7a8a;
      --donut-3: #6a9a7a;
      --donut-4: #8a9a7a;
      --donut-5: #9a8a8a;
    }
    .status-chart .status-rect { opacity: 0.9; }
    .status-chart .status-sent { fill: var(--status-sent-text); }
    .status-chart .status-failed { fill: var(--status-failed-text); }
    .status-chart .status-pending { fill: var(--status-pending-text); }
    .status-chart .status-skipped { fill: var(--status-skipped-text); }
    .chart-label { font-size: 11px; fill: var(--text-secondary); }
    .donut-center { font-size: 14px; font-weight: 650; fill: var(--text-primary); }
    .bar-fill { transition: width 0.5s cubic-bezier(0.25, 1, 0.5, 1); }
    .data-table th.sortable::after { content: " \\2195"; opacity: 0.3; font-size: 10px; }
    .data-table th.sort-asc::after { content: " \\2191"; opacity: 1; }
    .data-table th.sort-desc::after { content: " \\2193"; opacity: 1; }
    .toast {
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      border: 1px solid var(--status-skipped-bg);
      background: white;
      font-size: 0.8125rem;
      line-height: 1.25rem;
      animation: toast-fade 3s ease-out forwards;
    }
    .dark .toast {
      background: var(--sand-900, #1a1a1c);
      border-color: var(--sand-700, #3a3a3c);
      color: var(--sand-100, #f0f0f0);
    }
    .toast-success {
      border-top: 3px solid var(--status-sent-text);
    }
    .toast-error {
      border-top: 3px solid var(--status-failed-text);
    }
    @media (prefers-reduced-motion: reduce) {
      .bar-fill { transition: none; }
      .pulse { animation: none; }
      .toast { animation: none; }
    }
  </style>`
}

function pageHead(title: string, csrfMeta: string, extraScripts?: string): string {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${csrfMeta}<title>${escapeHtml(title)}</title>
  <script src="https://unpkg.com/htmx.org@2.0.4" defer></script>
  ${tailwindCdn()}
  ${sharedStyles()}
  ${extraScripts ?? ''}
</head>`
}

function pageBodyOpen(hxHeadersAttr: string): string {
  return `<body class="bg-sand-50 dark:bg-sand-950 text-sand-900 dark:text-sand-150 font-sans text-sm leading-relaxed antialiased" hx-boost="true" hx-target="#main" hx-swap="innerHTML" ${hxHeadersAttr}>`
}

function themeInitScript(): string {
  return `<script>
    (() => {
      const html = document.documentElement
      const stored = localStorage.getItem('dashboard.theme')
      if (stored) html.classList.toggle('dark', stored === 'dark')
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) html.classList.add('dark')
    })()
  </script>`
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
  const csrfToken = options?.csrfToken
  const { inbox, deliveries, computedAt } = metrics

  // -- Data prep
  const channels = Object.keys(deliveries.byChannelAndStatus).sort()
  const types = Object.keys(deliveries.byType).sort()

  const statusOrder: Array<keyof typeof deliveries.byStatus> = [
    'sent',
    'failed',
    'pending',
    'skipped',
  ]

  const maxTypeVal = Math.max(1, ...types.map((t) => deliveries.byType[t] ?? 0))

  const channelTotals = channels.map((ch) => ({
    name: ch,
    total: deliveries.byChannel[ch] ?? 0,
  }))

  const e = escapeHtml

  // Metric card
  const card = (label: string, value: string, alert?: boolean) => `
    <div class="border ${alert ? 'border-status-failed-bg dark:border-status-failed-bg-dark bg-status-failed-bg dark:bg-status-failed-bg-dark' : 'border-black/[0.06] dark:border-white/[0.06] bg-sand-50 dark:bg-sand-900'} rounded-md p-2.5">
      <div class="text-lg font-semibold leading-tight tracking-tight text-sand-900 dark:text-sand-150">${value}</div>
      <div class="text-[11px] text-sand-500 dark:text-sand-550 uppercase tracking-wider mt-0.5">${label}</div>
    </div>
  `

  // Table header
  const tableHead = (headers: string[]) => `
    <thead><tr>
      ${headers.map((h) => `<th class="text-left px-3.5 py-2 text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider bg-sand-50 dark:bg-sand-900 border-b border-black/[0.06] dark:border-white/[0.06] whitespace-nowrap cursor-pointer select-none sortable">${e(h)}</th>`).join('')}
    </tr></thead>
  `

  // Channel x status rows
  const deliveryRows = channels
    .map((ch) => {
      const totals = deliveries.byChannelAndStatus[ch]
      const total = Object.values(totals).reduce((a, b) => (a as number) + (b as number), 0)
      return `
        <tr class="hover:bg-sand-50 dark:hover:bg-sand-900">
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle whitespace-nowrap">
            <span class="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-sand-100 dark:bg-sand-800 text-sand-600 dark:text-sand-400">${e(ch)}</span>
          </td>
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(total as number)}</td>
          ${statusOrder.map((s) => `<td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(totals[s] ?? 0)}</td>`).join('')}
        </tr>
      `
    })
    .join('')

  // Type rows
  const typeRows = types
    .map((t) => {
      const val = deliveries.byType[t] ?? 0
      const pct = Math.round((val / maxTypeVal) * 100)
      return `
        <tr class="hover:bg-sand-50 dark:hover:bg-sand-900">
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle">
            <code class="font-mono text-xs px-1 py-0.5 rounded bg-sand-100 dark:bg-sand-800 text-sand-700 dark:text-sand-400">${e(t)}</code>
          </td>
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(val)}</td>
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle" style="width:50%">
            <div class="w-full h-1.5 bg-sand-100 dark:bg-sand-800 rounded-full overflow-hidden">
              <div class="h-full bg-dust rounded-full bar-fill" style="width:${pct}%"></div>
            </div>
          </td>
        </tr>
      `
    })
    .join('')

  // Inbox section
  const inboxSection = inbox
    ? `
    <section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="inbox-heading">
      <div class="flex items-center justify-between px-4 pt-3.5">
        <h2 id="inbox-heading" class="text-sm font-semibold m-0">Inbox Metrics</h2>
      </div>
      <div class="grid grid-cols-2 gap-2 p-4">
        ${card('Total', formatNum(inbox.total))}
        ${card('Unread', formatNum(inbox.unread))}
        ${card('Read', formatNum(inbox.read))}
        ${card('Unseen', formatNum(inbox.unseen))}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-[13px]">
          ${tableHead(['Type', 'Count'])}
          <tbody>
            ${Object.entries(inbox.byType)
              .map(
                ([type, count]) =>
                  `<tr class="hover:bg-sand-50 dark:hover:bg-sand-900"><td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle"><code class="font-mono text-xs px-1 py-0.5 rounded bg-sand-100 dark:bg-sand-800 text-sand-700 dark:text-sand-400">${e(type)}</code></td><td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(count)}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
    `
    : ''

  // Status bar chart (SVG)
  const statusBarSvg = (() => {
    const statusList = statusOrder
    const maxVal = Math.max(1, ...statusList.map((s) => deliveries.byStatus[s] ?? 0))
    const barHeight = 22
    const barWidth = 160
    const gap = 6
    const totalHeight = statusList.length * (barHeight + gap) + gap
    return `
      <svg viewBox="0 0 ${barWidth + 60} ${totalHeight}" class="status-chart w-[240px] h-auto" aria-labelledby="status-title" role="img">
        <title id="status-title">Status breakdown</title>
        <g transform="translate(40,${gap})">
          ${statusList
            .map((s, i) => {
              const val = deliveries.byStatus[s] ?? 0
              const pct = (val / maxVal) * barWidth
              return `
                <g transform="translate(0, ${i * (barHeight + gap)})" class="status-rect status-${s}">
                  <rect x="0" y="0" width="${pct}" height="${barHeight}" rx="3" />
                  <text x="-6" y="${barHeight / 2 + 4}" text-anchor="end" class="chart-label">${e(s[0].toUpperCase() + s.slice(1))}</text>
                  <text x="${pct + 5}" y="${barHeight / 2 + 4}" class="chart-label">${formatNum(val)}</text>
                </g>
              `
            })
            .join('')}
        </g>
      </svg>
    `
  })()

  // Channel donut (SVG)
  const channelDonutSvg = (() => {
    if (channels.length === 0) return ''
    const total = channelTotals.reduce((sum, ch) => sum + ch.total, 0)
    if (total === 0) return ''
    const radius = 50
    const circumference = 2 * Math.PI * radius
    let cumulative = 0
    const colors = [
      'var(--donut-0)',
      'var(--donut-1)',
      'var(--donut-2)',
      'var(--donut-3)',
      'var(--donut-4)',
      'var(--donut-5)',
    ]
    const segments = channelTotals.map((ch, i) => {
      const frac = ch.total / total
      const dash = frac * circumference
      const offset = -cumulative
      cumulative += dash
      return `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${colors[i % colors.length]}"
        stroke-width="18" stroke-dasharray="${dash} ${circumference - dash}"
        stroke-dashoffset="${offset}" style="transform:rotate(-90deg);transform-origin:60px 60px"/>`
    })
    return `
      <svg viewBox="0 0 120 120" class="w-[120px] h-auto" aria-labelledby="channel-title" role="img">
        <title id="channel-title">Channel distribution</title>
        ${segments.join('')}
        <text x="60" y="60" text-anchor="middle" dominant-baseline="central" class="donut-center">${total}</text>
      </svg>
    `
  })()

  // Filter param extraction helper for the form
  const currentQuery = (() => {
    const params = new URLSearchParams(filterQuery)
    return {
      channel: params.get('channel') ?? '',
      notificationType: params.get('notificationType') ?? '',
      status: params.get('status') ?? '',
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
    }
  })()

  const csrfMeta = csrfToken
    ? `<meta name="csrf-token" content="${e(csrfToken)}">
  `
    : ''
  const hxHeadersAttr = `hx-headers="js:{&#39;X-CSRF-Token&#39;: document.querySelector('meta[name=csrf-token]')?.content}"`

  return `<!doctype html>
<html lang="en">
${pageHead(title, csrfMeta)}
${themeInitScript()}
${pageBodyOpen(hxHeadersAttr)}
  <div id="main">
    <div class="max-w-5xl mx-auto px-5 py-6 pb-10">
      <header class="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]" role="banner">
        <div>
          ${basePath ? `<nav class="mb-2 text-xs text-sand-500 dark:text-sand-550" aria-label="Breadcrumb"><a href="${e(basePath)}" class="text-sand-500 dark:text-sand-550 hover:text-dust dark:hover:text-dust-dark no-underline hover:underline">Dashboard</a> <span class="text-sand-400 dark:text-sand-600">/</span> <span aria-current="page" class="text-sand-600 dark:text-sand-400">${e(title)}</span></nav>` : ''}
          <h1 class="text-xl font-semibold tracking-tight m-0 mb-1">${e(title)}</h1>
          <time class="text-xs text-sand-500 dark:text-sand-550" datetime="${e(computedAt)}">Computed at ${new Date(computedAt).toLocaleString()}</time>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 text-sand-600 dark:text-sand-400 text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-sand-50 dark:hover:bg-sand-800" id="themeToggle" title="Toggle theme" aria-label="Toggle dark mode">
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-current" aria-hidden="true" id="themeIcon"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.3 2.1 5.403 5.403 0 0 1-3.14-9.8c.44-.06.89-.1 1.34-.11h.2z"/></svg>
          </button>
          <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 text-sand-600 dark:text-sand-400 text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-sand-50 dark:hover:bg-sand-800" id="csvBtn" title="Download CSV">Export CSV</button>
          <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 text-sand-600 dark:text-sand-400 text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-sand-50 dark:hover:bg-sand-800" id="jsonBtn" title="Download JSON">Export JSON</button>
        </div>
      </header>

      <section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" id="metrics-panel" aria-labelledby="overview-heading" hx-get="/" hx-trigger="every 30s" hx-target="#metrics-panel" hx-swap="innerHTML">
        <form class="filter-form flex flex-wrap items-end gap-2.5 px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06]" id="filterForm" method="get" action="" hx-get="/" hx-target="#main" hx-push-url="true">
          <div class="flex flex-col gap-0.5">
            <label for="f-channel" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">Channel</label>
            <select id="f-channel" name="channel" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
              <option value="">All</option>
              ${channels.map((ch) => `<option value="${e(ch)}"${currentQuery.channel === ch ? ' selected' : ''}>${e(ch)}</option>`).join('')}
            </select>
          </div>
          <div class="flex flex-col gap-0.5">
            <label for="f-type" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">Type</label>
            <select id="f-type" name="notificationType" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
              <option value="">All</option>
              ${types.map((t) => `<option value="${e(t)}"${currentQuery.notificationType === t ? ' selected' : ''}>${e(t)}</option>`).join('')}
            </select>
          </div>
          <div class="flex flex-col gap-0.5">
            <label for="f-status" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">Status</label>
            <select id="f-status" name="status" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
              <option value="">All</option>
              ${['sent', 'failed', 'pending', 'skipped'].map((s) => `<option value="${s}"${currentQuery.status === s ? ' selected' : ''}>${e(s[0].toUpperCase() + s.slice(1))}</option>`).join('')}
            </select>
          </div>
          <div class="flex flex-col gap-0.5">
            <label for="f-from" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">From</label>
            <input type="date" id="f-from" name="from" value="${e(currentQuery.from)}" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
          </div>
          <div class="flex flex-col gap-0.5">
            <label for="f-to" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">To</label>
            <input type="date" id="f-to" name="to" value="${e(currentQuery.to)}" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
          </div>
          <div class="flex flex-col gap-0.5">
            <button type="submit" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-dust border border-dust text-white text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-dust-hover">Apply</button>
            <button type="button" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 text-sand-600 dark:text-sand-400 text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-sand-50 dark:hover:bg-sand-800" id="clearFilters">Clear</button>
          </div>
        </form>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-4">
          ${card('Total Deliveries', String(deliveries.total))}
          ${card('Sent', String(deliveries.byStatus.sent ?? 0))}
          ${card('Failed', String(deliveries.byStatus.failed ?? 0), true)}
          ${card('Pending', String(deliveries.byStatus.pending ?? 0))}
          ${card('Skipped', String(deliveries.byStatus.skipped ?? 0))}
          ${card('Failure Rate', formatPct(deliveries.failureRate), deliveries.failureRate > 0.05)}
          ${card('Avg Attempts', formatNum(deliveries.averageAttempts))}
        </div>

        <div class="flex items-center gap-5 px-4 py-3.5 flex-wrap">
          <div class="flex flex-col items-center gap-1.5">
            <span class="text-[11px] text-sand-500 dark:text-sand-550 uppercase tracking-wider">Status Breakdown</span>
            ${statusBarSvg}
          </div>
          <div class="flex flex-col items-center gap-1.5">
            <span class="text-[11px] text-sand-500 dark:text-sand-550 uppercase tracking-wider">Channels</span>
            ${channelDonutSvg}
          </div>
          ${
            channelTotals.length > 0
              ? `
          <div class="flex flex-wrap gap-x-3.5 gap-y-2">
            ${channelTotals
              .map((ch, i) => {
                const colors = ['#5a7d9a', '#7a9aaf', '#9ab5c4', '#4a6b5a', '#8a7d6a', '#9a8a7a']
                return `<span class="inline-flex items-center gap-1 text-xs text-sand-600 dark:text-sand-400"><span class="w-2 h-2 rounded-sm" style="background:${colors[i % colors.length]}"></span>${e(ch.name)}</span>`
              })
              .join('')}
          </div>
          `
              : ''
          }
        </div>
      </section>

      ${
        channels.length > 0
          ? `
      <section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="channel-heading">
        <div class="flex items-center justify-between px-4 pt-3.5">
          <h2 id="channel-heading" class="text-sm font-semibold m-0">Deliveries by Channel</h2>
          <span class="inline-flex items-center gap-1 text-[11px] text-sand-500 dark:text-sand-550">
            <span class="w-1.5 h-1.5 rounded-full bg-status-sent-dark animate-[pulse_2s_ease-in-out_infinite]" aria-hidden="true"></span>
            <span id="refreshLabel">Refreshing in 30s</span>
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table w-full border-collapse text-[13px]" id="channelTable">
            <caption class="text-left px-4 py-2 text-xs text-sand-500 dark:text-sand-550 border-b border-black/[0.06] dark:border-white/[0.06] caption-side-top">Delivery counts grouped by channel and current status</caption>
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
      <section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="type-heading">
        <div class="flex items-center justify-between px-4 pt-3.5">
          <h2 id="type-heading" class="text-sm font-semibold m-0">By Notification Type</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table w-full border-collapse text-[13px]" id="typeTable">
            <caption class="text-left px-4 py-2 text-xs text-sand-500 dark:text-sand-550 border-b border-black/[0.06] dark:border-white/[0.06] caption-side-top">Counts per notification type with proportional bar</caption>
            ${tableHead(['Type', 'Count', 'Distribution'])}
            <tbody>${typeRows}</tbody>
          </table>
        </div>
      </section>
      `
          : ''
      }

      ${inboxSection}

      <footer class="mt-2 text-[11px] text-sand-500 dark:text-sand-550" role="contentinfo">
        <p>AdonisJS Notification Dashboard. Built for operators who value signal over noise.</p>
      </footer>
    </div>
  </div>

  <div id="toast-container" class="fixed bottom-5 right-5 flex flex-col gap-2 z-50"></div>

  <script>
    (() => {
      // Theme toggle
      const html = document.documentElement
      const themeBtn = document.getElementById('themeToggle')
      const themeIcon = document.getElementById('themeIcon')

      function updateIcon() {
        const isDark = html.classList.contains('dark')
        themeIcon.innerHTML = isDark
          ? '<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-2a1 1 0 0 0 1-1V2a1 1 0 0 0-2 0v2a1 1 0 0 0 1 1zm0 16a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1zm9.07-7.07a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 1.414l1.414 1.414a1 1 0 0 0 1.414 0zM5.343 5.343a1 1 0 0 0 1.414-1.414L5.343 2.515a1 1 0 1 0-1.414 1.414l1.414 1.414zm12.728 12.728a1 1 0 0 0-1.414 1.414l1.414 1.414a1 1 0 0 0 1.414-1.414l-1.414-1.414zM2 12a1 1 0 0 0 1 1h2a1 1 0 0 0 0-2H3a1 1 0 0 0-1 1zm19 1h2a1 1 0 0 0 0-2h-2a1 1 0 0 0 0 2z"/>'
          : '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.3 2.1 5.403 5.403 0 0 1-3.14-9.8c.44-.06.89-.1 1.34-.11h.2z"/>'
      }
      updateIcon()

      themeBtn.addEventListener('click', () => {
        const next = html.classList.contains('dark') ? 'light' : 'dark'
        html.classList.toggle('dark', next === 'dark')
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
        download('notification-metrics.csv', 'text/csv', rows.map((r) => r.join(',')).join('\\n'))
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

/**
 * Generate a full inbox page HTML document.
 */
export function createInboxPageHtml(params: InboxPageParams): string {
  const {
    metrics,
    notifications,
    notifiableType,
    notifiableId,
    total,
    unreadCount,
    currentPage,
    perPage,
    unreadOnly,
    basePath = '',
    csrfToken,
  } = params

  const title = `Inbox \u2014 ${notifiableType} ${notifiableId}`
  const e = escapeHtml

  const card = (label: string, value: string, alert?: boolean) => `
    <div class="border ${alert ? 'border-status-failed-bg dark:border-status-failed-bg-dark bg-status-failed-bg dark:bg-status-failed-bg-dark' : 'border-black/[0.06] dark:border-white/[0.06] bg-sand-50 dark:bg-sand-900'} rounded-md p-2.5">
      <div class="text-lg font-semibold leading-tight tracking-tight text-sand-900 dark:text-sand-150">${value}</div>
      <div class="text-[11px] text-sand-500 dark:text-sand-550 uppercase tracking-wider mt-0.5">${label}</div>
    </div>
  `

  const csrfMeta = csrfToken
    ? `<meta name="csrf-token" content="${e(csrfToken)}">
  `
    : ''
  const hxHeadersAttr = `hx-headers="js:{&#39;X-CSRF-Token&#39;: document.querySelector('meta[name=csrf-token]')?.content}"`

  const listFragment = createInboxListHtml({
    notifications,
    notifiableType,
    notifiableId,
    total,
    currentPage,
    perPage,
    unreadOnly,
    basePath,
  })

  const toggleLabel = unreadOnly ? 'Show all' : 'Show unread only'
  const toggleHref = unreadOnly
    ? `${basePath}/inbox/${e(notifiableType)}/${e(String(notifiableId))}/list?page=${currentPage}&perPage=${perPage}`
    : `${basePath}/inbox/${e(notifiableType)}/${e(String(notifiableId))}/list?page=${currentPage}&perPage=${perPage}&unreadOnly=true`

  return `<!doctype html>
<html lang="en">
${pageHead(title, csrfMeta)}
${themeInitScript()}
${pageBodyOpen(hxHeadersAttr)}
  <div id="main">
    <div class="max-w-5xl mx-auto px-5 py-6 pb-10">
      <header class="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]" role="banner">
        <div>
          <nav class="mb-2 text-xs text-sand-500 dark:text-sand-550" aria-label="Breadcrumb"><a href="${e(basePath) || '/'}" class="text-sand-500 dark:text-sand-550 hover:text-dust dark:hover:text-dust-dark no-underline hover:underline">Dashboard</a> <span class="text-sand-400 dark:text-sand-600">/</span> <span aria-current="page" class="text-sand-600 dark:text-sand-400">${e(title)}</span></nav>
          <h1 class="text-xl font-semibold tracking-tight m-0 mb-1">${e(title)}</h1>
          <time class="text-xs text-sand-500 dark:text-sand-550" datetime="${e(metrics.computedAt)}">Computed at ${new Date(metrics.computedAt).toLocaleString()}</time>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <a class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-dust border border-dust text-white text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-dust-hover no-underline" href="${toggleHref}" hx-target="#inbox-list" hx-swap="innerHTML">${e(toggleLabel)}</a>
        </div>
      </header>

      <section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="inbox-metrics-heading">
        <div class="flex items-center justify-between px-4 pt-3.5">
          <h2 id="inbox-metrics-heading" class="text-sm font-semibold m-0">Inbox Summary</h2>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
          ${card('Total', formatNum(total))}
          ${card('Unread', formatNum(unreadCount))}
          ${card('Read', formatNum(total - unreadCount))}
        </div>
      </section>

      <section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="inbox-list-heading">
        <div class="flex items-center justify-between px-4 pt-3.5">
          <h2 id="inbox-list-heading" class="text-sm font-semibold m-0">Notifications</h2>
        </div>
        ${listFragment}
      </section>

      <footer class="mt-2 text-[11px] text-sand-500 dark:text-sand-550" role="contentinfo">
        <p>AdonisJS Notification Dashboard. Built for operators who value signal over noise.</p>
      </footer>
    </div>
  </div>

  <div id="toast-container" class="fixed bottom-5 right-5 flex flex-col gap-2 z-50"></div>
</body>
</html>`
}

/**
 * Partial fragment for the inbox notification list (HTMX swap target).
 */
export function createInboxListHtml(params: InboxListParams): string {
  const {
    notifications,
    notifiableType,
    notifiableId,
    total,
    currentPage,
    perPage,
    unreadOnly,
    basePath = '',
  } = params

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const prevPage = currentPage > 1 ? currentPage - 1 : null
  const nextPage = currentPage < totalPages ? currentPage + 1 : null

  const e = escapeHtml

  const queryPrefix = `${basePath}/inbox/${e(notifiableType)}/${e(String(notifiableId))}/list?page=`
  const querySuffix = `${unreadOnly ? '&unreadOnly=true' : ''}&perPage=${perPage}`

  const rows =
    notifications.length > 0 ? notifications.map((n) => createNotificationRowHtml(n)).join('') : ''

  const pagination = `
    <div class="flex items-center gap-3 m-3.5 text-[13px]">
      ${
        prevPage !== null
          ? `<a href="${queryPrefix}${prevPage}${querySuffix}" class="px-2.5 py-1 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 hover:bg-sand-50 dark:hover:bg-sand-800 no-underline text-sand-900 dark:text-sand-150" hx-target="#inbox-list" hx-swap="innerHTML">← Previous</a>`
          : `<span class="px-2.5 py-1 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 opacity-40 pointer-events-none text-sand-900 dark:text-sand-150">← Previous</span>`
      }
      <span class="text-sand-500 dark:text-sand-550">Page ${currentPage} of ${totalPages}</span>
      ${
        nextPage !== null
          ? `<a href="${queryPrefix}${nextPage}${querySuffix}" class="px-2.5 py-1 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 hover:bg-sand-50 dark:hover:bg-sand-800 no-underline text-sand-900 dark:text-sand-150" hx-target="#inbox-list" hx-swap="innerHTML">Next →</a>`
          : `<span class="px-2.5 py-1 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 opacity-40 pointer-events-none text-sand-900 dark:text-sand-150">Next →</span>`
      }
    </div>
  `

  return `
<div id="inbox-list">
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-[13px]">
      <thead><tr>
        <th class="text-left px-3.5 py-2 text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider bg-sand-50 dark:bg-sand-900 border-b border-black/[0.06] dark:border-white/[0.06] whitespace-nowrap">Type</th>
        <th class="text-left px-3.5 py-2 text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider bg-sand-50 dark:bg-sand-900 border-b border-black/[0.06] dark:border-white/[0.06] whitespace-nowrap">Preview</th>
        <th class="text-left px-3.5 py-2 text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider bg-sand-50 dark:bg-sand-900 border-b border-black/[0.06] dark:border-white/[0.06] whitespace-nowrap">Status</th>
        <th class="text-left px-3.5 py-2 text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider bg-sand-50 dark:bg-sand-900 border-b border-black/[0.06] dark:border-white/[0.06] whitespace-nowrap">Created at</th>
        <th class="text-left px-3.5 py-2 text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider bg-sand-50 dark:bg-sand-900 border-b border-black/[0.06] dark:border-white/[0.06] whitespace-nowrap" style="width:1px">Actions</th>
      </tr></thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
  ${notifications.length === 0 ? '<div class="px-4 py-8 text-center text-sand-500 dark:text-sand-550 text-[13px]">No notifications found.</div>' : ''}
  ${pagination}
</div>
  `.trim()
}

/**
 * Single notification row HTML.
 */
export function createNotificationRowHtml(notification: DatabaseNotificationRow): string {
  const e = escapeHtml
  const isUnread = notification.readAt === null
  const dateStr = notification.createdAt.toLocaleString()

  const preview =
    Object.entries(notification.data)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${String(v).substring(0, 40)}`)
      .join(', ') || '(no data)'

  const markReadBtn = isUnread
    ? `<button class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 text-sand-600 dark:text-sand-400 text-[11px] font-medium cursor-pointer hover:bg-sand-50 dark:hover:bg-sand-800" hx-patch="/notifications/${e(notification.id)}/read" hx-target="closest tr" hx-swap="outerHTML">Mark read</button>`
    : `<button class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 text-sand-600 dark:text-sand-400 text-[11px] font-medium cursor-pointer hover:bg-sand-50 dark:hover:bg-sand-800" hx-patch="/notifications/${e(notification.id)}/unread" hx-target="closest tr" hx-swap="outerHTML">Mark unread</button>`

  return `
    <tr class="notification-row hover:bg-sand-50 dark:hover:bg-sand-900 ${isUnread ? 'font-semibold' : ''}" data-notification-id="${e(notification.id)}">
      <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle">
        <code class="font-mono text-xs px-1 py-0.5 rounded bg-sand-100 dark:bg-sand-800 text-sand-700 dark:text-sand-400">${e(notification.type)}</code>
      </td>
      <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle">${e(preview)}</td>
      <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle">
        <span class="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold" style="${isUnread ? 'background:var(--status-pending-bg);color:var(--status-pending-text)' : 'background:var(--status-sent-bg);color:var(--status-sent-text)'}">${isUnread ? 'Unread' : 'Read'}</span>
      </td>
      <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle">${e(dateStr)}</td>
      <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle" style="width:1px">
        <div class="flex items-center gap-1.5">
          ${markReadBtn}
          <button class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-status-failed border border-status-failed text-white text-[11px] font-medium cursor-pointer hover:opacity-90" hx-delete="/notifications/${e(notification.id)}" hx-target="closest tr" hx-swap="outerHTML" hx-confirm="Delete this notification?">Delete</button>
        </div>
      </td>
    </tr>
  `.trim()
}

/**
 * Partial metrics fragment for HTMX polling refresh.
 */
export function createMetricsFragmentHtml(
  metrics: NotificationMetrics,
  options?: DashboardOptions
): string {
  const filterQuery = options?.filterQuery ?? ''
  const { inbox, deliveries } = metrics

  // -- Data prep
  const channels = Object.keys(deliveries.byChannelAndStatus).sort()
  const types = Object.keys(deliveries.byType).sort()

  const statusOrder: Array<keyof typeof deliveries.byStatus> = [
    'sent',
    'failed',
    'pending',
    'skipped',
  ]

  const maxTypeVal = Math.max(1, ...types.map((t) => deliveries.byType[t] ?? 0))

  const channelTotals = channels.map((ch) => ({
    name: ch,
    total: deliveries.byChannel[ch] ?? 0,
  }))

  const e = escapeHtml

  // Metric card
  const card = (label: string, value: string, alert?: boolean) => `
    <div class="border ${alert ? 'border-status-failed-bg dark:border-status-failed-bg-dark bg-status-failed-bg dark:bg-status-failed-bg-dark' : 'border-black/[0.06] dark:border-white/[0.06] bg-sand-50 dark:bg-sand-900'} rounded-md p-2.5">
      <div class="text-lg font-semibold leading-tight tracking-tight text-sand-900 dark:text-sand-150">${value}</div>
      <div class="text-[11px] text-sand-500 dark:text-sand-550 uppercase tracking-wider mt-0.5">${label}</div>
    </div>
  `

  // Table header
  const tableHead = (headers: string[]) => `
    <thead><tr>
      ${headers.map((h) => `<th class="text-left px-3.5 py-2 text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider bg-sand-50 dark:bg-sand-900 border-b border-black/[0.06] dark:border-white/[0.06] whitespace-nowrap cursor-pointer select-none sortable">${e(h)}</th>`).join('')}
    </tr></thead>
  `

  // Channel x status rows
  const deliveryRows = channels
    .map((ch) => {
      const totals = deliveries.byChannelAndStatus[ch]
      const total = Object.values(totals).reduce((a, b) => (a as number) + (b as number), 0)
      return `
        <tr class="hover:bg-sand-50 dark:hover:bg-sand-900">
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle whitespace-nowrap">
            <span class="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-sand-100 dark:bg-sand-800 text-sand-600 dark:text-sand-400">${e(ch)}</span>
          </td>
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(total as number)}</td>
          ${statusOrder.map((s) => `<td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(totals[s] ?? 0)}</td>`).join('')}
        </tr>
      `
    })
    .join('')

  // Type rows
  const typeRows = types
    .map((t) => {
      const val = deliveries.byType[t] ?? 0
      const pct = Math.round((val / maxTypeVal) * 100)
      return `
        <tr class="hover:bg-sand-50 dark:hover:bg-sand-900">
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle">
            <code class="font-mono text-xs px-1 py-0.5 rounded bg-sand-100 dark:bg-sand-800 text-sand-700 dark:text-sand-400">${e(t)}</code>
          </td>
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(val)}</td>
          <td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle" style="width:50%">
            <div class="w-full h-1.5 bg-sand-100 dark:bg-sand-800 rounded-full overflow-hidden">
              <div class="h-full bg-dust rounded-full bar-fill" style="width:${pct}%"></div>
            </div>
          </td>
        </tr>
      `
    })
    .join('')

  // Inbox section
  const inboxSection = inbox
    ? `
    <section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="inbox-heading">
      <div class="flex items-center justify-between px-4 pt-3.5">
        <h2 id="inbox-heading" class="text-sm font-semibold m-0">Inbox Metrics</h2>
      </div>
      <div class="grid grid-cols-2 gap-2 p-4">
        ${card('Total', formatNum(inbox.total))}
        ${card('Unread', formatNum(inbox.unread))}
        ${card('Read', formatNum(inbox.read))}
        ${card('Unseen', formatNum(inbox.unseen))}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-[13px]">
          ${tableHead(['Type', 'Count'])}
          <tbody>
            ${Object.entries(inbox.byType)
              .map(
                ([type, count]) =>
                  `<tr class="hover:bg-sand-50 dark:hover:bg-sand-900"><td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle"><code class="font-mono text-xs px-1 py-0.5 rounded bg-sand-100 dark:bg-sand-800 text-sand-700 dark:text-sand-400">${e(type)}</code></td><td class="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] align-middle text-right tabular-nums">${formatNum(count)}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
    `
    : ''

  // Status bar chart (SVG)
  const statusBarSvg = (() => {
    const statusList = statusOrder
    const maxVal = Math.max(1, ...statusList.map((s) => deliveries.byStatus[s] ?? 0))
    const barHeight = 22
    const barWidth = 160
    const gap = 6
    const totalHeight = statusList.length * (barHeight + gap) + gap
    return `
      <svg viewBox="0 0 ${barWidth + 60} ${totalHeight}" class="status-chart w-[240px] h-auto" aria-labelledby="status-title" role="img">
        <title id="status-title">Status breakdown</title>
        <g transform="translate(40,${gap})">
          ${statusList
            .map((s, i) => {
              const val = deliveries.byStatus[s] ?? 0
              const pct = (val / maxVal) * barWidth
              return `
                <g transform="translate(0, ${i * (barHeight + gap)})" class="status-rect status-${s}">
                  <rect x="0" y="0" width="${pct}" height="${barHeight}" rx="3" />
                  <text x="-6" y="${barHeight / 2 + 4}" text-anchor="end" class="chart-label">${e(s[0].toUpperCase() + s.slice(1))}</text>
                  <text x="${pct + 5}" y="${barHeight / 2 + 4}" class="chart-label">${formatNum(val)}</text>
                </g>
              `
            })
            .join('')}
        </g>
      </svg>
    `
  })()

  // Channel donut (SVG)
  const channelDonutSvg = (() => {
    if (channels.length === 0) return ''
    const total = channelTotals.reduce((sum, ch) => sum + ch.total, 0)
    if (total === 0) return ''
    const radius = 50
    const circumference = 2 * Math.PI * radius
    let cumulative = 0
    const colors = [
      'var(--donut-0)',
      'var(--donut-1)',
      'var(--donut-2)',
      'var(--donut-3)',
      'var(--donut-4)',
      'var(--donut-5)',
    ]
    const segments = channelTotals.map((ch, i) => {
      const frac = ch.total / total
      const dash = frac * circumference
      const offset = -cumulative
      cumulative += dash
      return `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${colors[i % colors.length]}"
        stroke-width="18" stroke-dasharray="${dash} ${circumference - dash}"
        stroke-dashoffset="${offset}" style="transform:rotate(-90deg);transform-origin:60px 60px"/>`
    })
    return `
      <svg viewBox="0 0 120 120" class="w-[120px] h-auto" aria-labelledby="channel-title" role="img">
        <title id="channel-title">Channel distribution</title>
        ${segments.join('')}
        <text x="60" y="60" text-anchor="middle" dominant-baseline="central" class="donut-center">${total}</text>
      </svg>
    `
  })()

  // Filter param extraction helper for the form
  const currentQuery = (() => {
    const params = new URLSearchParams(filterQuery)
    return {
      channel: params.get('channel') ?? '',
      notificationType: params.get('notificationType') ?? '',
      status: params.get('status') ?? '',
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
    }
  })()

  return `
<section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" id="metrics-panel" aria-labelledby="overview-heading" hx-get="/" hx-trigger="every 30s" hx-target="#metrics-panel" hx-swap="innerHTML">
  <form class="filter-form flex flex-wrap items-end gap-2.5 px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06]" id="filterForm" method="get" action="" hx-get="/" hx-target="#main" hx-push-url="true">
    <div class="flex flex-col gap-0.5">
      <label for="f-channel" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">Channel</label>
      <select id="f-channel" name="channel" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
        <option value="">All</option>
        ${channels.map((ch) => `<option value="${e(ch)}"${currentQuery.channel === ch ? ' selected' : ''}>${e(ch)}</option>`).join('')}
      </select>
    </div>
    <div class="flex flex-col gap-0.5">
      <label for="f-type" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">Type</label>
      <select id="f-type" name="notificationType" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
        <option value="">All</option>
        ${types.map((t) => `<option value="${e(t)}"${currentQuery.notificationType === t ? ' selected' : ''}>${e(t)}</option>`).join('')}
      </select>
    </div>
    <div class="flex flex-col gap-0.5">
      <label for="f-status" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">Status</label>
      <select id="f-status" name="status" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
        <option value="">All</option>
        ${['sent', 'failed', 'pending', 'skipped'].map((s) => `<option value="${s}"${currentQuery.status === s ? ' selected' : ''}>${e(s[0].toUpperCase() + s.slice(1))}</option>`).join('')}
      </select>
    </div>
    <div class="flex flex-col gap-0.5">
      <label for="f-from" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">From</label>
      <input type="date" id="f-from" name="from" value="${e(currentQuery.from)}" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
    </div>
    <div class="flex flex-col gap-0.5">
      <label for="f-to" class="text-[11px] font-semibold text-sand-500 dark:text-sand-550 uppercase tracking-wider">To</label>
      <input type="date" id="f-to" name="to" value="${e(currentQuery.to)}" class="px-2 py-1 border border-black/[0.12] dark:border-white/[0.12] rounded-md bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-150 text-[13px] min-w-[120px] focus:outline-none focus:ring-2 focus:ring-dust">
    </div>
    <div class="flex flex-col gap-0.5">
      <button type="submit" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-dust border border-dust text-white text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-dust-hover">Apply</button>
      <button type="button" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-white dark:bg-sand-900 text-sand-600 dark:text-sand-400 text-xs font-medium cursor-pointer transition-colors duration-150 ease-out hover:bg-sand-50 dark:hover:bg-sand-800" id="clearFilters">Clear</button>
    </div>
  </form>

  <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-4">
    ${card('Total Deliveries', String(deliveries.total))}
    ${card('Sent', String(deliveries.byStatus.sent ?? 0))}
    ${card('Failed', String(deliveries.byStatus.failed ?? 0), true)}
    ${card('Pending', String(deliveries.byStatus.pending ?? 0))}
    ${card('Skipped', String(deliveries.byStatus.skipped ?? 0))}
    ${card('Failure Rate', formatPct(deliveries.failureRate), deliveries.failureRate > 0.05)}
    ${card('Avg Attempts', formatNum(deliveries.averageAttempts))}
  </div>

  <div class="flex items-center gap-5 px-4 py-3.5 flex-wrap">
    <div class="flex flex-col items-center gap-1.5">
      <span class="text-[11px] text-sand-500 dark:text-sand-550 uppercase tracking-wider">Status Breakdown</span>
      ${statusBarSvg}
    </div>
    <div class="flex flex-col items-center gap-1.5">
      <span class="text-[11px] text-sand-500 dark:text-sand-550 uppercase tracking-wider">Channels</span>
      ${channelDonutSvg}
    </div>
    ${
      channelTotals.length > 0
        ? `
    <div class="flex flex-wrap gap-x-3.5 gap-y-2">
      ${channelTotals
        .map((ch, i) => {
          const colors = ['#5a7d9a', '#7a9aaf', '#9ab5c4', '#4a6b5a', '#8a7d6a', '#9a8a7a']
          return `<span class="inline-flex items-center gap-1 text-xs text-sand-600 dark:text-sand-400"><span class="w-2 h-2 rounded-sm" style="background:${colors[i % colors.length]}"></span>${e(ch.name)}</span>`
        })
        .join('')}
    </div>
    `
        : ''
    }
  </div>
</section>

${
  channels.length > 0
    ? `
<section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="channel-heading">
  <div class="flex items-center justify-between px-4 pt-3.5">
    <h2 id="channel-heading" class="text-sm font-semibold m-0">Deliveries by Channel</h2>
    <span class="inline-flex items-center gap-1 text-[11px] text-sand-500 dark:text-sand-550">
      <span class="w-1.5 h-1.5 rounded-full bg-status-sent-dark animate-[pulse_2s_ease-in-out_infinite]" aria-hidden="true"></span>
      <span id="refreshLabel">Refreshing in 30s</span>
    </span>
  </div>
  <div class="overflow-x-auto">
    <table class="data-table w-full border-collapse text-[13px]" id="channelTable">
      <caption class="text-left px-4 py-2 text-xs text-sand-500 dark:text-sand-550 border-b border-black/[0.06] dark:border-white/[0.06] caption-side-top">Delivery counts grouped by channel and current status</caption>
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
<section class="bg-white dark:bg-sand-900 border border-black/[0.06] dark:border-white/[0.06] rounded-md mb-5 overflow-hidden" aria-labelledby="type-heading">
  <div class="flex items-center justify-between px-4 pt-3.5">
    <h2 id="type-heading" class="text-sm font-semibold m-0">By Notification Type</h2>
  </div>
  <div class="overflow-x-auto">
    <table class="data-table w-full border-collapse text-[13px]" id="typeTable">
      <caption class="text-left px-4 py-2 text-xs text-sand-500 dark:text-sand-550 border-b border-black/[0.06] dark:border-white/[0.06] caption-side-top">Counts per notification type with proportional bar</caption>
      ${tableHead(['Type', 'Count', 'Distribution'])}
      <tbody>${typeRows}</tbody>
    </table>
  </div>
</section>
`
    : ''
}

${inboxSection}
  `.trim()
}
