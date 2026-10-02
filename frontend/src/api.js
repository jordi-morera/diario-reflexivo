// Punto único de acceso a la API. En modo demo (VITE_DEMO_MODE=true) usa
// datos locales pregrabados; si no, llama al backend real (Flask / Lambda).
import { api as demoApi } from './demo/api'

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

const realApi = {
  async listEntries() {
    const res = await fetch(`${API_BASE}/entries`)
    if (!res.ok) throw new Error('No se pudieron cargar las entradas')
    return res.json()
  },
  async getEntry(id) {
    const res = await fetch(`${API_BASE}/entries/${id}`)
    if (!res.ok) throw new Error('No se pudo cargar la entrada')
    return res.json()
  },
  async createEntry(content, mood) {
    const res = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mood }),
    })
    if (!res.ok) throw new Error('No se pudo guardar la entrada')
    return res.json()
  },
  async deleteEntry(id) {
    const res = await fetch(`${API_BASE}/entries/${id}`, { method: 'DELETE' })
    return res.ok
  },
  async reflect(id) {
    const res = await fetch(`${API_BASE}/entries/${id}/reflect`, { method: 'POST' })
    if (!res.ok) throw new Error('No se pudo generar la reflexión')
    return res.json()
  },
}

export const api = DEMO_MODE ? demoApi : realApi
