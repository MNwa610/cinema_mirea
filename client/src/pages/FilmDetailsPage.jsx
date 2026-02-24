import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import LocationSelector from '../components/LocationSelector'
import '../styles/FilmDetailsPage.css'

function FilmDetailsPage() {
  const { filmId } = useParams()
  const navigate = useNavigate()

  const [film, setFilm] = useState(null)
  const [cinemas, setCinemas] = useState([])
  const [filteredCinemas, setFilteredCinemas] = useState([])
  const [selectedCinemaId, setSelectedCinemaId] = useState(null)

  const [userLocation, setUserLocation] = useState(null)
  const [userAddress, setUserAddress] = useState('')
  const [cinemaSearch, setCinemaSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [cinemasLoading, setCinemasLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchFilm(), fetchCinemas()])
      setLoading(false)
    }

    fetchData()
  }, [filmId])

  const fetchFilm = async () => {
    try {
      const response = await axios.get(`/api/film/${filmId}`)
      setFilm(response.data)
    } catch (err) {
      setError('Ошибка при загрузке фильма')
      console.error(err)
    }
  }

  const fetchCinemas = async () => {
    try {
      setCinemasLoading(true)
      const response = await axios.get(`/api/film/${filmId}/cinemas`)
      setCinemas(response.data)
      setFilteredCinemas(response.data)
    } catch (err) {
      console.error('Ошибка при загрузке кинотеатров для фильма', err)
    } finally {
      setCinemasLoading(false)
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const parseCoordinates = (coordString) => {
    if (!coordString) return null
    const match = String(coordString).match(/POINT\(([\d.]+)\s+([\d.]+)\)/)
    if (match) {
      return {
        longitude: parseFloat(match[1]),
        latitude: parseFloat(match[2])
      }
    }
    return null
  }

  useEffect(() => {
    let updated = cinemas.map((cinema) => {
      const coords = parseCoordinates(cinema.coordinates)
      let distance = null
      if (coords && userLocation) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          coords.latitude,
          coords.longitude
        )
      }
      return { ...cinema, distance }
    })

    if (cinemaSearch.trim()) {
      const q = cinemaSearch.toLowerCase()
      updated = updated.filter((cinema) =>
        (cinema.name && cinema.name.toLowerCase().includes(q)) ||
        (cinema.address && cinema.address.toLowerCase().includes(q))
      )
    }

    updated.sort((a, b) => {
      if (a.distance == null && b.distance == null) return a.name.localeCompare(b.name)
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })

    setFilteredCinemas(updated)
  }, [cinemas, userLocation, cinemaSearch])

  const handleLocationChange = (location, address) => {
    setUserLocation(location)
    setUserAddress(address)
  }

  const handleCinemaSelect = (cinemaId) => {
    setSelectedCinemaId(cinemaId)
  }

  const selectedCinema = filteredCinemas.find(c => c.id === selectedCinemaId) || null

  if (loading && !film) {
    return <div className="loading">Загрузка информации о фильме...</div>
  }

  if (error || !film) {
    return <div className="error">{error || 'Фильм не найден'}</div>
  }

  return (
    <div className="film-details-page">
      <div className="container">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Назад
        </button>

        <div className="film-header">
          <div className="film-poster-section">
            {film.posterUrl ? (
              <img
                src={film.posterUrl}
                alt={film.title}
                className="film-poster-large"
                onError={(e) => {
                  e.target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23e5e7eb" width="300" height="450"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет постера%3C/text%3E%3C/svg%3E'
                }}
              />
            ) : (
              <div className="film-poster-placeholder">Нет постера</div>
            )}
          </div>

          <div className="film-main-info">
            <h1 className="film-title">{film.title}</h1>

            {film.rating > 0 && (
              <div className="film-rating-section">
                <div className="rating-badge">
                  <span className="rating-star">⭐</span>
                  <span className="rating-value">{film.rating.toFixed(1)}</span>
                </div>
              </div>
            )}

            {film.description && (
              <div className="film-description">
                <h3>Краткое описание</h3>
                <p>{film.description}</p>
              </div>
            )}

            <div className="film-details-grid">
              {film.director && (
                <div className="detail-item">
                  <span className="detail-label">Режиссер:</span>
                  <span className="detail-value">{film.director}</span>
                </div>
              )}

              {film.releaseDate && (
                <div className="detail-item">
                  <span className="detail-label">Дата выхода:</span>
                  <span className="detail-value">
                    {new Date(film.releaseDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}

              {film.duration && (
                <div className="detail-item">
                  <span className="detail-label">Длительность:</span>
                  <span className="detail-value">{film.duration} мин</span>
                </div>
              )}

              {film.genres && film.genres.length > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Жанры:</span>
                  <span className="detail-value">
                    {film.genres.join(', ')}
                  </span>
                </div>
              )}

              {film.actors && film.actors.length > 0 && (
                <div className="detail-item full-width">
                  <span className="detail-label">Актеры:</span>
                  <span className="detail-value">
                    {film.actors.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="cinemas-section">
          <h2 className="section-title">Где посмотреть этот фильм</h2>

          <LocationSelector
            onLocationChange={handleLocationChange}
            currentAddress={userAddress}
          />

          <div className="cinema-filters">
            <input
              type="text"
              placeholder="Фильтр по названию или адресу кинотеатра"
              value={cinemaSearch}
              onChange={(e) => setCinemaSearch(e.target.value)}
            />
          </div>

          {cinemasLoading ? (
            <div className="loading">Загрузка кинотеатров...</div>
          ) : filteredCinemas.length === 0 ? (
            <p className="no-cinemas-for-film">
              Для этого фильма пока не привязаны кинотеатры.
            </p>
          ) : (
            <div className="cinema-carousel">
              <div className="cinema-cards-row">
                {filteredCinemas.map((cinema) => (
                  <div
                    key={cinema.id}
                    className={`cinema-mini-card ${
                      selectedCinemaId === cinema.id ? 'active' : ''
                    }`}
                  >
                    <div className="cinema-mini-info">
                      <h3 className="cinema-mini-name">{cinema.name}</h3>
                      <p className="cinema-mini-address">{cinema.address}</p>
                      {cinema.distance != null && userLocation && (
                        <p className="cinema-mini-distance">
                          Расстояние:{' '}
                          {cinema.distance < 1
                            ? `${Math.round(cinema.distance * 1000)} м`
                            : `${cinema.distance.toFixed(1)} км`}
                        </p>
                      )}
                    </div>
                    <button
                      className="route-btn"
                      onClick={() => handleCinemaSelect(cinema.id)}
                    >
                      Как добраться
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCinema && (
            <div className="route-map-section">
              <h3 className="route-section-title">Маршрут до кинотеатра</h3>
              <div className="map-container">
                <div className="map-placeholder route-map-placeholder">
                  <p>Карта маршрута будет здесь</p>
                  <p className="map-note">
                    От:{' '}
                    <strong>{userAddress || 'ваш текущий адрес (нужно указать)'}</strong>
                  </p>
                  <p className="map-note">
                    До:{' '}
                    <strong>{selectedCinema.name}, {selectedCinema.address}</strong>
                  </p>
                  <p className="map-note">
                    Здесь можно будет отобразить маршрут от пользователя до выбранного кинотеатра через стороннее API карт.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="map-section">
          <h2 className="section-title">Места съемок</h2>
          <div className="map-container">
            <div className="map-placeholder">
              <p>Карта будет здесь</p>
              <p className="map-note">Показывает места, где был снят фильм</p>
            </div>
          </div>
        </div>

        <div className="facts-section">
          <h2 className="section-title">Интересные факты</h2>
          <div className="facts-placeholder">
            <p>Интересные факты о фильме будут здесь</p>
            <p className="facts-note">
              Здесь можно добавить информацию о съемках, актерах, режиссере и
              других интересных деталях
            </p>
          </div>
        </div>

        <div className="ratings-section">
          <h2 className="section-title">Рейтинги</h2>
          <div className="ratings-placeholder">
            <p>Рейтинги фильма будут здесь</p>
            <p className="ratings-note">
              Здесь можно отобразить рейтинги с различных платформ (IMDb,
              Кинопоиск, Rotten Tomatoes и т.д.)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilmDetailsPage
