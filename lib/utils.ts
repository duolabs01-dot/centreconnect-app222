import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const JOHANNESBURG_TIME_ZONE = "Africa/Johannesburg"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function safeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getJohannesburgNowParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JOHANNESBURG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date())

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0")

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
  }
}

export function getJohannesburgGreeting() {
  const { hour } = getJohannesburgNowParts()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function getDisplayNameFromEmail(email?: string | null) {
  if (!email) return 'Parent'
  const local = email.split('@')[0] ?? ''
  const token = (local.split(/[._-]+/).find(Boolean) ?? local).trim()
  if (!token) return 'Parent'
  return token.charAt(0).toUpperCase() + token.slice(1)
}

export function getJohannesburgDateKey(value: string | Date) {
  const date = safeDate(value)
  if (!date) return ""
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JOHANNESBURG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
  return `${year}-${month}-${day}`
}

export function isSameJohannesburgDay(a: string | Date, b: string | Date = new Date()) {
  return getJohannesburgDateKey(a) === getJohannesburgDateKey(b)
}

export function calculateAge(dateOfBirth: string) {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map((value) => Number(value))
  if (!birthYear || !birthMonth || !birthDay) return 0
  const now = getJohannesburgNowParts()

  let age = now.year - birthYear
  const monthDiff = now.month - birthMonth

  if (monthDiff < 0 || (monthDiff === 0 && now.day < birthDay)) {
    age--
  }

  return age
}

export function formatDate(value: string | Date) {
  const date = safeDate(value)
  if (!date) return ''

  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: JOHANNESBURG_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatLongDate(value: string | Date) {
  const date = safeDate(value)
  if (!date) return ''

  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: JOHANNESBURG_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
