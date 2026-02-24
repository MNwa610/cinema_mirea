import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import LoginModal from './LoginModal'
import RegisterModal from './RegisterModal'
import '../styles/Header.css'

function Header() {
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  const handleLoginSuccess = (token, userData) => {
    localStorage.setItem('token', token)
    setIsAuthenticated(true)
    setUser(userData)
    setShowLogin(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setUser(null)
  }

  React.useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Проверка токена при загрузке
      axios.get('/api/user/auth', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (res.data.id) {
            setIsAuthenticated(true)
            setUser(res.data)
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
        })
    }
  }, [])

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>Афиша</h1>
        </Link>
        <nav className="header-nav">
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="username">Привет, {user?.username || 'Пользователь'}!</span>
              <button onClick={handleLogout} className="logout-btn">Выйти</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button onClick={() => setShowLogin(true)} className="login-btn">
                Войти
              </button>
              <button onClick={() => setShowRegister(true)} className="register-btn">
                Регистрация
              </button>
            </div>
          )}
        </nav>
      </div>
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {
            setShowLogin(false)
            setShowRegister(true)
          }}
        />
      )}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSuccess={handleLoginSuccess}
          onSwitchToLogin={() => {
            setShowRegister(false)
            setShowLogin(true)
          }}
        />
      )}
    </header>
  )
}

export default Header
