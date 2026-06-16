import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ThemeColors } from './styles.ts'
import { radius, spacing } from './styles.ts'

export interface SectionProps {
  title: string
  children: ReactNode
  colors: ThemeColors
  defaultOpen?: boolean
}

export function Section({ title, children, colors, defaultOpen = false }: SectionProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<string>(open ? '9999px' : '0px')

  useEffect(() => {
    if (open && contentRef.current) {
      setMaxHeight(`${contentRef.current.scrollHeight}px`)
    } else {
      setMaxHeight('0px')
    }
  }, [open, children])

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((v: boolean) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.md} ${spacing.lg}`,
          border: 'none',
          background: 'transparent',
          color: colors.text,
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span>{title}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          ▼
        </span>
      </button>
      <div
        ref={contentRef}
        style={{
          maxHeight,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>{children}</div>
      </div>
    </div>
  )
}
