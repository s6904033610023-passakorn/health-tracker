import { useState } from 'react'
import { supabase } from './supabaseClient.js'
import { loadCheckins, getToday } from './storage.js'
import { loadHabits, loadLogs } from './habitStorage.js'

const symptoms = [
  { id: 'tired', label: 'เหนื่อยง่าย / อ่อนเพลีย' },
  { id: 'sleepy', label: 'ง่วงนอน / พักผ่อนไม่พอ' },
  { id: 'headache', label: 'ปวดหัว' },
  { id: 'stress', label: 'เครียด / กังวล' },
  { id: 'focus', label: 'ไม่มีสมาธิ' },
  { id: 'thirsty', label: 'กระหายน้ำ' },
  { id: 'low_mood', label: 'อารมณ์ไม่ค่อยดี' },
  { id: 'body_ache', label: 'ปวดเมื่อยตามตัว' },
  { id: 'other', label: 'อาการอื่น ๆ' },
]

const memoryKey = 'healthtrack_fallback_memories'

function readMemories() {
  try {
    return JSON.parse(localStorage.getItem(memoryKey) || '[]')
  } catch {
    return []
  }
}

function buildFallbackReply(
  selected,
  otherText,
  checkins,
  habits,
  logs,
) {
  const selectedLabels = selected
    .map((id) => symptoms.find((s) => s.id === id)?.label)
    .filter(Boolean)
    .join(', ')

  const lines = [
    '🧭 **สรุปจากอาการและข้อมูลที่บันทึกไว้**',
    `วันนี้คุณเลือกอาการ: ${selectedLabels}${
      otherText.trim() ? ` (${otherText.trim()})` : ''
    }`,
    '',
  ]

  if (!checkins.length) {
    lines.push(
      'ตอนนี้ยังไม่มีข้อมูล Daily Check-in ย้อนหลังให้เปรียบเทียบ ลองบันทึกการนอน ดื่มน้ำ ออกกำลังกาย อารมณ์ และอาหารอย่างต่อเนื่อง แล้วเราจะช่วยดูแนวโน้มได้ชัดขึ้น',
    )
  } else {
    const avg = (key) =>
      checkins.reduce(
        (sum, row) => sum + Number(row[key] || 0),
        0,
      ) / checkins.length

    const sleep = avg('sleepHours')
    const water = avg('waterGlasses')
    const exercise = avg('exerciseMinutes')

    lines.push(
      `จาก Daily Check-in ${checkins.length} วันล่าสุด: นอนเฉลี่ย ${sleep.toFixed(
        1,
      )} ชม./คืน, ดื่มน้ำ ${water.toFixed(
        1,
      )} แก้ว/วัน และออกกำลังกาย ${exercise.toFixed(0)} นาที/วัน`,
    )

    const links = []

    if (
      selected.some((id) =>
        ['tired', 'sleepy', 'focus', 'headache'].includes(id),
      ) &&
      sleep < 7
    ) {
      links.push(
        `อาการเหนื่อย ง่วง ไม่มีสมาธิ หรือปวดหัวที่เลือก อาจสัมพันธ์กับการนอนเฉลี่ย ${sleep.toFixed(
          1,
        )} ชั่วโมง ซึ่งค่อนข้างน้อยสำหรับผู้ใหญ่หลายคน`,
      )
    }

    if (
      selected.some((id) =>
        ['headache', 'tired', 'thirsty'].includes(id),
      ) &&
      water < 6
    ) {
      links.push(
        `อาการปวดหัว เหนื่อย หรือกระหายน้ำอาจสัมพันธ์กับการดื่มน้ำที่บันทึกไว้เฉลี่ย ${water.toFixed(
          1,
        )} แก้ว/วัน ทั้งนี้ความต้องการน้ำแต่ละคนไม่เท่ากัน`,
      )
    }

    if (
      selected.some((id) =>
        ['stress', 'low_mood', 'focus'].includes(id),
      ) &&
      checkins.filter((row) => row.mood === 'bad').length >=
        Math.ceil(checkins.length / 3)
    ) {
      links.push(
        'ข้อมูลย้อนหลังมีวันที่บันทึกอารมณ์ไม่ค่อยดีหลายวัน ลองสังเกตว่าความเครียด การพักผ่อน หรือกิจกรรมในวันนั้นเกี่ยวข้องกันหรือไม่',
      )
    }

    if (
      selected.some((id) =>
        ['tired', 'body_ache'].includes(id),
      ) &&
      exercise < 10
    ) {
      links.push(
        'กิจกรรมทางกายที่ค่อนข้างน้อยอาจเป็นหนึ่งในปัจจัยที่ควรสังเกต แต่ไม่ใช่ข้อสรุปว่าเป็นสาเหตุของอาการ',
      )
    }

    if (links.length) {
      lines.push(
        'สิ่งที่อาจเกี่ยวข้อง (เป็นเพียงแนวโน้ม ไม่ใช่การวินิจฉัย):',
      )

      links.forEach((line) => {
        lines.push(`• ${line}`)
      })
    } else {
      lines.push(
        'จากข้อมูลที่มี ยังไม่พบความเชื่อมโยงที่ชัดเจนระหว่างอาการที่เลือกกับบันทึกสุขภาพ อย่าเพิ่งสรุปสาเหตุจากข้อมูลเพียงไม่กี่วัน',
      )
    }

    if (habits.length) {
      const today = getToday()
      const doneIds = logs[today] || []

      const doneNames = habits
        .filter((habit) => doneIds.includes(habit.id))
        .map((habit) => habit.name)

      lines.push(
        `วันนี้ทำ habit แล้ว ${doneNames.length}/${habits.length} รายการ${
          doneNames.length
            ? ` (${doneNames.join(', ')})`
            : ''
        }`,
      )
    }
  }

  lines.push(
    '',
    'ลองดูแลตัวเองเบื้องต้น: พักผ่อนให้เพียงพอ จิบน้ำตามความเหมาะสม และจดว่าอาการเริ่มเมื่อไร/มีอะไรทำให้อาการดีขึ้นหรือแย่ลง',
  )

  lines.push(
    '⚠️ นี่เป็นข้อมูลสุขภาพทั่วไป ไม่ใช่การวินิจฉัย หากอาการรุนแรง เกิดขึ้นฉับพลัน แย่ลงต่อเนื่อง หรือมีอาการฉุกเฉิน เช่น หายใจลำบาก เจ็บหน้าอกรุนแรง หรือหมดสติ ให้ขอความช่วยเหลือทางการแพทย์ทันที',
  )

  return lines.join('\n')
}

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'สวัสดีครับ 👋 ผมคือ HealthTrack AI มีอะไรให้ผมช่วยวิเคราะห์เรื่องสุขภาพไหมครับ?',
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHealthCheck, setShowHealthCheck] = useState(false)
  const [selected, setSelected] = useState([])
  const [otherText, setOtherText] = useState('')
  const [fallbackError, setFallbackError] = useState('')

  const sendMessage = async () => {
    const text = input.trim()

    if (!text || loading) return

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: text,
      },
    ])

    setInput('')
    setLoading(true)

    try {
      const { data, error } =
        await supabase.functions.invoke('chat', {
          body: {
            message: text,
            today: getToday(),
            lang: 'th',
          },
        })

      if (error) {
        throw error
      }

      if (!data?.answer) {
        throw new Error('AI did not return an answer')
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
        },
      ])
    } catch (error) {
      console.error('Chat error:', error)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'ตอนนี้บริการ AI ใช้งานไม่ได้ชั่วคราวครับ สามารถใช้แบบประเมินอาการและเทียบกับบันทึกสุขภาพของคุณแทนได้',
        },
      ])

      setShowHealthCheck(true)
    } finally {
      setLoading(false)
    }
  }

  const toggleSymptom = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    )
  }

  const submitHealthCheck = async (event) => {
    event.preventDefault()

    if (!selected.length || loading) return

    setLoading(true)
    setFallbackError('')

    try {
      const [allCheckins, habits, logs] =
        await Promise.all([
          loadCheckins(),
          loadHabits().catch(() => []),
          loadLogs().catch(() => ({})),
        ])

      const today = getToday()

      const start = new Date()
      start.setDate(start.getDate() - 6)

      const startDate = `${start.getFullYear()}-${String(
        start.getMonth() + 1,
      ).padStart(2, '0')}-${String(
        start.getDate(),
      ).padStart(2, '0')}`

      const recent = allCheckins.filter(
        (row) =>
          row.date >= startDate &&
          row.date <= today,
      )

      const reply = buildFallbackReply(
        selected,
        otherText,
        recent,
        habits,
        logs,
      )

      const record = {
        date: today,
        symptoms: selected,
        otherText: otherText.trim(),
        reply,
        savedAt: new Date().toISOString(),
      }

      const memories = readMemories()

      localStorage.setItem(
        memoryKey,
        JSON.stringify(
          [record, ...memories].slice(0, 50),
        ),
      )

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
        },
      ])

      setShowHealthCheck(false)
      setSelected([])
      setOtherText('')
    } catch (error) {
      console.error(
        'Fallback health check error:',
        error,
      )

      setFallbackError(
        'โหลดข้อมูลสุขภาพไม่สำเร็จ กรุณาลองอีกครั้ง',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <h1>AI Chat 🤖</h1>

      <p className="muted">
        พูดคุยเรื่องสุขภาพ หรือใช้แบบประเมินอาการเมื่อบริการ AI ไม่พร้อมใช้งาน
      </p>

      <div className="card chat-card">
        <div
          className="chat-messages"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.role}`}
            >
              <div className="chat-bubble">
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="chat-bubble">
                กำลังวิเคราะห์ข้อมูลของคุณ... 🤔
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์คำถามเกี่ยวกับสุขภาพ..."
            rows={1}
            disabled={loading}
          />

          <button
            className="primary"
            onClick={sendMessage}
            disabled={
              !input.trim() || loading
            }
          >
            {loading ? 'กำลังคิด...' : 'ส่ง'}
          </button>
        </div>
      </div>

      {showHealthCheck && (
        <form
          className="card health-check"
          onSubmit={submitHealthCheck}
        >
          <h3>
            🩺 วันนี้คุณมีอาการอะไรบ้าง?
          </h3>

          <p className="muted">
            เลือกได้มากกว่าหนึ่งข้อ ระบบจะนำไปเปรียบเทียบกับ Daily Check-in 7 วันล่าสุดที่มีอยู่
          </p>

          <div className="symptom-list">
            {symptoms.map((symptom) => (
              <label
                key={symptom.id}
                className="symptom-option"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(
                    symptom.id,
                  )}
                  onChange={() =>
                    toggleSymptom(symptom.id)
                  }
                />

                <span>{symptom.label}</span>
              </label>
            ))}
          </div>

          {selected.includes('other') && (
            <div className="field">
              <label htmlFor="other-symptom">
                ระบุอาการเพิ่มเติม
              </label>

              <textarea
                id="other-symptom"
                value={otherText}
                onChange={(event) =>
                  setOtherText(event.target.value)
                }
                rows={2}
                placeholder="อธิบายอาการสั้น ๆ"
              />
            </div>
          )}

          {fallbackError && (
            <p
              className="error"
              role="alert"
            >
              {fallbackError}
            </p>
          )}

          <div className="health-check-actions">
            <button
              type="button"
              className="link"
              onClick={() =>
                setShowHealthCheck(false)
              }
            >
              ไว้ทีหลัง
            </button>

            <button
              type="submit"
              className="primary"
              disabled={
                !selected.length || loading
              }
            >
              {loading
                ? 'กำลังตรวจข้อมูล...'
                : 'วิเคราะห์จากข้อมูลของฉัน'}
            </button>
          </div>

          <p className="muted small">
            ผลลัพธ์เป็นการเชื่อมโยงเบื้องต้น ไม่ใช่การวินิจฉัยโรค
          </p>
        </form>
      )}
    </>
  )
}