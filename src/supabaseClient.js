// เชื่อม Supabase (ค่ามาจาก .env.local เท่านั้น ไม่มี key ในโค้ด)
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key) : null

let sessionPromise = null

// ใช้ Anonymous sign-in: ถ้ายังไม่มี session จะสร้างผู้ใช้นิรนามให้อัตโนมัติ
export function getUserId() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return data.session.user.id
      const { data: d, error } = await supabase.auth.signInAnonymously()
      if (error) throw new Error('Sign-in failed: ' + error.message)
      return d.user.id
    })().catch((e) => { sessionPromise = null; throw e })
  }
  return sessionPromise
}

export function check(error) {
  if (error) throw new Error(error.message)
}
