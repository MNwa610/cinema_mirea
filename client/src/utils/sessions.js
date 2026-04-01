import { seededRandom } from './seededRandom'

const HALLS = ['Зал 1', 'Зал 2', 'Зал 3', 'Зал 4']

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function formatRuDateLabel(date) {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  })
}

export function dateToISO(date) {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}

export function buildSessionKey({ filmId, cinemaId, dateISO, time }) {
  return `film:${filmId}|cinema:${cinemaId}|date:${dateISO}|time:${time}`
}

export function buildSessionStartDate({ dateISO, time }) {
  const [y, m, d] = dateISO.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, (m - 1), d, hh, mm, 0, 0)
}

export function generateSessionsForDay({ filmId, cinemaId, dateISO }) {
  const rnd = seededRandom(`${filmId}:${cinemaId}:${dateISO}`)
  const count = 3 + Math.floor(rnd() * 2)
  const baseHours = [10, 12, 14, 16, 18, 20, 21]

  const picked = new Set()
  while (picked.size < count) {
    const idx = Math.floor(rnd() * baseHours.length)
    const hour = baseHours[idx]
    const minute = rnd() < 0.5 ? 0 : 30
    picked.add(`${pad2(hour)}:${pad2(minute)}`)
  }

  const times = Array.from(picked).sort()

  return times.map((time, i) => {
    const hall = HALLS[Math.floor(rnd() * HALLS.length)]
    const price = 350 + Math.floor(rnd() * 6) * 50
    return {
      id: `${dateISO}-${time}-${i}`,
      time,
      hall,
      price
    }
  })
}

