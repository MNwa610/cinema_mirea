import React, { useState, useEffect } from 'react'
import '../styles/LocationSelector.css'

function LocationSelector({ onLocationChange, currentAddress }) {
  const [address, setAddress] = useState(currentAddress || '')
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null)
  const isAuthenticated = Boolean(localStorage.getItem('token'))

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem('userAddress')
      localStorage.removeItem('userLocation')
      setAddress('')
      setLocation(null)
      return
    }

    const savedAddress = localStorage.getItem('userAddress')
    const savedLocation = localStorage.getItem('userLocation')
    const initialAddress = savedAddress || ''
    if (savedAddress) setAddress(savedAddress)

    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation)
        const loc = parsed
        ?{
          latitude: parsed.latitude,
          longitude: parsed.longitude
        }
        : null
        if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) {
          detectLocation()
          return
        }

        setLocation(loc)
        if (onLocationChange) onLocationChange(loc, initialAddress)
      } catch (e) {
        console.error('Error parsing saved location:', e)
        detectLocation()
      }
    } else {
      detectLocation()
    }
  }, [isAuthenticated])

  const detectLocation = async () => {
    setIsDetecting(true)
    setError('')

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported')
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      })

      const latitude = position.coords.latitude
      const longitude = position.coords.longitude

      const loc = { latitude, longitude }
      setLocation(loc)

      try {
        const addressText = await reverseGeocode(latitude, longitude)
        setAddress(addressText)
        if (isAuthenticated) {
          localStorage.setItem('userAddress', addressText)
          localStorage.setItem('userLocation', JSON.stringify(loc))
        }

        if (onLocationChange) {
          onLocationChange(loc, addressText)
        }
      } catch (err) {
        const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        setAddress(coordAddress)
        if (isAuthenticated) {
          localStorage.setItem('userAddress', coordAddress)
          localStorage.setItem('userLocation', JSON.stringify(loc))
        }

        if (onLocationChange) {
          onLocationChange(loc, coordAddress)
        }
      }
    } catch (err) {
      console.error('Detect location error:', err)
      const registeredAddress = getRegisteredAddress()
      if (isAuthenticated && registeredAddress) {
        try {
          const loc = await geocodeAddress(registeredAddress)
          setAddress(registeredAddress)
          setLocation(loc)
          localStorage.setItem('userAddress', registeredAddress)
          localStorage.setItem('userLocation', JSON.stringify(loc))
          if (onLocationChange) onLocationChange(loc, registeredAddress)
          setError('')
          return
        } catch (fallbackErr) {
          console.error('Fallback geocoding by profile address failed:', fallbackErr)
        }
      }

      if (err?.code === 1) {
        setError('Доступ к геолокации запрещен. Разрешите в настройках браузера и попробуйте снова.')
      } else if (err?.code === 2) {
        setError('Не удалось получить геолокацию. Попробуйте позже или введите адрес вручную.')
      } else if (err?.code === 3) {
        setError('Превышено время ожидания геолокации. Попробуйте снова.')
      } else {
        setError('Не удалось определить местоположение. Попробуйте позже или введите адрес вручную.')
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'ru'
        }
      })
      if (!response.ok) {
        throw new Error('Reverse geocode failed')
      }
      const data = await response.json()
      if (data.display_name) {
        return data.display_name
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch (err) {
      console.error('Reverse geocoding error (OSM Nominatim):', err)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }

  const geocodeAddress = async (addressText) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      addressText
    )}&limit=1&accept-language=ru`
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'ru'
      }
    })
    if (!response.ok) {
      throw new Error('Geocode failed')
    }
    const results = await response.json()
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Address not found')
    }
    const best = results[0]
    const lat = parseFloat(best.lat)
    const lon = parseFloat(best.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error('Invalid coordinates from geocoder')
    }
    return { latitude: lat, longitude: lon }
  }

  const getRegisteredAddress = () => {
    try {
      const rawUser = localStorage.getItem('user')
      if (!rawUser) return ''
      const parsedUser = JSON.parse(rawUser)
      return parsedUser?.address?.trim?.() || ''
    } catch {
      return ''
    }
  }

  const handleAddressChange = (e) => {
    const newAddress = e.target.value
    setAddress(newAddress)
    if (isAuthenticated) {
      localStorage.setItem('userAddress', newAddress)
    }

    if (onLocationChange && location) {
      onLocationChange(location, newAddress)
    }
  }

  const handleManualSubmit = async () => {
    if (!address.trim()) {
      setError('Введите адрес')
      return
    }

    setIsDetecting(true)
    setError('')

    try {
      const loc = await geocodeAddress(address)
      setLocation(loc)
      if (isAuthenticated) {
        localStorage.setItem('userAddress', address)
        localStorage.setItem('userLocation', JSON.stringify(loc))
      }
      if (onLocationChange) {
        onLocationChange(loc, address)
      }
    } catch (err) {
      setError('Адрес не найден. Попробуйте другой вариант.')
      console.error('Geocoding error (OSM Nominatim):', err)
    } finally {
      setIsDetecting(false)
    }
  }

  return (
    <div className="location-selector">
      <div className="location-header">
        <h3>Ваше местоположение</h3>
        <button
          onClick={detectLocation}
          disabled={isDetecting}
          className="detect-btn"
        >
          {isDetecting ? 'Определение...' : 'Определить автоматически'}
        </button>
      </div>

      <div className="location-input-section">
        <div className="input-group">
          <label htmlFor="address-input">Или введите адрес вручную:</label>
          <div className="input-with-button">
            <input
              id="address-input"
              type="text"
              value={address}
              onChange={handleAddressChange}
              placeholder="Например: Москва, ул. Тверская, д. 1"
              className="address-input"
            />
            <button
              onClick={handleManualSubmit}
              disabled={isDetecting || !address.trim()}
              className="submit-address-btn"
            >
              Найти
            </button>
          </div>
        </div>
      </div>

      {error && <div className="location-error">{error}</div>}

      {location && (
        <div className="location-info">
          <span className="location-status">✓ Местоположение определено</span>
          {address && <span className="location-address">{address}</span>}
        </div>
      )}
    </div>
  )
}

export default LocationSelector
