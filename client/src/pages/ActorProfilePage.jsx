import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import '../styles/ActorProfilePage.css'

function ActorProfilePage() {
  const { actorId } = useParams()
  const navigate = useNavigate()
  const [actor, setActor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchActor = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await axios.get(`/api/film/external/actor/${actorId}`)
        setActor(response.data)
      } catch (err) {
        setError('Не удалось загрузить профиль актера')
      } finally {
        setLoading(false)
      }
    }

    fetchActor()
  }, [actorId])

  if (loading) {
    return <div className="loading">Загрузка профиля актера...</div>
  }

  if (error || !actor) {
    return <div className="error">{error || 'Актер не найден'}</div>
  }

  return (
    <div className="actor-profile-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Назад
        </button>

        <div className="actor-header">
          <div className="actor-poster-wrap">
            {actor.posterUrl ? (
              <img src={actor.posterUrl} alt={actor.name} className="actor-poster" />
            ) : (
              <div className="actor-poster-placeholder">Нет фото</div>
            )}
          </div>
          <div className="actor-main">
            <h1 className="actor-name">{actor.name}</h1>
            {actor.profession && <p className="actor-meta"><strong>Профессия:</strong> {actor.profession}</p>}
            {actor.birthday && <p className="actor-meta"><strong>Дата рождения:</strong> {actor.birthday}</p>}
            {actor.birthPlace && <p className="actor-meta"><strong>Место рождения:</strong> {actor.birthPlace}</p>}
            {actor.age ? <p className="actor-meta"><strong>Возраст:</strong> {actor.age}</p> : null}
          </div>
        </div>

        <section className="actor-films-section">
          <h2>Фильмы актера</h2>
          {!actor.films?.length ? (
            <p className="empty-state">Фильмы не найдены</p>
          ) : (
            <div className="actor-films-list">
              {actor.films.map((film) => (
                <button
                  key={`${film.id}-${film.professionKey}`}
                  className="actor-film-item"
                  onClick={() => navigate(`/film/${film.id}`)}
                >
                  <span className="actor-film-poster-wrap">
                    {film.posterUrl ? (
                      <img
                        src={film.posterUrl}
                        alt={film.title}
                        className="actor-film-poster"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="actor-film-poster-placeholder">Нет постера</span>
                    )}
                  </span>
                  <span className="actor-film-title">{film.title}</span>
                  <span className="actor-film-rating">
                    {film.rating > 0 ? film.rating.toFixed(1) : '—'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default ActorProfilePage
