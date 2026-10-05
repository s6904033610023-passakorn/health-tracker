// วิเคราะห์ 7 วันย้อนหลังด้วย JavaScript ล้วน (ไม่เรียก AI API) ข้อมูลมาจาก Supabase
import { getToday, loadCheckins } from './storage.js'
import { loadHabits, loadLogs, shift } from './habitStorage.js'

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length
const r1 = (n) => Math.round(n * 10) / 10
const count = (arr, v) => arr.filter((x) => x === v).length

export async function analyze7Days() {
  const today = getToday()
  const start = shift(today, -6)
  const inWin = (d) => d >= start && d <= today

  const [allCheckins, logs, habits] = await Promise.all([loadCheckins(start), loadLogs(), loadHabits()])
  const checkins = allCheckins.filter((c) => inWin(c.date))
  const n = checkins.length

  // Habit: นับตั้งแต่วันแรกที่มีข้อมูลในช่วง 7 วัน จนถึงวันนี้
  const logDates = Object.keys(logs).filter((d) => inWin(d) && logs[d].length > 0)
  const firstDates = [...checkins.map((c) => c.date), ...logDates].sort()
  let habit = null
  if (habits.length && firstDates.length) {
    let days = 0
    for (let d = firstDates[0]; d <= today; d = shift(d, 1)) days++
    const per = habits.map((h) => {
      let done = 0
      for (let d = firstDates[0]; d <= today; d = shift(d, 1)) if ((logs[d] || []).includes(h.id)) done++
      return { name: h.name, done, days }
    })
    const total = per.reduce((s, p) => s + p.done, 0)
    habit = { days, per, percent: Math.round((total / (habits.length * days)) * 100) }
  }

  let stats = null
  if (n > 0) {
    const moods = checkins.map((c) => c.mood)
    const foods = checkins.map((c) => c.foodQuality)
    stats = {
      sleep: r1(avg(checkins.map((c) => c.sleepHours))),
      water: r1(avg(checkins.map((c) => c.waterGlasses))),
      exercise: r1(avg(checkins.map((c) => c.exerciseMinutes))),
      exerciseDays: checkins.filter((c) => c.exerciseMinutes > 0).length,
      mood: { good: count(moods, 'good'), normal: count(moods, 'normal'), bad: count(moods, 'bad') },
      food: { good: count(foods, 'good'), normal: count(foods, 'normal'), bad: count(foods, 'bad') },
    }
  }

  const good = [], improve = []
  if (stats) {
    const s = stats
    if (s.sleep >= 7) good.push(`Great sleep: you average ${s.sleep} hours a night.`)
    else if (s.sleep < 6) improve.push(`You average only ${s.sleep} hours of sleep. Try going to bed a bit earlier.`)
    if (s.water >= 8) good.push(`You reach your water goal: ${s.water} glasses a day on average.`)
    else if (s.water < 6) improve.push(`Water is low (${s.water} glasses a day on average). Aim for about 8.`)
    if (s.exercise >= 30) good.push(`Nice activity level: ${s.exercise} minutes of exercise a day on average.`)
    else if (s.exercise < 15) improve.push(`Exercise is low (${s.exercise} min a day on average). Even a 15-minute walk helps.`)
    if (s.mood.good * 2 >= n) good.push('Your mood has been good on at least half of the days.')
    if (s.mood.bad >= 2 && s.mood.bad * 2 >= n) improve.push('You reported a bad mood on many days. Notice what these days have in common.')
    if (s.food.good * 2 >= n) good.push('You ate well on at least half of the days.')
    if (s.food.bad >= 2 && s.food.bad * 2 >= n) improve.push('Food quality was bad on many days. Try planning one healthy meal a day.')
    if (n < 4) improve.push('Check in more days to get a more accurate analysis.')
  }
  if (habit) {
    if (habit.percent >= 70) good.push(`Strong habit consistency: ${habit.percent}% completed.`)
    else if (habit.percent < 40) improve.push(`Habit completion is ${habit.percent}%. Try focusing on just one habit first.`)
  }

  return { days: n, start, today, stats, habit, good, improve }
}
