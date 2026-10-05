// เรียก Edge Function "analyze" (AI ทำงานฝั่ง server ไม่มี API key ใน browser)
import { supabase, getUserId } from './supabaseClient.js'
import { getToday } from './storage.js'

export async function requestAiAnalysis() {
  await getUserId() // ให้แน่ใจว่ามี session ก่อน (function จะตรวจผู้ใช้จาก token)
  const { data, error } = await supabase.functions.invoke('analyze', {
    body: { today: getToday(), lang: 'th' },
  })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).error || msg } catch { /* ใช้ข้อความเดิม */ }
    if (/not found|404/i.test(msg)) msg = 'The AI function is not deployed yet (see AI_SETUP.md)'
    throw new Error(msg)
  }
  return data // { status: 'ok' | 'insufficient', ... }
}
