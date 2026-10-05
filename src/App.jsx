import { useState } from 'react'
import { user, weekSleep } from './mockData.js'
import Habits from './Habits.jsx'
import Analysis from './Analysis.jsx'
import { loadHabits, loadLogs, isDone } from './habitStorage.js'
import { useLoad, Status } from './useLoad.jsx'
import { configured } from './supabaseClient.js'
import CheckIn from './CheckIn.jsx'
import Chat from './Chat.jsx'
import { getTodayCheckin } from './storage.js'

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'checkin', label: 'Daily Check-in', icon: '📝' },
  { id: 'habits', label: 'Habit Tracker', icon: '✅' },
  { id: 'analysis', label: 'AI Analysis', icon: '📊' },
  { id: 'chat', label: 'AI Chat', icon: '💬' },
]

const label = { good: 'Good', normal: 'Normal', bad: 'Bad' }

const fetchHabits = async () => {
  const [habits, logs] = await Promise.all([loadHabits(), loadLogs()])
  return { habits, logs }
}

function TodayHabits({ goHabits }) {
  const { data, error, loading } = useLoad(fetchHabits)
  if (loading || error) return <Status loading={loading} error={error} />
  const { habits, logs } = data
  const done = habits.filter((h) => isDone(logs, h.id)).length
  return (
    <div className="card">
      <h3>Today's Habits ({done} / {habits.length})</h3>
      {habits.length === 0 && <p className="muted">No habits yet.</p>}
      {habits.map((h) => (
        <div className="row" key={h.id}><span>{h.name}</span><b>{isDone(logs, h.id) ? '✅ Done' : '⬜ Not yet'}</b></div>
      ))}
      <button className="link" onClick={goHabits}>Open Habit Tracker</button>
    </div>
  )
}

function Dashboard({ goCheckin, goHabits }) {
  const { data: c, error, loading } = useLoad(getTodayCheckin)
  if (loading || error) return <><h1>สวัสดี {user.name} 👋</h1><Status loading={loading} error={error} /></>
  const cards = c && [
    { icon: '🌙', label: 'Sleep', value: `${c.sleepHours} / 8 hr`, pct: c.sleepHours / 8 },
    { icon: '💧', label: 'Water', value: `${c.waterGlasses} / 8 glasses`, pct: c.waterGlasses / 8 },
    { icon: '🏃', label: 'Exercise', value: `${c.exerciseMinutes} / 30 min`, pct: c.exerciseMinutes / 30 },
    { icon: '😊', label: 'Mood', value: label[c.mood] },
    { icon: '🥗', label: 'Food', value: label[c.foodQuality] },
  ]
  return (
    <>
      <h1>สวัสดี {user.name} 👋</h1>
      <p className="muted">Today's Health</p>
      {!c ? (
        <div className="card center">
          <p>You haven't completed today's check-in yet.</p>
          <button className="primary" onClick={goCheckin}>Complete Check-in</button>
        </div>
      ) : (
        <div className="grid">
          {cards.map((t) => (
            <div className="card" key={t.label}>
              <div className="icon">{t.icon}</div>
              <div className="muted">{t.label}</div>
              <div className="big">{t.value}</div>
              {t.pct !== undefined && <div className="bar"><span style={{ width: `${Math.min(100, t.pct * 100)}%` }} /></div>}
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <h3>การนอน 7 วันล่าสุด</h3>
        <div className="chart">
          {weekSleep.map((d) => (
            <div key={d.day} className="col">
              <div className="stick" style={{ height: `${d.hours * 14}px` }} />
              <small>{d.day}</small>
            </div>
          ))}
        </div>
      </div>
      <TodayHabits goHabits={goHabits} />
    </>
  )
}

function Placeholder({ title, phase }) {
  return (
    <div className="card center">
      <h1>{title}</h1>
      <p className="muted">หน้านี้จะสร้างใน {phase}</p>
    </div>
  )
}

export default function App() {
  if (!configured) {
    return (
      <main><div className="card errbox">
        <h1>Supabase is not configured</h1>
        <p>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart <code>npm run dev</code>.</p>
      </div></main>
    )
  }
  const [page, setPage] = useState('dashboard')
  const content = {
    dashboard: <Dashboard goCheckin={() => setPage('checkin')} goHabits={() => setPage('habits')} />,
    checkin: <CheckIn goDashboard={() => setPage('dashboard')} />,
    habits: <Habits />,
    analysis: <Analysis goCheckin={() => setPage('checkin')} />,
   chat: <Chat />,
  }[page]

  return (
    <div className="app">
      <nav>
        <div className="logo">🌿 HealthTrack</div>
        {pages.map((p) => (
          <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => setPage(p.id)}>
            <span>{p.icon}</span><em>{p.label}</em>
          </button>
        ))}
      </nav>
      <main>{content}</main>
    </div>
  )
}
