import React, { useEffect } from 'react'
import '../styles/ModalBase.css'

function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title || 'Окно'}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Закрыть фон" />
    </div>
  )
}

export default Modal

