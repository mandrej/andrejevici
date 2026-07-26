/**
 * Solar position and sunrise/sunset calculation helpers.
 */

// Default coordinates (Andrejevići / Belgrade, Serbia region)
export const DEFAULT_LATITUDE = 44.8176
export const DEFAULT_LONGITUDE = 20.4633

export interface SolarTimes {
  sunrise: Date
  sunset: Date
}

/**
 * Returns the day of the year (1-366) for a given Date.
 */

export const getDayOfYear = (d: Date): number => {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff =
    d.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * Calculates sunrise and sunset Date objects for a given date and location.
 * Uses official solar zenith (90.833°).
 *
 * @param date Target date (defaults to current date)
 * @param lat Latitude in degrees (defaults to 44.8176)
 * @param lng Longitude in degrees (defaults to 20.4633)
 */
export function getSunriseSunset(
  date: Date = new Date(),
  lat: number = DEFAULT_LATITUDE,
  lng: number = DEFAULT_LONGITUDE,
): SolarTimes {
  const rad = Math.PI / 180
  const deg = 180 / Math.PI

  const N = getDayOfYear(date)
  const zenith = 90.833 // Official sunrise/sunset zenith angle

  const lngHour = lng / 15

  const calculateTime = (isSunrise: boolean): Date => {
    const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24

    // Sun's mean anomaly
    const M = 0.9856 * t - 3.289
    const Mr = M * rad

    // Sun's true longitude
    let L = M + 1.916 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 282.634
    L = ((L % 360) + 360) % 360
    const Lr = L * rad

    // Sun's right ascension
    let RA = Math.atan(0.91764 * Math.tan(Lr)) * deg
    RA = ((RA % 360) + 360) % 360

    const Lquadrant = Math.floor(L / 90) * 90
    const RAquadrant = Math.floor(RA / 90) * 90
    RA = (RA + (Lquadrant - RAquadrant)) / 15

    // Sun's declination
    const sinDec = 0.39782 * Math.sin(Lr)
    const cosDec = Math.cos(Math.asin(sinDec))

    // Sun's local hour angle
    const cosH =
      (Math.cos(zenith * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad))

    if (cosH > 1) {
      // Sun never rises (polar night)
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
    }
    if (cosH < -1) {
      // Sun never sets (midnight sun)
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
    }

    let H = isSunrise ? 360 - Math.acos(cosH) * deg : Math.acos(cosH) * deg
    H = H / 15

    // Local mean time
    const T = H + RA - 0.06571 * t - 6.622

    // Adjust to UTC
    let UT = T - lngHour
    UT = ((UT % 24) + 24) % 24

    const hours = Math.floor(UT)
    const minutes = Math.floor((UT - hours) * 60)
    const seconds = Math.floor(((UT - hours) * 60 - minutes) * 60)

    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds),
    )
  }

  return {
    sunrise: calculateTime(true),
    sunset: calculateTime(false),
  }
}

/**
 * Returns stored location or defaults.
 */
export function getSavedLocation(): { lat: number; lng: number } {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const lat = parseFloat(sessionStorage.getItem('user_lat') || '')
    const lng = parseFloat(sessionStorage.getItem('user_lng') || '')
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng }
    }
  }
  return { lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE }
}

/**
 * Attempts to request user location in browser asynchronously.
 * Stores result in sessionStorage if granted.
 */
export function requestUserLocation(onUpdated?: () => void): void {
  if (typeof window === 'undefined' || !navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      try {
        sessionStorage.setItem('user_lat', pos.coords.latitude.toString())
        sessionStorage.setItem('user_lng', pos.coords.longitude.toString())
        if (onUpdated) onUpdated()
      } catch {
        // Storage access may be blocked
      }
    },
    () => {
      // User denied or error - use default coordinates silently
    },
    { timeout: 10000, maximumAge: 3600000 },
  )
}

/**
 * Determines if the current time (or given date) is night (between sunset and sunrise).
 *
 * @param date Target date (defaults to current date)
 * @param lat Latitude (defaults to saved/default latitude)
 * @param lng Longitude (defaults to saved/default longitude)
 */
export function isNightTime(
  date: Date = new Date(),
  lat?: number,
  lng?: number,
): boolean {
  const loc = lat !== undefined && lng !== undefined ? { lat, lng } : getSavedLocation()
  const { sunrise, sunset } = getSunriseSunset(date, loc.lat, loc.lng)
  const time = date.getTime()
  return time < sunrise.getTime() || time >= sunset.getTime()
}

/**
 * Calculates the duration (in milliseconds) until the next sunrise or sunset transition.
 */
export function getNextSunTransitionDelay(
  date: Date = new Date(),
  lat?: number,
  lng?: number,
): number {
  const loc = lat !== undefined && lng !== undefined ? { lat, lng } : getSavedLocation()
  const { sunrise, sunset } = getSunriseSunset(date, loc.lat, loc.lng)
  const now = date.getTime()

  if (now < sunrise.getTime()) {
    return sunrise.getTime() - now
  } else if (now < sunset.getTime()) {
    return sunset.getTime() - now
  } else {
    // Next event is tomorrow's sunrise
    const tomorrow = new Date(date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const { sunrise: nextSunrise } = getSunriseSunset(tomorrow, loc.lat, loc.lng)
    return nextSunrise.getTime() - now
  }
}
