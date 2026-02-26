import React, { useState, useEffect } from 'react'
import '../styles/LocationSelector.css'

function LocationSelector({ onLocationChange, currentAddress }) {
  const [address, setAddress] = useState(currentAddress || '')
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null)

  useEffect(() => {
    const savedAddress = localStorage.getItem('userAddress')
    const savedLocation = localStorage.getItem('userLocation')
    if (savedAddress) {
      setAddress(savedAddress)
    }
    if (savedLocation) {
      try {
        const loc = JSON.parse(savedLocation)
        setLocation(loc)
        if (onLocationChange) {
          onLocationChange(loc, savedAddress)
        }
      } catch (e) {
        console.error('Error parsing saved location:', e)
      }
    }
  }, [])

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
        localStorage.setItem('userAddress', addressText)
        localStorage.setItem('userLocation', JSON.stringify(loc))

        if (onLocationChange) {
          onLocationChange(loc, addressText)
        }
      } catch (err) {
        const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        setAddress(coordAddress)
        localStorage.setItem('userAddress', coordAddress)
        localStorage.setItem('userLocation', JSON.stringify(loc))

        if (onLocationChange) {
          onLocationChange(loc, coordAddress)
        }
      }
    } catch (err) {
      console.error('Detect location error:', err)
      setError('Не удалось определить местоположение. Попробуйте позже или введите адрес вручную.')
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

  const handleAddressChange = (e) => {
    const newAddress = e.target.value
    setAddress(newAddress)
    localStorage.setItem('userAddress', newAddress)

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
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
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

      if (Array.isArray(results) && results.length > 0) {
        const best = results[0]
        const lat = parseFloat(best.lat)
        const lon = parseFloat(best.lon)

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          throw new Error('Invalid coordinates from geocoder')
        }

        const loc = {
          latitude: lat,
          longitude: lon
        }

        setLocation(loc)
        localStorage.setItem('userAddress', address)
        localStorage.setItem('userLocation', JSON.stringify(loc))

        if (onLocationChange) {
          onLocationChange(loc, address)
        }
      } else {
        setError('Адрес не найден. Попробуйте другой вариант.')
      }
    } catch (err) {
      setError('Ошибка при поиске адреса')
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
