export const PX_PER_MIN = 1.5
export const SNAP_MIN = 15
export const DAY_START_MIN = 360 // 06:00
export const DAY_END_MIN = 1440 // 24:00 (midnight)

/**
 * Convert minutes to pixels using the fixed scale.
 */
export function minutesToPx(min: number): number {
  return min * PX_PER_MIN
}

/**
 * Convert pixels back to minutes.
 */
export function pxToMinutes(px: number): number {
  return px / PX_PER_MIN
}

/**
 * Snap a minute value to the nearest SNAP_MIN (15-minute) boundary.
 */
export function snap(min: number): number {
  return Math.round(min / SNAP_MIN) * SNAP_MIN
}

/**
 * Parse an "HH:MM" string to minutes since midnight.
 */
export function timeToMin(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Format minutes since midnight as an "HH:MM" string.
 */
export function minToTime(min: number): string {
  const hours = Math.floor(min / 60)
  const minutes = min % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Clamp a minute value to the visible day range [DAY_START_MIN, DAY_END_MIN].
 */
export function clampToDay(min: number): number {
  return Math.min(Math.max(min, DAY_START_MIN), DAY_END_MIN)
}
