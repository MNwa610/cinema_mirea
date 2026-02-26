import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/CinemaFilmsPage.css'

function CinemaFilmsPage() {
  const { cinemaId } = useParams()
  const navigate = useNavigate()
  const [cinema, setCinema] = useState(null)
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCinema()
    fetchFilms()
  }, [cinemaId])

  const fetchCinema = async () => {
    try {
      const response = await axios.get(`/api/cinema/${cinemaId}`)
      setCinema(response.data)
    } catch (err) {
      setError('Ошибка при загрузке кинотеатра')
      console.error(err)
    }
  }

  const fetchFilms = async () => {
    try {
      const response = await axios.get('/api/film/external/random?take=18')
      const items = Array.isArray(response.data?.items) ? response.data.items : []
      setFilms(items)
    } catch (err) {
      setError('Ошибка при загрузке фильмов')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilmClick = (filmId) => {
    navigate(`/film/${filmId}`)
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="cinema-films-page">
      <div className="container">
        {cinema && (
          <div className="cinema-header">
            <button onClick={() => navigate('/')} className="back-btn">
              ← Назад
            </button>
            <h1 className="cinema-title">{cinema.name}</h1>
            <p className="cinema-address">{cinema.address}</p>
            {cinema.phoneNumber && (
              <p className="cinema-phone">📞 {cinema.phoneNumber}</p>
            )}
          </div>
        )}

        <div className="map-container">
          <div className="map-placeholder">
            <p>Карта будет здесь</p>
            <p className="map-note">Показывает как дойти до кинотеатра</p>
          </div>
        </div>

        <h2 className="films-section-title">Доступные фильмы</h2>
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
                {film.posterUrl && (
                  <img
                    src={film.posterUrl}
                    alt={film.title}
                    className="film-poster"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                )}
                <div className="film-info">
                  <h3 className="film-title">{film.title}</h3>
                  {film.rating > 0 && (
                    <div className="film-rating">
                      ⭐ {film.rating.toFixed(1)}
                    </div>
                  )}
                  {film.duration && (
                    <p className="film-duration">⏱ {film.duration} мин</p>
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

export default CinemaFilmsPage
