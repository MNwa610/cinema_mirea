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

  const detectLocation = () => {
    setIsDetecting(true)
    setError('')

    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером')
      setIsDetecting(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
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
        setIsDetecting(false)
      },
      (err) => {
        setError('Не удалось определить местоположение. Разрешите доступ к геолокации.')
        setIsDetecting(false)
        console.error('Geolocation error:', err)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const reverseGeocode = async (lat, lng) => {

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`,
        {
          headers: {
            'User-Agent': 'AfishaApp/1.0'
          }
        }
      )
      const data = await response.json()
      if (data.address) {
        const parts = []
        if (data.address.road) parts.push(data.address.road)
        if (data.address.house_number) parts.push(data.address.house_number)
        if (parts.length > 0) {
          return `${parts.join(' ')}, ${data.address.city || data.address.town || data.address.village || ''}`
        }
        return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch (err) {
      console.error('Reverse geocoding error:', err)
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
ё
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=ru`,
        {
          headers: {
            'User-Agent': 'AfishaApp/1.0'
          }
        }
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        const loc = { latitude: lat, longitude: lng }
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
      console.error('Geocoding error:', err)
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
