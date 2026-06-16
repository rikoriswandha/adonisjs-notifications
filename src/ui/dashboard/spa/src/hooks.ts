import { useCallback, useEffect, useRef, useState } from 'react'

export function useWindowFocus(callback: () => void): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callback()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [callback])
}

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: string | undefined
  refresh: () => void
}

export function useAsync<T>(load: () => Promise<T>, deps: Array<unknown>): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const loadRef = useRef(load)
  loadRef.current = load

  const refresh = useCallback(() => {
    setLoading(true)
    setError(undefined)
    loadRef
      .current()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, deps)

  return { data, loading, error, refresh }
}

export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('dashboard-theme') : null
    if (stored) return stored === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    window.localStorage.setItem('dashboard-theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggle: () => setDark((v: boolean) => !v) }
}
