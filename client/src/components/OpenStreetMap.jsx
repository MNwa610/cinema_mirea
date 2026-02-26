import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import '../styles/OpenStreetMap.css'

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

let leafletLoadingPromise = null

function loadLeaflet() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is undefined'))
  }

  if (window.L) {
    return Promise.resolve(window.L)
  }

  if (!leafletLoadingPromise) {
    leafletLoadingPromise = new Promise((resolve, reject) => {
      const existingCss = document.querySelector('link[data-leaflet-css]')
      if (!existingCss) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = LEAFLET_CSS
        link.dataset.leafletCss = 'true'
        document.head.appendChild(link)
      }

      const existingJs = document.querySelector('script[data-leaflet-js]')
      if (existingJs) {
        existingJs.addEventListener('load', () => {
          if (window.L) {
            resolve(window.L)
          } else {
            reject(new Error('Leaflet не инициализировался'))
          }
        })
        existingJs.addEventListener('error', () =>
          reject(new Error('Не удалось загрузить скрипт Leaflet'))
        )
        return
      }

      const script = document.createElement('script')
      script.src = LEAFLET_JS
      script.async = true
      script.dataset.leafletJs = 'true'
      script.onload = () => {
        if (window.L) {
          resolve(window.L)
        } else {
          reject(new Error('Leaflet не инициализировался'))
        }
      }
      script.onerror = () =>
        reject(new Error('Не удалось загрузить скрипт Leaflet'))

      document.head.appendChild(script)
    })
  }

  return leafletLoadingPromise
}

function OpenStreetMap({ from, to, markers = [], showRoute = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const routeLayerRef = useRef(null)
  const markersLayerRef = useRef(null)
  const fromMarkerRef = useRef(null)
  const toMarkerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const initMap = async () => {
      try {
        if (!containerRef.current) return

        const L = await loadLeaflet()
        if (!L || !containerRef.current || cancelled) return

        if (!mapRef.current) {
          const defaultCenter = [55.751244, 37.618423] // Москва
          mapRef.current = L.map(containerRef.current).setView(defaultCenter, 12)

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }).addTo(mapRef.current)
        }

        const map = mapRef.current

        if (fromMarkerRef.current) {
          map.removeLayer(fromMarkerRef.current)
          fromMarkerRef.current = null
        }
        if (toMarkerRef.current) {
          map.removeLayer(toMarkerRef.current)
          toMarkerRef.current = null
        }
        if (routeLayerRef.current) {
          map.removeLayer(routeLayerRef.current)
          routeLayerRef.current = null
        }
        if (markersLayerRef.current) {
          map.removeLayer(markersLayerRef.current)
          markersLayerRef.current = null
        }

        const layersToFit = []

        if (Array.isArray(markers) && markers.length > 0) {
          const group = L.layerGroup()
          markers.forEach((m) => {
            if (m.latitude == null || m.longitude == null) return
            const marker = L.circleMarker([m.latitude, m.longitude], {
              radius: 6,
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 0.9
            })
            if (m.name || m.description) {
              const title = m.name || 'Локация'
              const desc = m.description ? `<br/>${m.description}` : ''
              marker.bindPopup(`${title}${desc}`)
            }
            marker.addTo(group)
          })
          group.addTo(map)
          markersLayerRef.current = group
          layersToFit.push(group)
        }

        let routePoints = []

        if (from && from.latitude != null && from.longitude != null) {
          const fromMarker = L.circleMarker([from.latitude, from.longitude], {
            radius: 7,
            color: '#16a34a',
            fillColor: '#22c55e',
            fillOpacity: 0.9
          })
          fromMarker.bindPopup('Ваше местоположение')
          fromMarker.addTo(map)
          fromMarkerRef.current = fromMarker
          layersToFit.push(fromMarker)
          routePoints.push([from.latitude, from.longitude])
        }

        if (to && to.latitude != null && to.longitude != null) {
          const toMarker = L.circleMarker([to.latitude, to.longitude], {
            radius: 7,
            color: '#dc2626',
            fillColor: '#ef4444',
            fillOpacity: 0.9
          })
          toMarker.bindPopup('Кинотеатр')
          toMarker.addTo(map)
          toMarkerRef.current = toMarker
          layersToFit.push(toMarker)
          routePoints.push([to.latitude, to.longitude])
        }

        if (showRoute && from && to) {
          try {
            const resp = await axios.get('/api/routing/route', {
              params: {
                fromLat: from.latitude,
                fromLon: from.longitude,
                toLat: to.latitude,
                toLon: to.longitude,
                profile: 'driving'
              }
            })

            const coords = resp.data?.coordinates || []
            if (coords.length > 0) {
              const polyline = L.polyline(coords, {
                color: '#2563eb',
                weight: 5,
                opacity: 0.9
              })
              polyline.addTo(map)
              routeLayerRef.current = polyline
              layersToFit.push(polyline)
              routePoints = coords
            }
          } catch (e) {
            console.error('Ошибка построения маршрута через OSRM/GraphHopper:', e)
            setError('Не удалось построить маршрут')
          }
        }

        const allPoints = []

        if (routePoints.length > 0) {
          allPoints.push(...routePoints)
        }
        if (Array.isArray(markers)) {
          markers.forEach((m) => {
            if (m.latitude != null && m.longitude != null) {
              allPoints.push([m.latitude, m.longitude])
            }
          })
        }

        if (allPoints.length > 0) {
          const bounds = L.latLngBounds(allPoints)
          map.fitBounds(bounds, { padding: [32, 32] })
        } else if (from && from.latitude != null && from.longitude != null) {
          map.setView([from.latitude, from.longitude], 13)
        } else if (to && to.latitude != null && to.longitude != null) {
          map.setView([to.latitude, to.longitude], 13)
        }
      } catch (e) {
        console.error('OpenStreetMap init error:', e)
        setError(e?.message || 'Не удалось инициализировать карту OpenStreetMap')
      }
    }

    initMap()

    return () => {
      cancelled = true
    }
  }, [from, to, JSON.stringify(markers), showRoute])

  return (
    <div className="osm-map-wrapper">
      {error && <div className="map-error">{error}</div>}
      <div ref={containerRef} className="osm-map" />
    </div>
  )
}

export default OpenStreetMap

