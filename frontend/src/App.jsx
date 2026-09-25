import React, { useState, useEffect } from 'react'
import './App.css'
import DiaryList from './components/DiaryList'
import DiaryEntry from './components/DiaryEntry'
import Reflection from './components/Reflection'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

export default function App() {
  const [view, setView] = useState('list')
  const [entries, setEntries] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [reflection, setReflection] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (view === 'list') loadEntries()
  }, [view])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/entries`)
      if (res.ok) setEntries(await res.json())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleCreateEntry = async (content, mood) => {
    try {
      const res = await fetch(`${API_BASE}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mood })
      })
      if (res.ok) {
        const entry = await res.json()
        setSelectedEntry(entry)
        setView('entry')
        await loadEntries() // Esperar a que cargue
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectEntry = async (id) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/entries/${id}`)
      if (res.ok) {
        setSelectedEntry(await res.json())
        setView('entry')
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta entrada? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`${API_BASE}/entries/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedEntry && selectedEntry.id === id) {
          setSelectedEntry(null)
          setReflection(null)
          setView('list')
        }
        await loadEntries()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleReflect = async () => {
    if (!selectedEntry) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/entries/${selectedEntry.id}/reflect`, {
        method: 'POST'
      })
      if (res.ok) {
        setReflection(await res.json())
        setView('reflection')
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📔 Diario Reflexivo</h1>
        <p className="tagline">Tu espacio para procesar emociones</p>
      </header>

      <nav className="nav">
        <button
          className={`nav-btn ${view === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          📚 Mis Entradas
        </button>
        <button
          className={`nav-btn ${view === 'new' ? 'active' : ''}`}
          onClick={() => setView('new')}
        >
          ✍️ Nueva Entrada
        </button>
      </nav>

      <main className="main">
        {view === 'list' && <DiaryList entries={entries} onSelectEntry={handleSelectEntry} onDeleteEntry={handleDeleteEntry} loading={loading} />}
        {view === 'new' && <DiaryEntry onSubmit={handleCreateEntry} onCancel={() => setView('list')} />}
        {view === 'entry' && selectedEntry && !reflection && (
          <div className="entry-view">
            <button className="back-btn" onClick={() => setView('list')}>← Volver</button>
            <div className="entry-card">
              <div className="entry-card-top">
                <h2>{selectedEntry.mood || '✍️'}</h2>
                <button
                  className="icon-btn-danger"
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                  title="Eliminar entrada"
                  aria-label="Eliminar entrada"
                >
                  🗑️
                </button>
              </div>
              <p className="entry-content">{selectedEntry.content}</p>
              <button className="btn-primary" onClick={handleReflect} disabled={loading}>
                🔮 Obtener Reflexión
              </button>
            </div>
          </div>
        )}
        {view === 'reflection' && reflection && (
          <Reflection reflection={reflection} onBack={() => { setView('entry'); setReflection(null) }} />
        )}
      </main>
    </div>
  )
}