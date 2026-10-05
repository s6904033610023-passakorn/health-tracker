// Daily Check-in บน Supabase (ตาราง health_logs)
import { supabase, getUserId, check } from './supabaseClient.js'

export function getToday() {
  const d = new Date() // ใช้วันที่ตามเวลาเครื่อง ไม่ใช้ UTC
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const fromRow = (r) => ({
  date: r.log_date,
  sleepHours: Number(r.sleep_hours),
  waterGlasses: r.water_glasses,
  exerciseMinutes: r.exercise_minutes,
  mood: r.mood,
  foodQuality: r.food_quality,
})

export async function loadCheckins(sinceDate) {
  await getUserId()
  let q = supabase.from('health_logs').select('*').order('log_date')
  if (sinceDate) q = q.gte('log_date', sinceDate)
  const { data, error } = await q
  check(error)
  return data.map(fromRow)
}

export async function getTodayCheckin() {
  await getUserId()
  const { data, error } = await supabase.from('health_logs').select('*').eq('log_date', getToday()).maybeSingle()
  check(error)
  return data ? fromRow(data) : null
}

// มีข้อมูลของวันนี้แล้ว = แก้ไขแถวเดิม (upsert) ไม่สร้างซ้ำ
export async function saveTodayCheckin(e) {
  const user_id = await getUserId()
  const { error } = await supabase.from('health_logs').upsert(
    {
      user_id,
      log_date: getToday(),
      sleep_hours: e.sleepHours,
      water_glasses: e.waterGlasses,
      exercise_minutes: e.exerciseMinutes,
      mood: e.mood,
      food_quality: e.foodQuality,
    },
    { onConflict: 'user_id,log_date' },
  )
  check(error)
}
