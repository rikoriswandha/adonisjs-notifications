import type { NotificationMetrics } from '../../contracts/metrics.ts'

export function createDashboardHtml(
  metrics: NotificationMetrics,
  options?: { title?: string; basePath?: string }
): string {
  const title = options?.title ?? 'Notification Metrics'
  const basePath = options?.basePath ?? ''
  const { inbox, deliveries, computedAt } = metrics

  const statusOrder = ['sent', 'failed', 'pending', 'skipped'] as const
  const statusClass: Record<string, string> = {
    sent: 'text-emerald-500',
    failed: 'text-red-500',
    pending: 'text-amber-500',
    skipped: 'text-gray-500',
  }

  const channels = Object.keys(deliveries.byChannelAndStatus).sort()
  const types = Object.keys(deliveries.byType).sort()

  const formatNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`

  const card = (label: string, value: string, colorClass?: string) => `
    <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <div class="text-2xl font-bold ${colorClass || 'text-gray-900'}">${value}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wider mt-1">${label}</div>
    </div>
  `

  const tableHead = (headers: string[]) => `
    <thead>
      <tr class="bg-gray-50">
        ${headers.map((h) => `<th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">${h}</th>`).join('')}
      </tr>
    </thead>
  `

  const deliveryRows = channels
    .map((ch) => {
      const st = deliveries.byChannelAndStatus[ch]!
      const total = statusOrder.reduce((sum, s) => sum + (st[s] ?? 0), 0)
      return `<tr class="border-b border-gray-100 last:border-b-0">
        <td class="px-3 py-2.5 text-sm font-medium text-gray-900">${escapeHtml(ch)}</td>
        <td class="px-3 py-2.5 text-sm text-gray-700">${total}</td>
        <td class="px-3 py-2.5 text-sm font-medium ${statusClass.sent}">${st.sent ?? 0}</td>
        <td class="px-3 py-2.5 text-sm font-medium ${statusClass.failed}">${st.failed ?? 0}</td>
        <td class="px-3 py-2.5 text-sm font-medium ${statusClass.pending}">${st.pending ?? 0}</td>
        <td class="px-3 py-2.5 text-sm font-medium ${statusClass.skipped}">${st.skipped ?? 0}</td>
      </tr>`
    })
    .join('')

  const typeRows = types
    .map((t) => `<tr class="border-b border-gray-100 last:border-b-0"><td class="px-3 py-2.5 text-sm text-gray-900">${escapeHtml(t)}</td><td class="px-3 py-2.5 text-sm text-gray-700">${deliveries.byType[t]}</td></tr>`)
    .join('')

  const inboxSection = inbox
    ? `
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-3">Inbox Metrics</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        ${card('Total', String(inbox.total))}
        ${card('Unread', String(inbox.unread), 'text-red-500')}
        ${card('Read', String(inbox.read), 'text-emerald-500')}
        ${card('Unseen', String(inbox.unseen), 'text-amber-500')}
      </div>
      ${
        Object.keys(inbox.byType).length > 0
          ? `
      <div class="overflow-hidden border border-gray-200 rounded-lg">
        <table class="w-full border-collapse bg-white">
          ${tableHead(['Type', 'Count'])}
          <tbody>
            ${Object.entries(inbox.byType)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([t, c]) => `<tr class="border-b border-gray-100 last:border-b-0"><td class="px-3 py-2.5 text-sm text-gray-900">${escapeHtml(t)}</td><td class="px-3 py-2.5 text-sm text-gray-700">${c}</td></tr>`)
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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 text-gray-900 font-sans leading-relaxed">
  <div class="max-w-5xl mx-auto p-6">
    <header class="mb-6">
      ${basePath ? `<div class="mb-2"><a href="${escapeHtml(basePath)}" class="text-blue-600 hover:underline text-sm">Dashboard</a></div>` : ''}
      <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(title)}</h1>
      <time datetime="${computedAt}" class="text-sm text-gray-500">Computed at ${new Date(computedAt).toLocaleString()}</time>
    </header>

    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-3">Delivery Overview</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        ${card('Total Deliveries', String(deliveries.total))}
        ${card('Sent', String(deliveries.byStatus.sent), statusClass.sent)}
        ${card('Failed', String(deliveries.byStatus.failed), statusClass.failed)}
        ${card('Pending', String(deliveries.byStatus.pending), statusClass.pending)}
        ${card('Skipped', String(deliveries.byStatus.skipped), statusClass.skipped)}
        ${card('Failure Rate', formatPct(deliveries.failureRate), statusClass.failed)}
        ${card('Avg Attempts', formatNum(deliveries.averageAttempts))}
      </div>
    </section>

    ${
      channels.length > 0
        ? `
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-3">By Channel & Status</h2>
      <div class="overflow-hidden border border-gray-200 rounded-lg">
        <table class="w-full border-collapse bg-white">
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
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-3">By Notification Type</h2>
      <div class="overflow-hidden border border-gray-200 rounded-lg">
        <table class="w-full border-collapse bg-white">
          ${tableHead(['Type', 'Count'])}
          <tbody>${typeRows}</tbody>
        </table>
      </div>
    </section>
    `
        : ''
    }

    ${inboxSection}
  </div>
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
