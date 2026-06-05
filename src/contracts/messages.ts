export interface MailMessageOptions {
  subject?: string
  greeting?: string
  salutation?: string
  introLines?: string[]
  outroLines?: string[]
  actionText?: string
  actionUrl?: string
  view?: string
  viewData?: Record<string, unknown>
  html?: string
  text?: string
  from?: { address: string; name?: string }
  replyTo?: { address: string; name?: string }
  cc?: string[]
  bcc?: string[]
  mailer?: string
  priority?: 'high' | 'normal' | 'low'
  tags?: string[]
}

export interface DatabaseMessageData {
  [key: string]: unknown
}

export type NotificationChannelMessage = MailMessageOptions | DatabaseMessageData | unknown
