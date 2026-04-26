import { describe, it, expect } from 'vitest'
import {
  PX_PER_MIN,
  SNAP_MIN,
  DAY_START_MIN,
  DAY_END_MIN,
  minutesToPx,
  pxToMinutes,
  snap,
  timeToMin,
  minToTime,
  clampToDay,
} from '@/lib/time'

describe('constants', () => {
  it('PX_PER_MIN is 1.5', () => {
    expect(PX_PER_MIN).toBe(1.5)
  })

  it('SNAP_MIN is 15', () => {
    expect(SNAP_MIN).toBe(15)
  })

  it('DAY_START_MIN is 360 (06:00)', () => {
    expect(DAY_START_MIN).toBe(360)
  })

  it('DAY_END_MIN is 1440 (24:00)', () => {
    expect(DAY_END_MIN).toBe(1440)
  })
})

describe('minutesToPx', () => {
  it('converts 0 minutes to 0 px', () => {
    expect(minutesToPx(0)).toBe(0)
  })

  it('converts 60 minutes to 90 px', () => {
    expect(minutesToPx(60)).toBe(90)
  })

  it('converts 30 minutes to 45 px', () => {
    expect(minutesToPx(30)).toBe(45)
  })

  it('converts 1 minute to 1.5 px', () => {
    expect(minutesToPx(1)).toBe(1.5)
  })

  it('converts DAY_START_MIN (360) correctly', () => {
    expect(minutesToPx(360)).toBe(540)
  })
})

describe('pxToMinutes', () => {
  it('converts 0 px to 0 minutes', () => {
    expect(pxToMinutes(0)).toBe(0)
  })

  it('converts 90 px to 60 minutes', () => {
    expect(pxToMinutes(90)).toBe(60)
  })

  it('converts 45 px to 30 minutes', () => {
    expect(pxToMinutes(45)).toBe(30)
  })

  it('is inverse of minutesToPx for integer minutes', () => {
    expect(pxToMinutes(minutesToPx(45))).toBe(45)
    expect(pxToMinutes(minutesToPx(90))).toBe(90)
  })
})

describe('snap', () => {
  it('snaps 0 to 0', () => {
    expect(snap(0)).toBe(0)
  })

  it('snaps exact 15-min boundary unchanged', () => {
    expect(snap(15)).toBe(15)
    expect(snap(30)).toBe(30)
    expect(snap(360)).toBe(360)
  })

  it('snaps 7 to 0 (nearest lower boundary)', () => {
    expect(snap(7)).toBe(0)
  })

  it('snaps 8 to 15 (nearest upper boundary)', () => {
    expect(snap(8)).toBe(15)
  })

  it('snaps 22 to 15', () => {
    expect(snap(22)).toBe(15)
  })

  it('snaps 23 to 30', () => {
    expect(snap(23)).toBe(30)
  })

  it('snaps 370 to 375 (nearest 15-min slot)', () => {
    expect(snap(370)).toBe(375)
  })

  it('snaps 367 to 360', () => {
    expect(snap(367)).toBe(360)
  })
})

describe('timeToMin', () => {
  it('converts "00:00" to 0', () => {
    expect(timeToMin('00:00')).toBe(0)
  })

  it('converts "06:00" to 360', () => {
    expect(timeToMin('06:00')).toBe(360)
  })

  it('converts "12:30" to 750', () => {
    expect(timeToMin('12:30')).toBe(750)
  })

  it('converts "23:59" to 1439', () => {
    expect(timeToMin('23:59')).toBe(1439)
  })

  it('converts "01:00" to 60', () => {
    expect(timeToMin('01:00')).toBe(60)
  })

  it('converts "00:15" to 15', () => {
    expect(timeToMin('00:15')).toBe(15)
  })
})

describe('minToTime', () => {
  it('converts 0 to "00:00"', () => {
    expect(minToTime(0)).toBe('00:00')
  })

  it('converts 360 to "06:00"', () => {
    expect(minToTime(360)).toBe('06:00')
  })

  it('converts 750 to "12:30"', () => {
    expect(minToTime(750)).toBe('12:30')
  })

  it('converts 1439 to "23:59"', () => {
    expect(minToTime(1439)).toBe('23:59')
  })

  it('pads single-digit hours with zero', () => {
    expect(minToTime(60)).toBe('01:00')
  })

  it('pads single-digit minutes with zero', () => {
    expect(minToTime(5)).toBe('00:05')
  })

  it('is inverse of timeToMin', () => {
    expect(minToTime(timeToMin('14:45'))).toBe('14:45')
  })
})

describe('clampToDay', () => {
  it('clamps below DAY_START_MIN to DAY_START_MIN', () => {
    expect(clampToDay(0)).toBe(DAY_START_MIN)
    expect(clampToDay(100)).toBe(DAY_START_MIN)
    expect(clampToDay(359)).toBe(DAY_START_MIN)
  })

  it('clamps above DAY_END_MIN to DAY_END_MIN', () => {
    expect(clampToDay(1441)).toBe(DAY_END_MIN)
    expect(clampToDay(9999)).toBe(DAY_END_MIN)
  })

  it('returns value unchanged when within range', () => {
    expect(clampToDay(360)).toBe(360)
    expect(clampToDay(720)).toBe(720)
    expect(clampToDay(1440)).toBe(1440)
  })

  it('handles midnight boundary exactly', () => {
    expect(clampToDay(1440)).toBe(1440)
  })
})
