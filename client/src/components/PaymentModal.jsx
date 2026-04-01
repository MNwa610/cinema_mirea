import React, { useMemo, useState } from 'react'
import Modal from './Modal'
import '../styles/PaymentModal.css'

function PaymentModal({ open, onClose, summary, onPay }) {
  const [method, setMethod] = useState('sbp')
  const total = useMemo(() => {
    const count = summary?.seats?.length || 0
    const price = summary?.price || 0
    return count * price
  }, [summary])

  return (
    <Modal open={open} title="Оплата" onClose={onClose}>
      <div className="payment">
        <div className="payment-summary">
          <div className="payment-row">
            <span>Сеанс</span>
            <b>{summary?.dateISO} {summary?.time}</b>
          </div>
          <div className="payment-row">
            <span>Места</span>
            <b>{(summary?.seats || []).join(', ')}</b>
          </div>
          <div className="payment-row">
            <span>Цена</span>
            <b>{summary?.price} ₽</b>
          </div>
          <div className="payment-total">
            Итого: <b>{total} ₽</b>
          </div>
        </div>

        <div className="payment-methods">
          <label className={`method ${method === 'sbp' ? 'active' : ''}`}>
            <input
              type="radio"
              name="pay"
              value="sbp"
              checked={method === 'sbp'}
              onChange={() => setMethod('sbp')}
            />
            Оплата через СБП
          </label>
          <label className={`method ${method === 'mir' ? 'active' : ''}`}>
            <input
              type="radio"
              name="pay"
              value="mir"
              checked={method === 'mir'}
              onChange={() => setMethod('mir')}
            />
            Оплата картой МИР
          </label>
        </div>

        <button
          type="button"
          className="pay-btn"
          onClick={() => onPay({ method })}
        >
          Оплатить
        </button>
        <div className="payment-note">
          Это заглушка: реальная оплата не выполняется.
        </div>
      </div>
    </Modal>
  )
}

export default PaymentModal

