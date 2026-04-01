export function bookingStorageKey(sessionKey) {
  return `booking:${sessionKey}`
}

export function loadBooking(sessionKey) {
  try {
    const raw = localStorage.getItem(bookingStorageKey(sessionKey))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
      localStorage.removeItem(bookingStorageKey(sessionKey))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveBooking(sessionKey, booking) {
  localStorage.setItem(bookingStorageKey(sessionKey), JSON.stringify(booking))
}

