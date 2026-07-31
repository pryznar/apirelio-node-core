import type { RouteFilterOptions } from './types.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i
const INTEGER = /^\d+$/
const HEX_IDENTIFIER = /^[0-9a-f]{16,}$/i

export function normalizeRoute(input: string): string {
  const path = stripQuery(input).trim() || '/'
  const normalized = path
    .split('/')
    .map(segment => isIdentifier(segment) ? '{id}' : segment)
    .join('/')

  return normalized.startsWith('/') ? normalized.slice(0, 500) : `/${normalized}`.slice(0, 500)
}

export function joinRoute(prefix: string, route: string): string {
  const left = prefix === '/' ? '' : prefix.replace(/\/$/, '')
  const right = route.startsWith('/') ? route : `/${route}`
  return normalizeRoute(`${left}${right}`)
}

export function shouldCaptureRoute(
  input: string,
  options: RouteFilterOptions = {},
): boolean {
  const route = normalizeRoute(input)
  const included = !options.includeRoutes?.length
    || options.includeRoutes.some(pattern => matchesRoutePattern(route, pattern))

  return included && !options.excludeRoutes?.some(pattern => matchesRoutePattern(route, pattern))
}

export function matchesRoutePattern(input: string, pattern: string): boolean {
  const route = normalizeRoute(input)
  const normalizedPattern = normalizePattern(pattern)

  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3) || '/'
    return route === prefix || route.startsWith(prefix === '/' ? '/' : `${prefix}/`)
  }

  return route === normalizedPattern
}

function stripQuery(value: string): string {
  const query = value.indexOf('?')
  const hash = value.indexOf('#')
  const end = [query, hash].filter(index => index >= 0).sort((a, b) => a - b)[0]
  return end === undefined ? value : value.slice(0, end)
}

function normalizePattern(input: string): string {
  const path = stripQuery(input).trim() || '/'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

function isIdentifier(segment: string): boolean {
  return INTEGER.test(segment) || UUID.test(segment) || ULID.test(segment) || HEX_IDENTIFIER.test(segment)
}
