import { API_BASE_URL } from './env'

/** Turn API media paths into browser-loadable URLs. */
export function resolveMediaUrl(src: string): string {
  if (!src) return src
  if (/^https?:\/\//i.test(src)) return src
  if (src.startsWith('/assets/')) return src
  if (src.startsWith('/')) return `${API_BASE_URL}${src}`
  return `${API_BASE_URL}/${src}`
}

/** Strip the API origin before sending media paths back to Django. */
export function toApiMediaPath(src: string): string {
  if (!src) return src
  if (src.startsWith(`${API_BASE_URL}/`)) {
    return src.slice(API_BASE_URL.length)
  }
  return src
}
