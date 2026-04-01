import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/ProfilePage.css'

function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [watchedFilms, setWatchedFilms] = useState([])
  const [watchedLoading, setWatchedLoading] = useState(true)
  const [deleteLoadingId, setDeleteLoadingId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/')
      return
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        setUser(res.data)
        setUsername(res.data.username || '')
        setAddress(res.data.address || '')
        setAvatarUrl(res.data.avatarUrl || '')
      } catch (e) {
        navigate('/')
      }
    }

    const fetchWatched = async () => {
      try {
        const res = await axios.get('/api/user/watched', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        setWatchedFilms(Array.isArray(res.data) ? res.data : [])
      } catch (e) {
        setWatchedFilms([])
      } finally {
        setWatchedLoading(false)
      }
    }

    fetchProfile()
    fetchWatched()
  }, [navigate])

  const handleSave = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = {
        username,
        address,
        avatarUrl
      }

      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      const res = await axios.patch('/api/user/profile/update', payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      setUser(res.data.user)
      setSuccess('Профиль успешно обновлен')
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при обновлении профиля')
    } finally {
      setSaving(false)
    }
  }

  const handleFilmClick = (filmId) => {
    navigate(`/film/${filmId}`)
  }

  const handleDeleteWatched = async (filmExternalId, e) => {
    if (e) e.stopPropagation()

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      setDeleteLoadingId(filmExternalId)
      await axios.delete(`/api/user/watched/${filmExternalId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      setWatchedFilms((prev) =>
        prev.filter((f) => String(f.kinopoiskId || f.id) !== String(filmExternalId))
      )
    } catch (err) {
      console.error('delete watched error:', err)
    } finally {
      setDeleteLoadingId(null)
    }
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading">Загрузка профиля...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Назад
        </button>

        <h1 className="page-title">Профиль</h1>

        <div className="profile-layout">
          <div className="profile-form-block">
            <h2>Настройки профиля</h2>
            <form onSubmit={handleSave}>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-group">
                <label>Имя пользователя</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" value={user.email} disabled />
              </div>

              <div className="form-group">
                <label>Адрес</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Например: Москва, ул. Тверская, д. 1"
                />
              </div>

              <div className="form-group">
                <label>URL аватарки</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Ссылка на изображение"
                />
              </div>

              <div className="form-group">
                <label>Текущий пароль (для смены пароля)</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                />
              </div>

              <div className="form-group">
                <label>Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Оставьте пустым, если не хотите менять"
                />
              </div>

              <button type="submit" className="submit-btn" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </form>
          </div>

          <div className="profile-watched-block">
            <h2>Просмотренные фильмы</h2>
            {watchedLoading ? (
              <div className="loading">Загрузка...</div>
            ) : watchedFilms.length === 0 ? (
              <p className="no-films">Вы еще не отмечали фильмы как просмотренные.</p>
            ) : (
              <div className="films-grid">
                {watchedFilms.map((film) => (
                  <div
                    key={film.id}
                    className="film-card"
                    onClick={() => handleFilmClick(film.kinopoiskId || film.id)}
                  >
                    <button
                      type="button"
                      className="watched-delete-btn"
                      onClick={(e) => handleDeleteWatched((film.kinopoiskId || film.id), e)}
                      disabled={deleteLoadingId != null && String(deleteLoadingId) === String(film.kinopoiskId || film.id)}
                      aria-label="Удалить из просмотренных"
                    >
                      {deleteLoadingId != null && String(deleteLoadingId) === String(film.kinopoiskId || film.id)
                        ? 'Удаляю...'
                        : 'Удалить'}
                    </button>
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
                      <h3 className="film-card-title">{film.title}</h3>
                      {film.rating > 0 && (
                        <div className="film-card-rating">
                          <span className="film-card-rating-label">Рейтинг:</span>
                          <span className="film-card-rating-value">
                            {Number(film.rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

