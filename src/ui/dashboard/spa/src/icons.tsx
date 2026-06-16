import type { JSX, ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

function Icon({
  size = 16,
  className,
  children,
}: {
  size?: number
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function ActivityIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Icon>
  )
}

export function InboxIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Icon>
  )
}

export function SentIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Icon>
  )
}

export function FailedIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </Icon>
  )
}

export function PendingIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Icon>
  )
}

export function SkippedIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </Icon>
  )
}

export function ChannelIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </Icon>
  )
}

export function TypeIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </Icon>
  )
}

export function ChevronDownIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  )
}

export function SunIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Icon>
  )
}

export function MoonIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  )
}

export function CheckIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  )
}

export function ArrowLeftIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </Icon>
  )
}

export function TrashIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Icon>
  )
}

export function EnvelopeOpenIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M22 8l-10 6L2 8" />
      <path d="M2 8v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8" />
      <path d="M12 14l-10-6 2-2h16l2 2-10 6" />
    </Icon>
  )
}

export function EnvelopeClosedIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 8l-10 6L2 8" />
    </Icon>
  )
}

export function ExternalLinkIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </Icon>
  )
}

export function FilterIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </Icon>
  )
}

export function MoreHorizontalIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </Icon>
  )
}

export function RefreshIcon({ size, className }: IconProps = {}): JSX.Element {
  return (
    <Icon size={size} className={className}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </Icon>
  )
}
