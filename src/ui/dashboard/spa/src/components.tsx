import type { JSX, ReactNode } from 'react'
import { motion, radius, spacing, typography } from './styles'
interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
  title?: string
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  type = 'button',
  title,
}: ButtonProps): JSX.Element {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radius.md,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.heading,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `background-color ${motion.duration.base} ${motion.easing}, border-color ${motion.duration.base} ${motion.easing}, color ${motion.duration.base} ${motion.easing}, box-shadow ${motion.duration.base} ${motion.easing}`,
  }

  const variants: Record<'primary' | 'secondary' | 'ghost', React.CSSProperties> = {
    primary: {
      border: 'none',
      backgroundColor: disabled ? 'var(--color-surface-2)' : 'var(--color-accent)',
      color: disabled ? 'var(--color-muted)' : 'var(--color-accent-contrast)',
    },
    secondary: {
      border: `1px solid ${disabled ? 'var(--color-border-subtle)' : 'var(--color-border)'}`,
      backgroundColor: disabled ? 'var(--color-surface-2)' : 'var(--color-surface)',
      color: disabled ? 'var(--color-muted)' : 'var(--color-text)',
    },
    ghost: {
      border: '1px solid transparent',
      backgroundColor: 'transparent',
      color: disabled ? 'var(--color-muted)' : 'var(--color-muted)',
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => {
        if (disabled) return
        const target = e.currentTarget
        if (variant === 'primary') target.style.backgroundColor = 'color-mix(in oklch, var(--color-accent) 85%, black)'
        else if (variant === 'secondary') target.style.backgroundColor = 'var(--color-surface-2)'
        else target.style.backgroundColor = 'var(--color-surface-2)'
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        const target = e.currentTarget
        if (variant === 'primary') target.style.backgroundColor = 'var(--color-accent)'
        else if (variant === 'secondary') target.style.backgroundColor = 'var(--color-surface)'
        else target.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

interface IconButtonProps {
  children: ReactNode
  onClick?: () => void
  label: string
  variant?: 'ghost' | 'danger'
  disabled?: boolean
}

export function IconButton({
  children,
  onClick,
  label,
  variant = 'ghost',
  disabled = false,
}: IconButtonProps): JSX.Element {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: radius.md,
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: variant === 'danger' ? 'var(--color-danger)' : 'var(--color-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: `background-color ${motion.duration.base} ${motion.easing}, color ${motion.duration.base} ${motion.easing}, box-shadow ${motion.duration.base} ${motion.easing}`,
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={base}
      onMouseEnter={(e) => {
        if (disabled) return
        e.currentTarget.style.backgroundColor = variant === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-surface-2)'
        e.currentTarget.style.color = variant === 'danger' ? 'var(--color-danger)' : 'var(--color-text)'
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = variant === 'danger' ? 'var(--color-danger)' : 'var(--color-muted)'
      }}
    >
      {children}
    </button>
  )
}

interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}

export function Input({ value, onChange, placeholder, type = 'text' }: InputProps): JSX.Element {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: `${spacing.sm} ${spacing.md}`,
        border: '1px solid var(--color-border)',
        borderRadius: radius.md,
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
        fontSize: typography.size.sm,
        minWidth: '140px',
        transition: `border-color ${motion.duration.base} ${motion.easing}, box-shadow ${motion.duration.base} ${motion.easing}`,
      }}
    />
  )
}

interface BadgeProps {
  children: ReactNode
  color?: string
  icon?: ReactNode
}

export function Badge({ children, color = 'var(--color-muted)', icon }: BadgeProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        border: `1px solid ${color}`,
        borderRadius: radius.sm,
        color,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        lineHeight: typography.lineHeight.heading,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'sent' | 'failed' | 'pending' | 'skipped'
  children: ReactNode
}

export function StatusBadge({ status, children }: StatusBadgeProps): JSX.Element {
  const colors: Record<StatusBadgeProps['status'], string> = {
    sent: 'var(--color-success)',
    failed: 'var(--color-danger)',
    pending: 'var(--color-warning)',
    skipped: 'var(--color-info)',
  }
  return (
    <Badge color={colors[status]}>
      {children}
    </Badge>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        flexWrap: 'wrap',
        marginBottom: spacing.xl,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: typography.size.xl,
            fontWeight: typography.weight.semibold,
            lineHeight: typography.lineHeight.heading,
            color: 'var(--color-text)',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: `${spacing.xs} 0 0`, color: 'var(--color-muted)', fontSize: typography.size.sm }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: spacing.sm }}>{actions}</div>}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.xl,
        borderRadius: radius.md,
        border: '1px dashed var(--color-border)',
        color: 'var(--color-muted)',
      }}
    >
      {icon && <div style={{ color: 'var(--color-muted)' }}>{icon}</div>}
      <div>
        <p style={{ margin: 0, fontWeight: typography.weight.medium, color: 'var(--color-text)' }}>{title}</p>
        {description && (
          <p style={{ margin: `${spacing.xs} 0 0`, fontSize: typography.size.sm, maxWidth: '60ch' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

interface TableProps {
  children: ReactNode
}

export function Table({ children }: TableProps): JSX.Element {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.size.sm }}>
        {children}
      </table>
    </div>
  )
}

interface TableHeadProps {
  children: ReactNode
}

export function TableHead({ children }: TableHeadProps): JSX.Element {
  return (
    <thead>
      <tr>
        {children}
      </tr>
    </thead>
  )
}

interface TableHeaderProps {
  children: ReactNode
  align?: 'left' | 'right'
}

export function TableHeader({ children, align = 'left' }: TableHeaderProps): JSX.Element {
  return (
    <th
      style={{
        padding: `${spacing.sm} ${spacing.md}`,
        textAlign: align,
        fontWeight: typography.weight.medium,
        color: 'var(--color-muted)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      {children}
    </th>
  )
}

interface TableBodyProps {
  children: ReactNode
}

export function TableBody({ children }: TableBodyProps): JSX.Element {
  return <tbody>{children}</tbody>
}

interface TableRowProps {
  children: ReactNode
}

export function TableRow({ children }: TableRowProps): JSX.Element {
  return (
    <tr
      style={{
        transition: `background-color ${motion.duration.fast} ${motion.easing}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: ReactNode
  align?: 'left' | 'right'
}

export function TableCell({ children, align = 'left' }: TableCellProps): JSX.Element {
  return (
    <td
      style={{
        padding: `${spacing.sm} ${spacing.md}`,
        textAlign: align,
        color: 'var(--color-text)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      {children}
    </td>
  )
}

interface ProgressBarProps {
  segments: Array<{ value: number; color: string }>
  total: number
}

export function ProgressBar({ segments, total }: ProgressBarProps): JSX.Element {
  if (total <= 0) {
    return (
      <div
        style={{
          height: '8px',
          borderRadius: radius.sm,
          backgroundColor: 'var(--color-surface-2)',
          overflow: 'hidden',
        }}
      />
    )
  }

  let running = 0
  return (
    <div
      style={{
        height: '8px',
        borderRadius: radius.sm,
        backgroundColor: 'var(--color-surface-2)',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {segments.map((segment, idx) => {
        const width = `${(segment.value / total) * 100}%`
        running += segment.value
        return (
          <div
            key={idx}
            style={{
              width,
              height: '100%',
              backgroundColor: segment.color,
            }}
            title={`${segment.value}`}
          />
        )
      })}
    </div>
  )
}
