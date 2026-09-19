const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export const getFlags = () => request('/api/flags')

export const getFlag = (plotId) => request(`/api/flags/${plotId}`)

export const getWardMap = (wardId) => request(`/api/ward/${wardId}/map`)

export const confirmFlag = (plotId) =>
  request(`/api/flags/${plotId}/confirm`, { method: 'POST' })

export const dismissFlag = (plotId) =>
  request(`/api/flags/${plotId}/dismiss`, { method: 'POST' })

export const sendToReview = (plotId) =>
  request(`/api/flags/${plotId}/review`, { method: 'POST' })
