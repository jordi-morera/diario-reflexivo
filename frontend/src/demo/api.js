// API falsa para el modo demo: misma forma que la API real (backend/app.py),
// pero persistida en localStorage y sin ninguna llamada de red ni coste de IA.
import { seedEntries } from './seedEntries'
import { reflectionFor } from './reflections'

const STORAGE_KEY = 'diario-reflexivo-demo-entries-v1'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error(e)
  }
  const initial = seedEntries.map((e) => ({ ...e }))
  saveEntries(initial)
  return initial
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (e) {
    console.error(e)
  }
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error(e)
  }
}

function newId() {
  return 'demo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export const api = {
  async listEntries() {
    await delay(300)
    return loadEntries()
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map(({ id, content, mood, created_at }) => ({
        id,
        content: content.slice(0, 200),
        mood,
        created_at,
      }))
  },

  async getEntry(id) {
    await delay(200)
    const entry = loadEntries().find((e) => e.id === id)
    if (!entry) return null
    return { id: entry.id, content: entry.content, mood: entry.mood }
  },

  async createEntry(content, mood) {
    await delay(300)
    const entries = loadEntries()
    const entry = { id: newId(), content, mood: mood || '', created_at: new Date().toISOString() }
    entries.push(entry)
    saveEntries(entries)
    return { id: entry.id, content: entry.content, mood: entry.mood }
  },

  async deleteEntry(id) {
    await delay(200)
    saveEntries(loadEntries().filter((e) => e.id !== id))
    return true
  },

  async reflect(id) {
    // Delay algo mayor: en la app real aquí es donde se espera a Claude.
    await delay(1500)
    const entry = loadEntries().find((e) => e.id === id)
    return reflectionFor(entry)
  },
}
