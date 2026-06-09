# Example: Invoice Paid Notification

A notification sent to both mail and database channels when an invoice is paid.

## Notification class

```ts
// app/notifications/invoice_paid.ts
import { Notification, MailMessage } from '@rikology/adonisjs-notifications'

export default class InvoicePaid extends Notification {
  constructor(
    private invoice: { id: number; amount: number; customerName: string }
  ) {
    super()
  }

  via(notifiable: unknown) {
    return ['mail', 'database']
  }

  toMail(notifiable: unknown) {
    return MailMessage.create()
      .subject(`Invoice #${this.invoice.id} Paid`)
      .greeting(`Hi ${this.invoice.customerName},`)
      .line(`We have received payment for invoice #${this.invoice.id}.`)
      .line(`Amount: $${this.invoice.amount.toFixed(2)}`)
      .action('Download Receipt', `https://app.example.com/invoices/${this.invoice.id}/receipt`)
      .salutation('Thank you for your business')
  }

  toDatabase(notifiable: unknown) {
    return {
      title: 'Invoice Paid',
      body: `Invoice #${this.invoice.id} for $${this.invoice.amount} has been paid.`,
      invoiceId: this.invoice.id,
      amount: this.invoice.amount,
      actionUrl: `/invoices/${this.invoice.id}/receipt`,
    }
  }
}
```

## Sending from a controller

```ts
// app/controllers/invoices_controller.ts
import notifications from '@rikology/adonisjs-notifications/services/main'
import InvoicePaid from '#notifications/invoice_paid'

export default class InvoicesController {
  async markAsPaid({ params, auth }: HttpContext) {
    const invoice = await Invoice.findOrFail(params.id)
    invoice.status = 'paid'
    await invoice.save()

    const user = await auth.getUserOrFail()
    await notifications.send(user, new InvoicePaid(invoice))

    return { message: 'Invoice marked as paid and notification sent' }
  }
}
```

## Sending from a service

```ts
// app/services/invoice_service.ts
import notifications from '@rikology/adonisjs-notifications/services/main'
import InvoicePaid from '#notifications/invoice_paid'

export class InvoiceService {
  async processPayment(invoice: Invoice, user: User) {
    // Process payment...
    await notifications.send(user, new InvoicePaid(invoice))
  }
}
```
