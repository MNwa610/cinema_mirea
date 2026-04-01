const YANDEX_SUGGEST_API_KEY = '160b29e4-a6ff-47ad-9bb4-613bf2ef7aa4'

export async function fetchYandexSuggest(text) {
  const query = String(text || '').trim()
  if (!query) return []

  const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${encodeURIComponent(
    YANDEX_SUGGEST_API_KEY
  )}&text=${encodeURIComponent(query)}&lang=ru_RU&results=7`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Yandex suggest failed')
  }

  const data = await response.json()
  const results = Array.isArray(data?.results) ? data.results : []

  return results
    .map((item) => {
      const title = item?.title?.text || item?.title || ''
      const subtitle = item?.subtitle?.text || item?.subtitle || ''
      return [title, subtitle].filter(Boolean).join(', ').trim()
    })
    .filter(Boolean)
}
