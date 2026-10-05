import { useState } from 'react'
import { useLoad, Status } from './useLoad.jsx'
import { loadHabits, loadLogs, isDone, toggleHabit, addHabit, deleteHabit, streak } from './habitStorage.js'

const fetchAll = async () => {
  const [habits, logs] = await Promise.all([loadHabits(), loadLogs()])
  return { habits, logs }
}

export default function Habits() {
  const { data, error, loading, reload } = useLoad(fetchAll)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading || error) return <><h1>Habit Tracker</h1><Status loading={loading} error={error} /></>
  const { habits, logs } = data
  const done = habits.filter((h) => isDone(logs, h.id)).length

  async function run(fn) {
    setBusy(true)
    setFormError('')
    try { await fn() } catch (e) { setFormError(e.message) }
    reload()
    setBusy(false)
  }

  async function add(e) {
    e.preventDefault()
    setBusy(true)
    const err = await addHabit(name).catch((x) => x.message)
    setFormError(err || '')
    if (!err) setName('')
    reload()
    setBusy(false)
  }

  return (
    <>
      <h1>Habit Tracker</h1>
      <p className="muted">Tick the habits you completed today.</p>
      <div className="card">
        <h3>Today: {done} / {habits.length} done</h3>
        <div className="bar"><span style={{ width: `${habits.length ? (done / habits.length) * 100 : 0}%` }} /></div>
        {habits.length === 0 && <p className="muted" style={{ marginTop: 14 }}>No habits yet. Add your first one below.</p>}
        {habits.map((h) => (
          <div className="row habit" key={h.id}>
            <label className="tick">
              <input type="checkbox" checked={isDone(logs, h.id)} disabled={busy} onChange={() => run(() => toggleHabit(h.id, isDone(logs, h.id)))} />
              <span>{h.name}</span>
            </label>
            <span className="muted">🔥 {streak(logs, h.id)} day streak</span>
            <button className="link danger" aria-label={`Delete ${h.name}`} disabled={busy} onClick={() => run(() => deleteHabit(h.id))}>Delete</button>
          </div>
        ))}
      </div>
      <form className="card" onSubmit={add}>
        <h3>Add a habit</h3>
        <div className="inputrow">
          <input id="habit-name" className="wide" placeholder="e.g. Read 10 pages" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="primary" disabled={busy}>Add</button>
        </div>
        {formError && <p className="error">{formError}</p>}
      </form>
    </>
  )
}
