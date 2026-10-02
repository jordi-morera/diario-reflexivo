// Entradas de ejemplo para el modo demo. Se cargan una vez en localStorage
// y a partir de ahí el usuario puede crear y borrar entradas como en la app real.
export const seedEntries = [
  {
    id: 'seed-1',
    mood: '😰 Ansioso',
    content:
      'Mañana tengo que presentar el proyecto delante de todo el equipo directivo y llevo toda la tarde dándole vueltas. ' +
      'No dejo de pensar en todo lo que puede salir mal: que me quede en blanco, que me hagan una pregunta que no sepa responder, ' +
      'que piensen que no estoy a la altura. Sé que me lo he preparado bien, pero da igual, la cabeza no para.',
    created_at: '2026-09-28T20:14:00.000Z',
  },
  {
    id: 'seed-2',
    mood: '😔 Triste',
    content:
      'Hoy he quedado con un amigo que hace tiempo que no veía y se ha notado raro entre nosotros, como si ya no encajáramos igual. ' +
      'Supongo que es normal, cada uno ha ido a lo suyo, pero me ha dejado un poco triste. Echo de menos cuando las cosas eran más simples.',
    created_at: '2026-09-30T22:03:00.000Z',
  },
  {
    id: 'seed-3',
    mood: '😤 Frustrado',
    content:
      'Llevo tres días intentando arreglar el mismo bug y cada vez que creo que lo tengo, aparece en otro sitio. ' +
      'Sé que es parte del trabajo, pero hoy ya me ha podido la frustración. He acabado hablándole mal a un compañero por una tontería ' +
      'y luego me he sentido fatal por ello.',
    created_at: '2026-10-01T19:40:00.000Z',
  },
  {
    id: 'seed-4',
    mood: '😊 Feliz',
    content:
      'Hoy por fin he terminado algo en lo que llevaba semanas atascado y la sensación ha sido increíble. ' +
      'Me he dado cuenta de que cuando dejo de compararme con lo rápido que avanzan los demás, disfruto mucho más del proceso. ' +
      'Pequeña victoria, pero la necesitaba.',
    created_at: '2026-10-02T09:12:00.000Z',
  },
]
