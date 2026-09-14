import React from 'react'

export default function DiaryList({ entries, onSelectEntry, onDeleteEntry, loading }) {
  if (loading) return <div className="loading">Cargando...</div>

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <h2>📭 No hay entradas aún</h2>
        <p>Crea tu primera entrada para empezar</p>
      </div>
    )
  }

  return (
    <div className="diary-list">
      <h2>Mis Entradas</h2>
      <div className="entries-grid">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="entry-card-preview"
            onClick={() => {
              console.log('Click en entrada', entry.id)
              onSelectEntry(entry.id)
            }}
            style={{cursor: 'pointer'}}
          >
            <div className="card-header">
              <span className="mood-badge">{entry.mood || '✍️'}</span>
              <button
                className="icon-btn-danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteEntry(entry.id)
                }}
                title="Eliminar entrada"
                aria-label="Eliminar entrada"
              >
                🗑️
              </button>
            </div>
            <p className="card-content">{entry.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}