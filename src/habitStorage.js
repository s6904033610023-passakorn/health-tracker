// Habit Tracker บน Supabase (ตาราง habits, habit_logs)
import { supabase, getUserId, check } from './supabaseClient.js'
import { getToday } from './storage.js'

// habit เริ่มต้น 3 อันถูกสร้างโดย trigger ใน database ตอนมีผู้ใช้ใหม่
export async function loadHabits() {
  await getUserId()
  const { data, error } = await supabase.from('habits').select('id,name').order('created_at')
  check(error)
  return data
}

// คืนรูปแบบเดิม { "YYYY-MM-DD": [habitId, ...] } เพื่อให้โค้ดส่วนอื่นใช้ต่อได้
export async function loadLogs() {
  await getUserId()
  const { data, error } = await supabase.from('habit_logs').select('habit_id,log_date')
  check(error)
  const logs = {}
  for (const r of data) (logs[r.log_date] ||= []).push(r.habit_id)
  return logs
}

export function isDone(logs, id, date = getToday()) {
  return (logs[date] || []).includes(id)
}

export async function toggleHabit(id, done, date = getToday()) {
  const user_id = await getUserId()
  if (done) {
    const { error } = await supabase.from('habit_logs').delete().eq('habit_id', id).eq('log_date', date)
    check(error)
  } else {
    const { error } = await supabase.from('habit_logs').upsert(
      { user_id, habit_id: id, log_date: date },
      { onConflict: 'habit_id,log_date' },
    )
    check(error)
  }
}

// คืน error message ถ้าเพิ่มไม่ได้ ไม่งั้นคืน null
export async function addHabit(rawName) {
  const name = rawName.trim()
  if (!name) return 'Please enter a habit name'
  if (name.length > 40) return 'Habit name is too long (max 40 characters)'
  const user_id = await getUserId()
  const { error } = await supabase.from('habits').insert({ user_id, name })
  if (error) return error.code === '23505' ? 'You already have this habit' : error.message
  return null
}

export async function deleteHabit(id) {
  await getUserId()
  const { error } = await supabase.from('habits').delete().eq('id', id) // habit_logs ถูกลบตามด้วย cascade
  check(error)
}

export function shift(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  const p = (x) => String(x).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
}

// จำนวนวันติดต่อกัน (ถ้าวันนี้ยังไม่ทำ จะนับจากเมื่อวาน)
export function streak(logs, id) {
  let day = getToday()
  if (!isDone(logs, id, day)) day = shift(day, -1)
  let n = 0
  while (isDone(logs, id, day)) { n++; day = shift(day, -1) }
  return n
}
