import { useCallback, useEffect, useState } from 'react'

// โหลดข้อมูล async: คืน { data, error, loading, reload }
export function useLoad(fn) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    let alive = true
    fn().then(
      (data) => alive && setState({ data, error: '', loading: false }),
      (e) => alive && setState({ data: null, error: e.message || 'Something went wrong', loading: false }),
    )
    return () => { alive = false }
  }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setN((x) => x + 1), [])
  return { ...state, reload }
}

export function Status({ loading, error }) {
  if (loading) return <p className="muted">Loading…</p>
  if (error) return <div className="card errbox" role="alert">⚠️ Could not reach the database: {error}</div>
  return null
}
