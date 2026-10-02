import React from 'react'
import { resetDemo } from '../demo/api'

export default function DemoBanner({ onReset }) {
  const handleReset = () => {
    if (!window.confirm('Esto borra las entradas que hayas creado en esta demo y recupera las de ejemplo. ¿Continuar?')) return
    resetDemo()
    onReset()
  }

  return (
    <div className="demo-banner">
      <span>
        🎭 <strong>Modo demo</strong> — las reflexiones son respuestas de IA pregrabadas, no llamadas reales a Claude. Los datos
        se guardan solo en tu navegador.
      </span>
      <button type="button" className="demo-banner-reset" onClick={handleReset}>
        Reiniciar demo
      </button>
    </div>
  )
}
