import React, { useState } from 'react'
import axios from 'axios'
import '../styles/Modal.css'

function LoginModal({ onClose, onSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/user/login', {
        email,
        password
      })

      if (response.data.token) {
        // Получаем данные пользователя
        const userResponse = await axios.get('/api/user/auth', {
          headers: {
            'Authorization': `Bearer ${response.data.token}`
          }
        })
        onSuccess(response.data.token, userResponse.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при входе')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Вход</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p className="switch-modal">
          Нет аккаунта?{' '}
          <button onClick={onSwitchToRegister} className="link-btn">
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  )
}

export default LoginModal
