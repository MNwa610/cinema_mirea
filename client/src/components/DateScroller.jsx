import React from 'react'
import '../styles/DateScroller.css'
import { dateToISO, formatRuDateLabel } from '../utils/sessions'

function buildDays(daysCount) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Array.from({ length: daysCount }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function DateScroller({ valueISO, onChangeISO, daysCount = 7 }) {
  const days = buildDays(daysCount)

  return (
    <div className="date-scroller" role="tablist" aria-label="Выбор даты">
      {days.map((d) => {
        const iso = dateToISO(d)
        const isActive = iso === valueISO
        const isToday = iso === dateToISO(new Date())
        return (
          <button
            key={iso}
            type="button"
            className={`date-chip ${isActive ? 'active' : ''}`}
            onClick={() => onChangeISO(iso)}
            aria-selected={isActive}
            role="tab"
          >
            <div className="date-chip-top">{isToday ? 'Сегодня' : formatRuDateLabel(d)}</div>
            <div className="date-chip-bottom">{iso}</div>
          </button>
        )
      })}
    </div>
  )
}

export default DateScroller

