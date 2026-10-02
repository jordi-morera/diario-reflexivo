// Reflexiones pregrabadas para el modo demo.
// En la app real estas las genera Claude a partir del contenido de cada entrada;
// aquí son fijas para que la demo funcione sin backend ni coste de API.

const byEntryId = {
  'seed-1': {
    reflection:
      'Lo que describes tiene un nombre: catastrofismo anticipatorio. La mente, cuando se siente amenazada, salta directamente ' +
      'al peor escenario posible y lo trata como si ya hubiera pasado. Es agotador, pero también es una señal de que esto te importa de verdad.',
    questions: [
      '¿Qué pruebas reales tienes de que vaya a salir mal, más allá de la sensación?',
      'Si un compañero te contara exactamente esto mismo, ¿qué le dirías?',
      '¿Qué ha pasado otras veces que te has preparado así de bien?',
    ],
    patterns: ['Catastrofismo: anticipar el peor resultado posible como si fuera un hecho', 'Autoexigencia: medir tu valía por el resultado de un único momento'],
  },
  'seed-2': {
    reflection:
      'Hay una tristeza concreta en notar que una relación que fue fácil ya no lo es tanto. No significa que esté rota, ' +
      'muchas veces es solo que las personas cambian a ritmos distintos y eso incomoda antes de encontrar un nuevo equilibrio.',
    questions: [
      '¿Qué ha cambiado exactamente: vosotros, o el contexto en el que os veíais?',
      '¿Hay algo que te gustaría decirle y que no te has atrevido?',
      '¿Qué necesitarías tú para sentir que la relación vuelve a fluir?',
    ],
    patterns: ['Idealización del pasado: comparar el presente con una versión simplificada de cómo eran antes las cosas'],
  },
  'seed-3': {
    reflection:
      'Tres días con el mismo bug agotan a cualquiera, y la frustración acumulada casi siempre acaba saliendo por donde menos toca. ' +
      'Lo que cuentas no habla de que seas mal compañero, habla de que llevabas demasiado tiempo conteniendo algo.',
    questions: [
      '¿En qué momento exacto notaste que la frustración se convertía en algo más que el bug?',
      '¿Qué necesitas ahora: resolver el bug, o primero bajar la tensión con tu compañero?',
      '¿Qué sueles hacer cuando un problema técnico se alarga más de lo esperado?',
    ],
    patterns: ['Desbordamiento: la frustración acumulada se dirige a algo que no es su causa real', 'Autocrítica inmediata tras un desahogo'],
  },
  'seed-4': {
    reflection:
      'Terminar algo que te costaba y, sobre todo, dejar de medirte con la vara de los demás son dos victorias distintas, ' +
      'y la segunda suele costar más. Vale la pena quedarse un momento con esta sensación antes de pasar a lo siguiente.',
    questions: [
      '¿Qué fue lo que te permitió dejar de compararte hoy?',
      '¿Cómo te gustaría recordar este momento dentro de un mes?',
      '¿Qué fue distinto esta vez respecto a otras veces que te has atascado?',
    ],
    patterns: ['Comparación social como fuente de presión', 'Dificultad para disfrutar el proceso en lugar de solo el resultado'],
  },
}

// Para entradas creadas por la persona que prueba la demo: una reflexión
// genérica pero coherente con el estado de ánimo elegido.
const byMood = {
  '😊 Feliz': {
    reflection:
      'Se nota en cómo lo cuentas que esto te ha hecho bien. Vale la pena pararse un momento en lo que ha funcionado, ' +
      'en lugar de pasar rápido a lo siguiente, como solemos hacer con lo bueno.',
    questions: [
      '¿Qué ha hecho que hoy haya sido diferente?',
      '¿Cómo podrías traer un poco de esto a un día más complicado?',
      '¿A quién te gustaría contarle esto?',
    ],
    patterns: ['Tendencia a restar importancia a lo positivo frente a lo negativo'],
  },
  '😔 Triste': {
    reflection:
      'Lo que describes merece espacio, no prisa por solucionarlo. A veces lo que más ayuda no es encontrar la respuesta, ' +
      'sino permitirse sentir esto sin juzgarlo.',
    questions: [
      '¿Desde cuándo te acompaña esta sensación?',
      '¿Qué necesitarías ahora mismo de ti o de alguien cercano?',
      '¿Hay algo en esto que ya sabías pero que hoy se ha hecho más claro?',
    ],
    patterns: ['Minimización del propio malestar ("supongo que es normal")'],
  },
  '😰 Ansioso': {
    reflection:
      'Cuando la cabeza no para de adelantarse a lo que puede pasar, suele ser una forma de intentar tener el control sobre algo incierto. ' +
      'Es agotador, pero tiene sentido: es tu mente intentando protegerte.',
    questions: [
      '¿Qué parte de esto depende realmente de ti, y qué parte no?',
      '¿Qué te ayudaría a bajar esta sensación aunque sea un poco, ahora mismo?',
      '¿Qué pasaría si, solo por hoy, decidieras no tener una respuesta para todo?',
    ],
    patterns: ['Anticipación ansiosa: vivir el problema antes de que ocurra'],
  },
  '😤 Frustrado': {
    reflection:
      'La frustración suele aparecer cuando algo nos importa y sentimos que no avanza al ritmo que querríamos. ' +
      'No es un fallo tuyo, es información sobre dónde estás poniendo energía.',
    questions: [
      '¿Qué es exactamente lo que se siente fuera de tu control en esto?',
      '¿Qué necesitarías para soltar un poco la tensión antes de seguir?',
      '¿Esto se parece a alguna otra situación que ya has vivido?',
    ],
    patterns: ['Impaciencia con el propio proceso'],
  },
  default: {
    reflection:
      'Gracias por compartir esto. Poner en palabras lo que sentimos ya es un primer paso para entenderlo mejor.',
    questions: [
      '¿Qué es lo que más destaca para ti de lo que acabas de escribir?',
      '¿Cómo te gustaría sentirte respecto a esto dentro de unos días?',
      '¿Hay algo que ya sabes que necesitas hacer, aunque te cueste?',
    ],
    patterns: [],
  },
}

export function reflectionFor(entry) {
  if (!entry) return byMood.default
  if (byEntryId[entry.id]) return byEntryId[entry.id]
  return byMood[entry.mood] || byMood.default
}
