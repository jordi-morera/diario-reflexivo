import React from 'react'

export default function Reflection({ reflection, onBack }) {
  return (
    <div className="reflection-view">
      <button className="back-btn" onClick={onBack}>← Volver</button>

      <div className="reflection-card">
        <h2>🔮 Tu Reflexión</h2>

        <div className="reflection-section">
          <div className="reflection-text">{reflection.reflection}</div>
        </div>

        <div className="reflection-section">
          <h3>❓ Preguntas</h3>
          <ul className="questions-list">
            {reflection.questions && reflection.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>

        {reflection.patterns && reflection.patterns.length > 0 && (
          <div className="reflection-section">
            <h3>🔄 Patrones</h3>
            <div className="patterns-list">
              {reflection.patterns.map((p, i) => (
                <div key={i}>• {p}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}