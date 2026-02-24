import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/HomePage.css'

function HomePage() {
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchFilms = async () => {
      try {
        const response = await axios.get('/api/film/')
        setFilms(response.data)
      } catch (err) {
        setError('Ошибка при загрузке фильмов')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchFilms()
  }, [])

  const handleFilmClick = (filmId) => {
    navigate(`/film/${filmId}`)
  }

  if (loading) {
    return <div className="loading">Загрузка фильмов...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="home-page">
      <div className="container">
        <h1 className="page-title">Фильмы</h1>
        <p className="page-subtitle">
          Выберите фильм, чтобы посмотреть подробную информацию, рейтинги и кинотеатры, где он идет.
        </p>

        <div className="films-grid">
          {films.length === 0 ? (
            <p className="no-films">Фильмы не найдены</p>
          ) : (
            films.map((film) => (
              <div
                key={film.id}
                className="film-card"
                onClick={() => handleFilmClick(film.id)}
              >
                <div className="film-card-poster-wrapper">
                  {film.posterUrl ? (
                    <img
                      src={film.posterUrl}
                      alt={film.title}
                      className="film-card-poster"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="film-card-poster-placeholder">Нет постера</div>
                  )}
                </div>
                <div className="film-card-info">
                  <h2 className="film-card-title">{film.title}</h2>
                  {film.rating > 0 && (
                    <div className="film-card-rating">
                      <span className="film-card-rating-label">Рейтинг:</span>
                      <span className="film-card-rating-value">
                        {film.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {film.genres && film.genres.length > 0 && (
                    <p className="film-card-genres">
                      {film.genres.join(', ')}
                    </p>
                  )}
                  {film.description && (
                    <p className="film-card-description">
                      {film.description.length > 120
                        ? `${film.description.slice(0, 120)}...`
                        : film.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
