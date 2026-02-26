import React from 'react'
import '../styles/Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-logo">Афиша МИРЭА</div>
          <p className="footer-copy">© {new Date().getFullYear()} Афиша для МИРЭА. Все права защищены.</p>
        </div>
        <div className="footer-right">
          <div className="footer-contacts">
            <h4>Контакты</h4>
            <p>Email: <a href="mailto:support@afisha-mirea.ru">mnwa.work@mail.ru</a></p>
            <p>Телефон: <a href="tel:+7XXXXXXXXXX">+7 (910) 624-33-73</a></p>
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

