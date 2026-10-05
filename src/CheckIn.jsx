import { useState } from 'react'
import { getTodayCheckin, saveTodayCheckin } from './storage.js'
import { useLoad, Status } from './useLoad.jsx'

const options = [
  { value: 'good', label: '😊 Good' },
  { value: 'normal', label: '😐 Normal' },
  { value: 'bad', label: '😞 Bad' },
]

function Choice({ name, value, onChange }) {
  return (
    <div className="choices">
      {options.map((o) => (
        <label key={o.value} className={value === o.value ? 'choice on' : 'choice'}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  )
}

function validate(f) {
  const e = {}
  const sleep = Number(f.sleep)
  if (f.sleep.trim() === '' || Number.isNaN(sleep)) e.sleep = 'Please enter a number, e.g. 6.5'
  else if (sleep < 0 || sleep > 24) e.sleep = 'Sleep must be between 0 and 24 hours'
  for (const [k, name] of [['water', 'glasses'], ['exercise', 'minutes']]) {
    const v = f[k].trim()
    if (v === '' || !/^\d+$/.test(v)) e[k] = `Please enter a whole number of ${name} (0 or more)`
  }
  if (!f.mood) e.mood = 'Please choose your mood'
  if (!f.food) e.food = 'Please choose your food quality'
  return e
}

function CheckInForm({ saved, goDashboard }) {
  const [form, setForm] = useState({
    sleep: saved ? String(saved.sleepHours) : '',
    water: saved ? String(saved.waterGlasses) : '',
    exercise: saved ? String(saved.exerciseMinutes) : '',
    mood: saved ? saved.mood : '',
    food: saved ? saved.foodQuality : '',
  })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const set = (k) => (v) => { setForm({ ...form, [k]: v }); setDone(false) }

  async function submit(ev) {
    ev.preventDefault()
    const e = validate(form)
    setErrors(e)
    setSaveError('')
    if (Object.keys(e).length) { setDone(false); return }
    setSaving(true)
    try {
      await saveTodayCheckin({
        sleepHours: Number(form.sleep),
        waterGlasses: Number(form.water),
        exerciseMinutes: Number(form.exercise),
        mood: form.mood,
        foodQuality: form.food,
      })
      setDone(true)
    } catch (err) {
      setSaveError(err.message)
    }
    setSaving(false)
  }

  const num = (k, label, unit, step, placeholder) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <div className="inputrow">
        <input id={k} type="number" inputMode="decimal" step={step} min="0" placeholder={placeholder}
          value={form[k]} onChange={(e) => set(k)(e.target.value)} />
        <span className="muted">{unit}</span>
      </div>
      {errors[k] && <p className="error">{errors[k]}</p>}
    </div>
  )

  return (
    <>
      <h1>Daily Check-in</h1>
      <p className="muted">{saved ? "You already checked in today. You can edit it below." : "Tell us how today went."}</p>
      <form className="card" onSubmit={submit} noValidate>
        {num('sleep', 'How long did you sleep?', 'hours', '0.1', '6.5')}
        {num('water', 'How much water did you drink?', 'glasses', '1', '5')}
        {num('exercise', 'How much did you exercise?', 'minutes', '1', '20')}
        <div className="field">
          <label>Mood</label>
          <Choice name="mood" value={form.mood} onChange={set('mood')} />
          {errors.mood && <p className="error">{errors.mood}</p>}
        </div>
        <div className="field">
          <label>Food Quality</label>
          <Choice name="food" value={form.food} onChange={set('food')} />
          {errors.food && <p className="error">{errors.food}</p>}
        </div>
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : "Save Today's Check-in"}</button>
        {saveError && <p className="error" role="alert">Could not save: {saveError}</p>}
        {done && (
          <div className="success" role="status">
            ✅ Saved! Your check-in for today is up to date.
            <button type="button" className="link" onClick={goDashboard}>Back to Dashboard</button>
          </div>
        )}
      </form>
    </>
  )
}

export default function CheckIn({ goDashboard }) {
  const { data, error, loading } = useLoad(getTodayCheckin)
  if (loading || error) return <><h1>Daily Check-in</h1><Status loading={loading} error={error} /></>
  return <CheckInForm saved={data} goDashboard={goDashboard} />
}
