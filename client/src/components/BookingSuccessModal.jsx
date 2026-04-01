import React from 'react'
import Modal from './Modal'
import '../styles/BookingSuccessModal.css'

function BookingSuccessModal({ open, onClose, details }) {
  return (
    <Modal open={open} title="Бронь подтверждена" onClose={onClose}>
      <div className="success">
        <div className="success-badge">Успешно</div>
        <div className="success-text">
          <div><b>Сеанс:</b> {details?.dateISO} {details?.time}</div>
          <div><b>Кинотеатр:</b> {details?.cinemaName || '—'}</div>
          <div><b>Места:</b> {(details?.seats || []).join(', ')}</div>
        </div>
        <button type="button" className="success-btn" onClick={onClose}>
          Закрыть
        </button>
        <div className="success-note">
          Бронь хранится до окончания этого сеанса.
        </div>
      </div>
    </Modal>
  )
}

export default BookingSuccessModal

