import React, { useState } from 'react'

const MOODS = ['😊 Feliz', '😔 Triste', '😰 Ansioso', '😤 Frustrado']

export default function DiaryEntry({ onSubmit, onCancel }) {
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    await onSubmit(content, mood || null)
    setSubmitting(false)
  }

  return (
    <div className="entry-form-container">
      <h2>Escribe tu entrada</h2>
      <form onSubmit={handleSubmit}>
        <div className="mood-selector">
          <label>¿Cómo te sientes?</label>
          <div className="mood-buttons">
            {MOODS.map(m => (
              <button
                key={m}
                type="button"
                className={`mood-btn ${mood === m ? 'selected' : ''}`}
                onClick={() => setMood(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Expresa lo que sientes..."
            rows={8}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting || !content.trim()}>
            💾 Guardar
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}