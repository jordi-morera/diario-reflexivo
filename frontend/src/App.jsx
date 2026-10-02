import React, { useState, useEffect } from 'react'
import './App.css'
import DiaryList from './components/DiaryList'
import DiaryEntry from './components/DiaryEntry'
import Reflection from './components/Reflection'
import DemoBanner from './components/DemoBanner'
import { api, DEMO_MODE } from './api'

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
      setEntries(await api.listEntries())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleCreateEntry = async (content, mood) => {
    try {
      const entry = await api.createEntry(content, mood)
      setSelectedEntry(entry)
      setView('entry')
      await loadEntries() // Esperar a que cargue
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectEntry = async (id) => {
    setLoading(true)
    try {
      const entry = await api.getEntry(id)
      if (entry) {
        setSelectedEntry(entry)
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
      const ok = await api.deleteEntry(id)
      if (ok) {
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
      const result = await api.reflect(selectedEntry.id)
      if (result) {
        setReflection(result)
        setView('reflection')
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleDemoReset = () => {
    setSelectedEntry(null)
    setReflection(null)
    setView('list')
    loadEntries()
  }

  return (
    <div className="app">
      {DEMO_MODE && <DemoBanner onReset={handleDemoReset} />}

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
