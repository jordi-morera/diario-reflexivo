# 📔 Diario Reflexivo

*[Read in English](README.md)*

> **Un diario asistido donde la IA actúa como espejo reflexivo para procesar tus emociones.**

Construye una comprensión más profunda de tus patrones emocionales a través de conversaciones reflexivas impulsadas por Claude.

## 🎯 ¿Qué hace?

1. **Escribes tu entrada** — expresas lo que sientes sin filtros
2. **Claude reflexiona** — te devuelve preguntas poderosas, valida emociones, identifica patrones
3. **Archivas tu proceso** — accede a tu historial, revisa entradas pasadas y elimina las que ya no quieras conservar

### Ejemplo real

**Tu entrada:**
```
Hoy tuve una reunión importante y todo salió mal. Cometí un error tonto 
y ahora creo que mi jefe piensa que no valgo para este trabajo. 
Me siento como un fracaso.
```

**Claude te devuelve:**
```
Reflexión: Veo que tras un error puntual has hecho una conclusión 
muy amplia sobre tu valía profesional. Eso es un patrón de pensamiento 
donde un evento negativo define toda tu competencia. Eres mucho más que 
un error.

Preguntas:
1. ¿Qué hechos concretos tienes de que tu jefe piense que no vales?
2. ¿Ha ocurrido antes algún error que te hayas recuperado de él?
3. ¿Cómo hablarías a un amigo que pasara por lo mismo?

Patrones:
- Catastrofismo: generalizar un error puntual a fracaso total
- Lectura de mente: asumir qué piensa tu jefe sin datos
```

## 🏗️ Arquitectura

### Desarrollo local (SQLite)
En desarrollo, la arquitectura es simple:
```
React (Frontend)
    ↓ (HTTP)
Flask API (Backend)
    ↓ (SQL)
SQLite (persistencia local)
    ↓
Claude API
```

### Producción en AWS (DynamoDB)
En producción, se despliega en AWS serverless:
```
                    ┌─ CloudFront (CDN) ─┐
                    │   (HTTPS, caché)   │
                    └────────────────────┘
                      ↓               ↓
                   S3              API Gateway
                (Frontend)           (Lambda)
                                        ↓
                                    Flask App
                                        ↓
                                    DynamoDB
                                        ↓
                                    Claude API
```

**Estructura de archivos:**
```
📁 diario_reflexivo/
├── backend/
│   ├── app.py              ← API Flask: CRUD de entradas + reflexión con Claude
│   ├── lambda_function.py  ← Handler para AWS Lambda (sin reescrituras)
│   └── requirements.txt    ← Dependencias Python (boto3, aws-wsgi, etc.)
├── frontend/
│   ├── src/
│   │   ├── App.jsx         ← Componente raíz: estado, routing simple, llamadas a la API
│   │   ├── App.css         ← Sistema de diseño (variables CSS, dark mode, animaciones)
│   │   ├── main.jsx        ← Punto de entrada de React
│   │   └── components/
│   │       ├── DiaryList.jsx     ← Listar y eliminar entradas
│   │       ├── DiaryEntry.jsx    ← Formulario para crear una entrada
│   │       └── Reflection.jsx    ← Mostrar la reflexión generada por Claude
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── DEPLOYMENT.md           ← Guía completa para desplegar en AWS
├── requirements.txt        ← Dependencias Python
└── README.es.md            ← Este fichero (README.md en inglés)
```

**Persistencia:**
- **Desarrollo local**: SQLite en `backend/diary.db`
- **Producción AWS**: DynamoDB con dos tablas (`DiaryEntries` y `Reflections`)

**IDs:**
- **Desarrollo local**: autoincrement (1, 2, 3...)
- **Producción AWS**: UUIDs (strings) para mejor escalabilidad

## ⚡ Setup rápido (desarrollo local)

### Requisitos previos
- Python 3.9+
- Node.js 16+
- API Key de Anthropic ([obtén una aquí](https://console.anthropic.com))

### Backend (Flask + SQLite)

```bash
cd backend

# 1. Crear venv
python -m venv venv
source venv/bin/activate  # en Windows: venv\Scripts\activate

# 2. Instalar dependencias
pip install -r ../requirements.txt

# 3. Configurar API key
export ANTHROPIC_API_KEY="sk-ant-..."

# 4. Ejecutar servidor
python app.py
```

El servidor estará en `http://localhost:5001` y usará SQLite local (`backend/diary.db`).

### Frontend (React + Vite)

```bash
cd frontend

# 1. Instalar dependencias
npm install

# 2. Ejecutar dev server
npm run dev
```

Frontend estará en `http://localhost:5173` (Vite usa el siguiente puerto libre si ese está ocupado).

**Accede a la app:** abre el navegador en la URL que imprima Vite.

> También hay un `setup.sh` que automatiza ambos pasos de instalación (`./setup.sh`).

## 🚀 Despliegue en AWS

Para desplegar la aplicación completa en AWS con S3 (frontend), Lambda (backend) y DynamoDB (persistencia):

**Lee la guía completa en [`DEPLOYMENT.md`](DEPLOYMENT.md)** que incluye paso a paso:
- Crear tablas DynamoDB
- Configurar AWS Secrets Manager para la API key
- Preparar y desplegar el backend en Lambda
- Crear API Gateway para exponer el backend
- Configurar S3 + CloudFront para el frontend
- Build y subida del frontend

**Resumen rápido:**
```bash
# Backend
aws dynamodb create-table --table-name DiaryEntries --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST

# Frontend
VITE_API_BASE=https://tu-api.execute-api.region.amazonaws.com/api npm run build
aws s3 sync frontend/dist/ s3://tu-bucket/
```

**Costos aproximados:** ~$0.60-2/mes (Lambda: gratis, DynamoDB: $0-1.25, CloudFront: $0-0.50, Secrets Manager: $0.40).

## 📚 Cómo usar

1. **Nueva Entrada**: haz click en "✍️ Nueva Entrada", selecciona cómo te sientes y escribe
2. **Guardar**: clickea "💾 Guardar"
3. **Reflexionar**: accede a la entrada guardada y clickea "🔮 Obtener Reflexión"
4. **Reflexión**: Claude te devuelve una reflexión empática, preguntas y patrones identificados
5. **Archivo**: vuelve a "📚 Mis Entradas" para revisar tu historial
6. **Eliminar**: en el listado o dentro de una entrada, pulsa el icono 🗑️ para borrarla (pide confirmación porque es irreversible)

## 🔧 Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/entries` | Crear nueva entrada |
| GET | `/api/entries` | Listar todas las entradas (últimas 50, contenido truncado) |
| GET | `/api/entries/<id>` | Obtener entrada específica (contenido completo) |
| DELETE | `/api/entries/<id>` | Eliminar una entrada y su reflexión asociada |
| POST | `/api/entries/<id>/reflect` | Generar reflexión con Claude (crea o reemplaza la existente) |
| GET | `/api/entries/<id>/reflection` | Obtener reflexión guardada |
| GET | `/health` | Health check |

**Ejemplo: crear entrada**

```bash
curl -X POST http://localhost:5001/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hoy me sentí abrumado con todo",
    "mood": "😰 Ansioso"
  }'
```

**Ejemplo: eliminar entrada**

```bash
curl -X DELETE http://localhost:5001/api/entries/3
# 204 No Content si se elimina, 404 si no existe
```

## 🧠 Cómo funciona la reflexión

### Proceso

1. **Frontend envía entrada** → `POST /api/entries/<id>/reflect`
2. **Backend obtiene la entrada** de la BD
3. **Llama a Claude** con:
   - System prompt (instrucciones de rol: psicólogo humanista)
   - User message: la entrada del usuario
4. **Claude analiza y devuelve JSON** con:
   - `reflection`: tu reflexión empática
   - `questions`: preguntas poderosas
   - `patterns`: patrones identificados
5. **Backend guarda en BD** (upsert vía `INSERT OR REPLACE`, así puedes volver a reflexionar sobre la misma entrada) y devuelve al frontend
6. **Frontend muestra** la reflexión de forma visual

### System Prompt

El prompt está diseñado para que Claude actúe como psicólogo humanista:
- Empatía auténtica
- Preguntas reflexivas (no consejos)
- Identificación de patrones cognitivos
- Validación emocional

**Puedes modificar** `SYSTEM_PROMPT` en `backend/app.py` para cambiar el tono o enfoque.

## 🎨 Sistema de diseño del frontend

La interfaz pasó por una pasada de modernización visual completa, pensada para que el diario se sienta cálido y cuidado en vez de una demo genérica:

- **Paleta e identidad**: gama índigo/rosa (`--primary`, `--accent`) definida como variables CSS en `:root`, con una versión completa para **modo oscuro** vía `prefers-color-scheme` — se adapta automáticamente al tema del sistema del usuario sin JavaScript adicional.
- **Tipografía dual**: [Inter](https://fonts.google.com/specimen/Inter) para UI e interacción, y [Fraunces](https://fonts.google.com/specimen/Fraunces) (serif editorial) para titulares y el texto de la reflexión — refuerza que la reflexión es un momento distinto, más pausado, dentro del flujo.
- **Cabecera con gradiente radial** y un borde inferior curvo (en vez de un corte recto), con la navegación en pastillas flotando sobre ella.
- **Micro-interacciones**: elevación sutil al pasar el ratón sobre tarjetas y botones, focus ring accesible en el textarea, spinner de carga, animaciones de entrada (`fadeIn`) al cambiar de vista.
- **Componentes reutilizables por convención de clases**: botones primario/secundario, tarjetas, badges de estado de ánimo, listas de preguntas/patrones — todo definido una vez como utilidades en `App.css` y reutilizado entre vistas.
- **Responsive real**: grid de entradas con `auto-fill`/`minmax` que se adapta a cualquier ancho, navegación que pasa a columna en móvil.
- **Sin librería de UI externa**: todo es CSS plano con variables — deliberado, para mantener el bundle ligero y que el sistema de diseño sea fácil de explicar y modificar sin depender de Tailwind/MUI/etc.

### Frontend (decisiones generales)
- **React mínimo**: 4 componentes, estado con hooks (`useState`/`useEffect`), sin gestor de estado externo — la app es lo bastante pequeña como para no necesitarlo.
- **Vite**: build tool moderno y rápido, HMR instantáneo en desarrollo.
- **Fetch nativo**: sin cliente HTTP adicional; `API_BASE` centraliza la URL del backend.

### Backend
- **Flask**: transparente, pocas abstracciones, perfecto para razonar sobre cada request.
- **Persistencia flexible**:
  - **Desarrollo local**: SQLite (fichero `backend/diary.db`)
  - **Producción AWS**: DynamoDB (con `boto3`) para escalabilidad y serverless
- **CRUD completo sobre `entries`**: crear, listar, leer, **eliminar** (con borrado en cascada manual de la reflexión asociada) y reflexionar.
- **Claude API directa** vía el SDK oficial de `anthropic`, sin frameworks agénticos — el caso de uso es una sola llamada con un prompt bien diseñado, así que añadir una capa de orquestación sería sobre-ingeniería.
- **CORS parametrizable**: en desarrollo acepta `*`, en producción se restringe a la URL de CloudFront.
- **AWS Lambda compatible**: usa `aws-wsgi` para envolver la app Flask sin reescrituras — el mismo código corre en local y en Lambda.

### IA
- **JSON estructurado**: el system prompt obliga a Claude a devolver un JSON con forma fija, parseable de forma predecible (con fallback para extraer el bloque si viene envuelto en ```` ```json ````).
- **Prompt centrado en un solo rol**: "psicólogo humanista, espejo reflexivo" — instrucciones claras y acotadas dan resultados consistentes.
- **Sin memoria entre entradas**: cada reflexión es independiente y se genera solo a partir del contenido de esa entrada (mejora el foco y evita que el modelo arrastre contexto irrelevante).

## 📊 Casos de uso

- **Procesamiento emocional**: trabajar ansiedad, estrés, emociones difíciles
- **Auto-conocimiento**: identificar patrones de pensamiento recurrentes
- **Apoyo entre sesiones de terapia**: reflexión asistida entre sesiones
- **Journaling estructurado**: combina libre expresión con análisis

## 🚀 Próximas iteraciones

- [ ] **Multi-turn conversations**: continuar reflexionando sobre la misma entrada
- [ ] **Dashboard de patrones**: visualizar patrones emocionales a lo largo del tiempo
- [ ] **Recomendaciones personalizadas**: basadas en tu historial emocional
- [ ] **Edición de entradas**: no solo crear/eliminar, también editar el contenido
- [ ] **Export**: descargar tus entradas como PDF
- [ ] **Autenticación**: soporte para múltiples usuarios

## 🔐 Privacidad

### Desarrollo local
- Las entradas se guardan **localmente en tu SQLite** (no se suben a ningún servidor propio)
- Solo se envía el contenido a la API de Claude en el momento de pedir una reflexión
- Tu API key de Anthropic se configura localmente (variable de entorno, nunca hardcodeada)

### Producción en AWS
- Las entradas se guardan en **DynamoDB (tu cuenta de AWS privada)**, no en servidores de terceros
- Solo el contenido se envía a Claude API cuando generas una reflexión
- La API key de Anthropic se guarda en **AWS Secrets Manager** (nunca visible en logs ni en el código)
- El frontend se sirve desde **S3 privado + CloudFront**, sin acceso público directo
- CORS está restringido a tu dominio CloudFront (no `*`)

### General
- Eliminar una entrada borra también su reflexión asociada — no queda rastro en la base de datos
- No hay tracking ni recolección de datos más allá de lo necesario para la app funcione

## 💡 Para explicar en una entrevista

**Versión corta (2 min):**
> "Diario Reflexivo es una aplicación full-stack donde escribes tus emociones 
> y Claude actúa como espejo reflexivo, devolviendo preguntas y patrones. 
> Flask expone una API REST con CRUD completo sobre las entradas, React 
> proporciona una UI cuidada con soporte de modo oscuro, y SQLite persiste 
> todo localmente. El valor está en usar IA no para resolver problemas, 
> sino para ayudarte a comprenderlos mejor."

**Versión detallada (5 min):**
1. **El problema**: cuando estamos en una emoción difícil, necesitamos ayuda para procesarla sin estar solos.
2. **La solución**: combinar journaling (procesar escribiendo) + IA reflexiva (preguntas socráticas, no consejos).
3. **La arquitectura**:
   - Backend Flask como API REST que orquesta la lógica (CRUD de entradas + generación de reflexiones)
   - Frontend React con estado local simple (sin Redux/Context, porque la app no lo necesita) y un sistema de diseño propio en CSS puro
   - SQLite para persistencia local, sin dependencias de infraestructura
   - Claude API para la "inteligencia emocional", con prompt engineering para forzar una salida JSON estructurada
4. **El reto técnico**: diseñar el system prompt para que Claude haga preguntas reflexivas (socráticas) en lugar de dar consejos, y parsear de forma robusta una respuesta de lenguaje natural como JSON fiable.
5. **Iteración de producto**: partiendo de un MVP funcional, se añadieron dos mejoras guiadas por uso real: (a) una modernización visual completa (tipografía, dark mode, micro-interacciones, sistema de diseño en variables CSS) para que la app se sintiera lista para mostrar, y (b) la capacidad de eliminar entradas — un CRUD incompleto (sin delete) es un problema real de UX en cualquier app de datos personales.
6. **El valor**: es un proyecto pequeño pero que demuestra:
   - Diseño de API REST y principios CRUD completos
   - Desarrollo full-stack (backend + frontend) de punta a punta
   - Prompt engineering para un caso de uso concreto, con salida estructurada y manejo de errores
   - Criterio de UX/diseño: sistema de diseño coherente, accesible y responsive
   - Buen juicio de alcance: saber cuándo NO añadir una librería o abstracción (sin Tailwind, sin frameworks agénticos, sin gestor de estado) porque el problema no lo pide

## 📝 Licencia

MIT — úsalo y modifícalo como quieras.

---

**Hecho con ❤️ para procesar emociones de forma más consciente.**
