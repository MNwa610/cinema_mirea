import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import '../styles/GenreFilmsPage.css'

function GenreFilmsPage() {
  const { genre } = useParams()
  const navigate = useNavigate()
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchGenreFilms = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await axios.get(`/api/film/external/genre/${encodeURIComponent(genre)}`)
        setFilms(Array.isArray(response.data?.items) ? response.data.items : [])
      } catch (err) {
        setError('Не удалось загрузить фильмы по жанру')
      } finally {
        setLoading(false)
      }
    }

    fetchGenreFilms()
  }, [genre])

  if (loading) {
    return <div className="loading">Загрузка фильмов жанра...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="genre-films-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Назад
        </button>
        <h1 className="page-title">Жанр: {genre}</h1>
        <p className="page-subtitle">Фильмы отсортированы по рейтингу</p>

        <div className="films-grid">
          {films.length === 0 ? (
            <p className="no-films">Фильмы не найдены</p>
          ) : (
            films.map((film) => (
              <div
                key={film.id}
                className="film-card"
                onClick={() => navigate(`/film/${film.id}`)}
              >
                <div className="film-card-poster-wrapper">
                  {film.posterUrl ? (
                    <img src={film.posterUrl} alt={film.title} className="film-card-poster" />
                  ) : (
                    <div className="film-card-poster-placeholder">Нет постера</div>
                  )}
                </div>
                <div className="film-card-info">
                  <h2 className="film-card-title">{film.title}</h2>
                  <div className="film-card-rating">Рейтинг: {film.rating > 0 ? film.rating.toFixed(1) : '—'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default GenreFilmsPage
