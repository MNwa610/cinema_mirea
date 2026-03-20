import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/SessionSelectionPage.css'

function SessionSelectionPage() {
  const { filmId } = useParams()
  const navigate = useNavigate()
  const [film, setFilm] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedCinema, setSelectedCinema] = useState(null)
  const [cinemas, setCinemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFilm()
    fetchCinemas()
  }, [filmId])

  const fetchFilm = async () => {
    try {
      const response = await axios.get(`/api/film/external/${filmId}`)
      setFilm(response.data)
    } catch (err) {
      setError('Ошибка при загрузке фильма')
      console.error(err)
    }
  }

  const fetchCinemas = async () => {
    try {
      const response = await axios.get('/api/cinema/?city=moscow')
      setCinemas(response.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  const handleCinemaSelect = (cinemaId) => {
    setSelectedCinema(cinemaId)

    const mockSessions = [
      { id: 1, time: '10:00', hall: 'Зал 1', price: 500 },
      { id: 2, time: '13:30', hall: 'Зал 2', price: 600 },
      { id: 3, time: '17:00', hall: 'Зал 1', price: 700 },
      { id: 4, time: '20:30', hall: 'Зал 3', price: 800 },
    ]
    setSessions(mockSessions)
  }

  const handleSessionSelect = (sessionId) => {

    alert(`Выбран сеанс ${sessionId}. Функционал выбора мест будет добавлен позже.`)
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="session-selection-page">
      <div className="container">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Назад
        </button>

        {film && (
          <div className="film-info-header">
            <h1 className="page-title">Выбор сеанса</h1>
            <div className="film-mini-info">
              <h2>{film.title}</h2>
              {film.duration && <span>⏱ {film.duration} мин</span>}
            </div>
          </div>
        )}

        <div className="cinemas-selection">
          <h2 className="section-title">Выберите кинотеатр</h2>
          <div className="cinemas-list">
            {cinemas.map((cinema) => (
              <button
                key={cinema.id}
                onClick={() => handleCinemaSelect(cinema.id)}
                className={`cinema-select-btn ${
                  selectedCinema === cinema.id ? 'active' : ''
                }`}
              >
                <div className="cinema-btn-info">
                  <span className="cinema-btn-name">{cinema.name}</span>
                  <span className="cinema-btn-address">{cinema.address}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedCinema && sessions.length > 0 && (
          <div className="sessions-section">
            <h2 className="section-title">Доступные сеансы</h2>
            <div className="sessions-grid">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="session-card"
                  onClick={() => handleSessionSelect(session.id)}
                >
                  <div className="session-time">{session.time}</div>
                  <div className="session-details">
                    <span className="session-hall">{session.hall}</span>
                    <span className="session-price">{session.price} ₽</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedCinema && sessions.length === 0 && (
          <div className="no-sessions">
            <p>Сеансы для этого кинотеатра не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionSelectionPage
