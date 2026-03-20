import React, { useEffect, useRef, useState } from 'react'
import '../styles/OpenStreetMap.css'

const YANDEX_API_KEY = '26fd6588-2b02-4653-8b03-2c37c46d4118'
const YANDEX_MAPS_URL = (apiKey) =>
  `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`

let scriptLoadingPromise = null

function loadYandexMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'))

  if (window.ymaps) {
    return Promise.resolve(window.ymaps)
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-yandex-maps]')
      if (existing) {
        existing.addEventListener('load', () => {
          if (window.ymaps) {
            window.ymaps.ready(() => resolve(window.ymaps))
          } else {
            reject(new Error('ymaps не инициализировался'))
          }
        })
        existing.addEventListener('error', () =>
          reject(new Error('Не удалось загрузить скрипт Яндекс.Карт'))
        )
        return
      }

      const script = document.createElement('script')
      script.src = YANDEX_MAPS_URL(YANDEX_API_KEY)
      script.async = true
      script.dataset.yandexMaps = 'true'
      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => resolve(window.ymaps))
        } else {
          reject(new Error('ymaps не инициализировался'))
        }
      }
      script.onerror = () =>
        reject(new Error('Не удалось загрузить скрипт Яндекс.Карт'))

      document.head.appendChild(script)
    })
  }

  return scriptLoadingPromise
}

/**
 * Универсальная карта Яндекса.
 * Может:
 * - строить маршрут между from и to (через ymaps.route)
 * - показывать произвольные маркеры (например, места съемок)
 *
 * from / to имеют формат { latitude, longitude }
 * markers: [{ id, name, description?, latitude, longitude }]
 */
function YandexMap({ from, to, markers = [], showRoute = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let destroyed = false

    const init = async () => {
      try {
        if (!containerRef.current) return

        const ymaps = await loadYandexMaps()
        if (destroyed || !containerRef.current) return

        if (!mapRef.current) {
          const defaultCenter = [55.751244, 37.618423] // Москва
          mapRef.current = new ymaps.Map(containerRef.current, {
            center: defaultCenter,
            zoom: 10,
            controls: ['zoomControl', 'fullscreenControl']
          })
        }

        const map = mapRef.current
        map.geoObjects.removeAll()

        const geoPoints = []

        // Маркеры мест съемок (или любых точек)
        if (Array.isArray(markers) && markers.length > 0) {
          markers.forEach((m) => {
            const lat = Number(from?.m.latitude)
            const lng = Number(from?.m.longitude)
            if(!Number.isFinite(lat) || !Number.isFinite(lng)) return
            const point = [lat, lng]
            const placemark = new ymaps.Placemark(
              point,
              {
                hintContent: m.name || 'Локация',
                balloonContent: m.description || m.name || ''
              },
              {
                preset: 'islands#blueDotIcon'
              }
            )
            map.geoObjects.add(placemark)
            geoPoints.push(point)
          })
        }

        let fromPoint = null
        let toPoint = null

        const fromLat = Number(from?.latitude)
        const fromLng = Number(from?.longitude)
        if (Number.isFinite(fromLat) && Number.isFinite(fromLng)) {
          fromPoint = [fromLat, fromLng]
          const fromPlacemark = new ymaps.Placemark(
            fromPoint,
            {
              hintContent: 'Ваше местоположение',
              balloonContent: 'Ваше местоположение'
            },
            {
              preset: 'islands#greenDotIcon'
            }
          )
          map.geoObjects.add(fromPlacemark)
          geoPoints.push(fromPoint)
        }

        const toLat = Number(to?.latitude)
        const toLng = Number(to?.longitude)
        if (Number.isFinite(toLat) && Number.isFinite(toLng)) {
          toPoint = [toLat, toLng]
          const toPlacemark = new ymaps.Placemark(
            toPoint,
            {
              hintContent: 'Кинотеатр',
              balloonContent: 'Кинотеатр'
            },
            {
              preset: 'islands#redDotIcon'
            }
          )
          map.geoObjects.add(toPlacemark)
          geoPoints.push(toPoint)
        }

        if (showRoute && fromPoint && toPoint) {
          ymaps
            .route([fromPoint, toPoint])
            .then((route) => {
              if (destroyed) return
              map.geoObjects.add(route)
              const bounds = route.getBounds()
              if (bounds) {
                map.setBounds(bounds, {
                  checkZoomRange: true,
                  zoomMargin: 40
                })
              }
            })
            .catch((e) => {})
        } else if (geoPoints.length > 0) {
          const bounds = ymaps.util.bounds.fromPoints(geoPoints)
          map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 })
        } else {
          // Нет точек — просто центр по умолчанию
          map.setCenter([55.751244, 37.618423], 10)
        }
      } catch (e) {
        console.error('Yandex Maps init error:', e)
        setError(
          e?.message ||
            'Не удалось инициализировать Яндекс.Карты. Проверьте подключение к API.'
        )
      }
    }

    init()

    return () => {
      destroyed = true
    }
  }, [from, to, JSON.stringify(markers), showRoute])

  return (
    <div className="osm-map-wrapper">
      {error && <div className="map-error">{error}</div>}
      <div
        ref={containerRef}
        className="osm-map"
      />
    </div>
  )
}

export default YandexMap

