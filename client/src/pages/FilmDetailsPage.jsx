import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import LocationSelector from '../components/LocationSelector'
import OpenStreetMap from '../components/OpenStreetMap'
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

  const [facts, setFacts] = useState([])
  const [factsLoading, setFactsLoading] = useState(true)
  const [factsError, setFactsError] = useState('')

  const [filmLocations, setFilmLocations] = useState([])
  const [filmLocationsLoading, setFilmLocationsLoading] = useState(true)
  const [filmLocationsError, setFilmLocationsError] = useState('')

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchFilm(),
        fetchCinemas(),
        fetchFacts(),
        fetchFilmLocations(),
        fetchReviews()
      ])
      setLoading(false)
    }

    fetchData()
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

  const fetchFacts = async () => {
    try {
      setFactsLoading(true)
      setFactsError('')
      const response = await axios.get(`/api/film/external/${filmId}/facts`)

      const items = Array.isArray(response.data?.items)
        ? response.data.items
        : Array.isArray(response.data)
        ? response.data
        : []

      const normalized = items
        .map((item, index) => ({
          id: item?.id ?? index,
          text: item?.text || '',
          spoiler: Boolean(item?.spoiler)
        }))
        .filter((f) => f.text && typeof f.text === 'string')

      setFacts(normalized)
    } catch (err) {
      console.error('Ошибка при загрузке фактов о фильме', err)
      setFactsError('Не удалось загрузить факты о фильме с Кинопоиска')
    } finally {
      setFactsLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      setReviewsError('')

      const response = await axios.get(`/api/film/external/${filmId}/reviews`)

      const items = Array.isArray(response.data?.items)
        ? response.data.items
        : Array.isArray(response.data)
        ? response.data
        : []

      const normalized = items
        .map((item, index) => ({
          id: item?.reviewId ?? item?.id ?? index,
          title: item?.title || '',
          text: item?.description || item?.review || '',
          author: item?.author || 'Аноним',
          type: item?.type || '',
          date: item?.date || null
        }))
        .filter((r) => r.text && typeof r.text === 'string')

      setReviews(normalized)
    } catch (err) {
      console.error('Ошибка при загрузке отзывов о фильме', err)
      setReviewsError('Не удалось загрузить отзывы о фильме с Кинопоиска')
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchFilmLocations = async () => {
    try {
      setFilmLocationsLoading(true)
      setFilmLocationsError('')

      const response = await axios.get(`/api/film/${filmId}/locations`)
      const items = Array.isArray(response.data) ? response.data : []

      const normalized = items
        .map((item, index) => ({
          id: item?.id ?? index,
          name: item?.name || 'Локация съемок',
          description: item?.description || '',
          latitude: item?.latitude,
          longitude: item?.longitude
        }))
        .filter(
          (loc) =>
            loc.latitude != null &&
            loc.longitude != null &&
            Number.isFinite(Number(loc.latitude)) &&
            Number.isFinite(Number(loc.longitude))
        )

      setFilmLocations(normalized)
    } catch (err) {
      console.error('Ошибка при загрузке локаций съемок фильма', err)
      setFilmLocationsError('Не удалось загрузить локации съемок фильма')
    } finally {
      setFilmLocationsLoading(false)
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
  const selectedCinemaCoords = selectedCinema ? parseCoordinates(selectedCinema.coordinates) : null

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
                {!userLocation || !selectedCinemaCoords ? (
                  <div className="map-placeholder route-map-placeholder">
                    <p>Укажите свое местоположение, чтобы построить маршрут</p>
                    <p className="map-note">
                      Сначала задайте адрес в блоке «Ваше местоположение» выше, затем выберите кинотеатр.
                    </p>
                  </div>
                ) : (
                  <OpenStreetMap
                    from={userLocation}
                    to={selectedCinemaCoords}
                    showRoute
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="map-section">
          <h2 className="section-title">Места съемок</h2>
          <div className="map-container">
            {filmLocationsLoading ? (
              <div className="loading">Загрузка локаций съемок...</div>
            ) : filmLocationsError ? (
              <div className="map-error">{filmLocationsError}</div>
            ) : filmLocations.length ? (
              <OpenStreetMap markers={filmLocations} />
            ) : (
              <OpenStreetMap />
            )}
          </div>
        </div>

        <div className="facts-section">
          <h2 className="section-title">Интересные факты (Кинопоиск)</h2>
          {factsLoading ? (
            <div className="loading">Загрузка фактов о фильме...</div>
          ) : factsError ? (
            <div className="facts-error">{factsError}</div>
          ) : !facts.length ? (
            <div className="facts-empty">
              Для этого фильма пока нет фактов с Кинопоиска.
            </div>
          ) : (
            <ul className="facts-list">
              {facts.map((fact) => (
                <li
                  key={fact.id}
                  className={`fact-item ${fact.spoiler ? 'fact-item--spoiler' : ''}`}
                >
                  {fact.spoiler && (
                    <span className="fact-spoiler-label">Спойлер</span>
                  )}
                  <div
                    className="fact-text"
                    dangerouslySetInnerHTML={{ __html: fact.text }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ratings-section">
          <h2 className="section-title">Рейтинги и отзывы</h2>
          <div className="ratings-content">
            {film.rating > 0 && (
              <div className="rating-summary">
                <div className="rating-badge">
                  <span className="rating-star">⭐</span>
                  <span className="rating-value">{film.rating.toFixed(1)}</span>
                </div>
                <span className="rating-source">Рейтинг Кинопоиска</span>
              </div>
            )}

            <div className="reviews-block">
              <h3 className="reviews-title">Рецензии зрителей (Кинопоиск)</h3>
              {reviewsLoading ? (
                <div className="loading">Загрузка отзывов...</div>
              ) : reviewsError ? (
                <div className="reviews-error">{reviewsError}</div>
              ) : !reviews.length ? (
                <div className="reviews-empty">
                  Для этого фильма пока нет отзывов с Кинопоиска.
                </div>
              ) : (
                <ul className="reviews-list">
                  {reviews.slice(0, 5).map((review) => (
                    <li key={review.id} className="review-item">
                      <div className="review-header">
                        {review.title && (
                          <h4 className="review-title">{review.title}</h4>
                        )}
                        <div className="review-meta">
                          <span className="review-author">{review.author}</span>
                          {review.type && (
                            <span className={`review-type review-type--${review.type.toLowerCase()}`}>
                              {review.type === 'POSITIVE'
                                ? 'Положительный'
                                : review.type === 'NEGATIVE'
                                ? 'Отрицательный'
                                : 'Нейтральный'}
                            </span>
                          )}
                          {review.date && (
                            <span className="review-date">
                              {new Date(review.date).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="review-text">
                        {review.text.length > 500
                          ? `${review.text.slice(0, 500)}...`
                          : review.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilmDetailsPage
