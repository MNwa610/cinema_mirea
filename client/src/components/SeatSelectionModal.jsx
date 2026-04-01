import React, { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import '../styles/SeatSelectionModal.css'
import { seededRandom } from '../utils/seededRandom'
import { loadBooking } from '../utils/bookingStorage'

function buildSeats({ rows, cols, reservedSet }) {
  const seats = []
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const id = `${r}-${c}`
      seats.push({
        id,
        row: r,
        col: c,
        reserved: reservedSet.has(id)
      })
    }
  }
  return seats
}

function SeatSelectionModal({
  open,
  onClose,
  sessionKey,
  onConfirmSeats,
  maxSelectable = 6
}) {
  const rows = 8
  const cols = 10

  const reservedSet = useMemo(() => {
    const rnd = seededRandom(`reserved:${sessionKey}`)
    const total = rows * cols
    const reserveCount = Math.floor(total * (0.12 + rnd() * 0.12))

    const set = new Set()
    while (set.size < reserveCount) {
      const idx = Math.floor(rnd() * total)
      const r = Math.floor(idx / cols) + 1
      const c = (idx % cols) + 1
      set.add(`${r}-${c}`)
    }

    const existing = loadBooking(sessionKey)
    if (existing?.seats && Array.isArray(existing.seats)) {
      for (const s of existing.seats) set.add(String(s))
    }

    return set
  }, [sessionKey])

  const seats = useMemo(() => buildSeats({ rows, cols, reservedSet }), [reservedSet])
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
  }, [open, sessionKey])

  const selectedList = Array.from(selected)

  return (
    <Modal open={open} title="Выбор места" onClose={onClose}>
      <div className="seat-modal">
        <div className="screen">Экран</div>

        <div className="seats-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {seats.map((s) => {
            const isSelected = selected.has(s.id)
            const disabled = s.reserved
            return (
              <button
                key={s.id}
                type="button"
                className={`seat ${disabled ? 'reserved' : ''} ${isSelected ? 'selected' : ''}`}
                disabled={disabled}
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (next.has(s.id)) next.delete(s.id)
                    else {
                      if (next.size >= maxSelectable) return next
                      next.add(s.id)
                    }
                    return next
                  })
                }}
                aria-label={`Ряд ${s.row}, место ${s.col}${disabled ? ', занято' : ''}`}
              />
            )
          })}
        </div>

        <div className="seat-legend">
          <span><i className="seat-dot free" /> свободно</span>
          <span><i className="seat-dot selected" /> выбрано</span>
          <span><i className="seat-dot reserved" /> занято</span>
        </div>

        <div className="seat-actions">
          <div className="seat-selected">
            {selectedList.length
              ? `Вы выбрали: ${selectedList.join(', ')}`
              : 'Выберите места'}
          </div>
          <button
            type="button"
            className="primary-action"
            disabled={selectedList.length === 0}
            onClick={() => onConfirmSeats(selectedList)}
          >
            Перейти к оплате
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SeatSelectionModal

