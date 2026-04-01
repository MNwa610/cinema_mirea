import React, { useState } from 'react'
import axios from 'axios'
import { fetchYandexSuggest } from '../api/yandexSuggest'
import '../styles/Modal.css'

function RegisterModal({ onClose, onSuccess, onSwitchToLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/user/registration', {
        username,
        email,
        password,
        address: address.trim() || undefined
      })

      if (response.data.user) {

        const loginResponse = await axios.post('/api/user/login', {
          email,
          password
        })
        if (loginResponse.data.token) {
          const userResponse = await axios.get('/api/user/auth', {
            headers: {
              'Authorization': `Bearer ${loginResponse.data.token}`
            }
          })
          onSuccess(loginResponse.data.token, userResponse.data)
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  const handleAddressInput = async (value) => {
    setAddress(value)
    if (value.trim().length < 3) {
      setAddressSuggestions([])
      return
    }
    try {
      const items = await fetchYandexSuggest(value)
      setAddressSuggestions(items.slice(0, 6))
    } catch (e) {
      setAddressSuggestions([])
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Регистрация</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">Имя пользователя:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
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
          <div className="form-group">
            <label htmlFor="address">Адрес (необязательно):</label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => handleAddressInput(e.target.value)}
              placeholder="Например: Москва, ул. Тверская, д. 1"
            />
            {addressSuggestions.length > 0 && (
              <div className="address-suggest-dropdown modal-address-suggest-dropdown">
                {addressSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="address-suggest-item"
                    onClick={() => {
                      setAddress(item)
                      setAddressSuggestions([])
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
            <span className="form-hint">
              Используется для карт и построения маршрутов до кинотеатров.
            </span>
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="switch-modal">
          Уже есть аккаунт?{' '}
          <button onClick={onSwitchToLogin} className="link-btn">
            Войти
          </button>
        </p>
      </div>
    </div>
  )
}

export default RegisterModal
