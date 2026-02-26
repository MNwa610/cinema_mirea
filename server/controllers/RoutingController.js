const fetch = global.fetch || require('node-fetch')

exports.getRoute = async (req, res) => {
  try {
    const { fromLat, fromLon, toLat, toLon, profile = 'driving' } = req.query

    const aLat = parseFloat(fromLat)
    const aLon = parseFloat(fromLon)
    const bLat = parseFloat(toLat)
    const bLon = parseFloat(toLon)

    if (
      !Number.isFinite(aLat) ||
      !Number.isFinite(aLon) ||
      !Number.isFinite(bLat) ||
      !Number.isFinite(bLon)
    ) {
      return res
        .status(400)
        .json({ message: 'fromLat, fromLon, toLat, toLon обязательны и должны быть числами' })
    }

    const useGraphHopper = !!process.env.GRAPHHOPPER_API_KEY

    let coordinates = null
    let distance = null
    let duration = null

    if (useGraphHopper) {
      const key = process.env.GRAPHHOPPER_API_KEY
      const url = `https://graphhopper.com/api/1/route?point=${aLat},${aLon}&point=${bLat},${bLon}&vehicle=car&locale=ru&points_encoded=false&key=${key}`

      const resp = await fetch(url)
      if (!resp.ok) {
        const text = await resp.text()
        console.error('GraphHopper error:', text)
      } else {
        const data = await resp.json()
        const path = Array.isArray(data?.paths) && data.paths[0]
        if (path?.points?.coordinates?.length) {
          coordinates = path.points.coordinates.map(([lon, lat]) => [lat, lon])
          distance = path.distance
          duration = path.time != null ? path.time / 1000 : null
        }
      }
    }

    // Если GraphHopper не сработал или не сконфигурирован — используем публичный OSRM
    if (!coordinates) {
      const osrmProfile = profile === 'bike' ? 'bike' : 'driving'
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${aLon},${aLat};${bLon},${bLat}?overview=full&geometries=geojson&language=ru`

      const resp = await fetch(url)
      if (!resp.ok) {
        const text = await resp.text()
        console.error('OSRM error:', text)
        return res
          .status(502)
          .json({ message: 'Ошибка при построении маршрута (OSRM)', details: text })
      }

      const data = await resp.json()
      const route = Array.isArray(data?.routes) && data.routes[0]
      if (!route || !route.geometry?.coordinates?.length) {
        return res.status(502).json({ message: 'Маршрут не найден' })
      }

      // OSRM отдает [lon, lat] — конвертируем в [lat, lon]
      coordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
      distance = route.distance
      duration = route.duration
    }

    return res.json({
      coordinates,
      distance,
      duration
    })
  } catch (error) {
    console.error('RoutingController.getRoute error:', error)
    res.status(500).json({ message: 'Ошибка при построении маршрута', error })
  }
}

