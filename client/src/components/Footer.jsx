import React from 'react'
import '../styles/Footer.css'

function Footer() {
  const [user, setUser] = React.useState(null)

  React.useEffect(() => {
    const syncUserFromStorage = () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setUser(null)
        return
      }
    
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          setUser(parsed)
        } catch (e) {
          localStorage.removeItem('user')
          setUser(null)
        }
      }
    } 
    setUser(null)
    syncUserFromStorage()
    window.addEventListener('auth-changed', syncUserFromStorage)
    window.addEventListener('storage', syncUserFromStorage)
    return () => {
      window.removeEventListener('auth-changed', syncUserFromStorage)
      window.removeEventListener('storage', syncUserFromStorage)
    }
  }, [])

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-logo">Афиша МИРЭА</div>
          <p className="footer-copy">© {new Date().getFullYear()} Афиша для МИРЭА. Все права защищены.</p>
          {user && (
            <div className="footer-user">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username || 'Профиль'}
                  className="footer-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <span className="footer-avatar-placeholder">
                  {(user.username || 'П')[0].toUpperCase()}
                </span>
              )}
              <span className="footer-username">{user.username}</span>
            </div>
          )}
        </div>
        <div className="footer-right">
          <div className="footer-contacts">
            <h4>Контакты</h4>
            <p>Email: <a href="mailto:support@afisha-mirea.ru">support@afisha-mirea.ru</a></p>
            <p>Телефон: <a href="tel:+7XXXXXXXXXX">+7 (999) 123‑45‑67</a></p>
          </div>
          <div className="footer-links">
            <h4>Полезное</h4>
            <p><a href="https://www.mirea.ru" target="_blank" rel="noreferrer">Сайт МИРЭА</a></p>
            <p><a href="https://www.kinopoisk.ru" target="_blank" rel="noreferrer">Кинопоиск</a></p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

