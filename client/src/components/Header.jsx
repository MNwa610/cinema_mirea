import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import LoginModal from './LoginModal'
import RegisterModal from './RegisterModal'
import '../styles/Header.css'

function Header() {
  const navigate = useNavigate()
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  const handleLoginSuccess = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    window.dispatchEvent(new Event('auth-changed'))
    setIsAuthenticated(true)
    setUser(userData)
    setShowLogin(false)
    setShowRegister(false)
    window.location.reload()
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userAddress')
    localStorage.removeItem('userLocation')
    window.dispatchEvent(new Event('auth-changed'))
    setIsAuthenticated(false)
    setUser(null)
    navigate('/')
  }

  React.useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        setIsAuthenticated(true)
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
    if (token) {
      axios.get('/api/user/auth', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (res.data.id) {
            setIsAuthenticated(true)
            setUser(res.data)
            localStorage.setItem('user', JSON.stringify(res.data))
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
              <button
                className="user-profile-btn"
                onClick={() => navigate('/profile')}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username || 'Профиль'}
                    className="user-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="user-avatar-placeholder">
                    {(user?.username || 'П')[0].toUpperCase()}
                  </span>
                )}
                <span className="username">
                  {user?.username || 'Пользователь'}
                </span>
              </button>
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
