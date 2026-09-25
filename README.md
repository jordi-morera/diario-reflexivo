# 📔 Diario Reflexivo (Reflective Journal)

*[Leer en español](README.es.md)*

> **An AI-assisted journal where Claude acts as a reflective mirror to help you process emotions.**

Builds a deeper understanding of your emotional patterns through reflective conversations powered by Claude.

## 🎯 What it does

1. **You write an entry** — express what you're feeling, unfiltered
2. **Claude reflects back** — returns powerful questions, validates emotions, identifies patterns
3. **You archive your process** — browse your history, revisit past entries, and delete the ones you no longer want to keep

### Real example

**Your entry:**
```
Today I had an important meeting and everything went wrong. I made a
silly mistake and now I think my boss thinks I'm not good enough for
this job. I feel like a failure.
```

**Claude returns:**
```
Reflection: I notice that after a single mistake you've drawn a very
broad conclusion about your professional worth. That's a thinking
pattern where one negative event defines your entire competence.
You are much more than one mistake.

Questions:
1. What concrete evidence do you have that your boss thinks you're not
   good enough?
2. Has there been a mistake before that you recovered from?
3. How would you talk to a friend going through the same thing?

Patterns:
- Catastrophizing: generalizing a single mistake into total failure
- Mind reading: assuming what your boss thinks without evidence
```

## 🏗️ Architecture

### Local development (SQLite)
In development, the architecture is straightforward:
```
React (Frontend)
    ↓ (HTTP)
Flask API (Backend)
    ↓ (SQL)
SQLite (local persistence)
    ↓
Claude API
```

### Production on AWS (DynamoDB)
In production, it deploys to AWS serverless:
```
                    ┌─ CloudFront (CDN) ─┐
                    │   (HTTPS, cache)   │
                    └────────────────────┘
                      ↓               ↓
                   S3              API Gateway
                (Frontend)          (Lambda)
                                        ↓
                                    Flask App
                                        ↓
                                    DynamoDB
                                        ↓
                                    Claude API
```

**File structure:**
```
📁 diario_reflexivo/
├── backend/
│   ├── app.py              ← Flask API: CRUD for entries + reflection via Claude
│   ├── lambda_function.py  ← AWS Lambda handler (no rewrites needed)
│   └── requirements.txt    ← Python dependencies (boto3, aws-wsgi, etc.)
├── frontend/
│   ├── src/
│   │   ├── App.jsx         ← Root component: state, simple view routing, API calls
│   │   ├── App.css         ← Design system (CSS variables, dark mode, animations)
│   │   ├── main.jsx        ← React entry point
│   │   └── components/
│   │       ├── DiaryList.jsx     ← List and delete entries
│   │       ├── DiaryEntry.jsx    ← Form to create an entry
│   │       └── Reflection.jsx    ← Display the reflection Claude generated
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── DEPLOYMENT.md           ← Complete guide to deploy on AWS
├── requirements.txt        ← Python dependencies
└── README.md / README.es.md
```

**Persistence:**
- **Local development**: SQLite in `backend/diary.db`
- **Production AWS**: DynamoDB with two tables (`DiaryEntries` and `Reflections`)

**IDs:**
- **Local development**: autoincrement (1, 2, 3...)
- **Production AWS**: UUIDs (strings) for better scalability

## ⚡ Quick setup (local development)

### Prerequisites
- Python 3.9+
- Node.js 16+
- Anthropic API key ([get one here](https://console.anthropic.com))

### Backend (Flask + SQLite)

```bash
cd backend

# 1. Create a venv
python -m venv venv
source venv/bin/activate  # on Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r ../requirements.txt

# 3. Configure the API key
export ANTHROPIC_API_KEY="sk-ant-..."

# 4. Run the server
python app.py
```

The server will run at `http://localhost:5001` and use local SQLite (`backend/diary.db`).

### Frontend (React + Vite)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run the dev server
npm run dev
```

Frontend will run at `http://localhost:5173` (Vite falls back to the next free port if that one is taken).

**Open the app:** visit the URL Vite prints in your terminal.

> There's also a `setup.sh` script that automates both installs (`./setup.sh`).

## 🚀 Deploy to AWS

To deploy the entire application on AWS with S3 (frontend), Lambda (backend), and DynamoDB (persistence):

**Read the complete guide in [`DEPLOYMENT.md`](DEPLOYMENT.md)** which includes step-by-step instructions for:
- Creating DynamoDB tables
- Setting up AWS Secrets Manager for the API key
- Packaging and deploying the backend on Lambda
- Creating API Gateway to expose the backend
- Configuring S3 + CloudFront for the frontend
- Building and uploading the frontend

**Quick summary:**
```bash
# Backend
aws dynamodb create-table --table-name DiaryEntries --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST

# Frontend
VITE_API_BASE=https://your-api.execute-api.region.amazonaws.com/api npm run build
aws s3 sync frontend/dist/ s3://your-bucket/
```

**Approximate costs:** ~$0.60-2/month (Lambda: free tier, DynamoDB: $0-1.25, CloudFront: $0-0.50, Secrets Manager: $0.40).

## 📚 How to use it

1. **New entry**: click "✍️ Nueva Entrada", pick how you're feeling, and write
2. **Save**: click "💾 Guardar"
3. **Reflect**: open the saved entry and click "🔮 Obtener Reflexión"
4. **Reflection**: Claude returns an empathetic reflection, questions, and identified patterns
5. **Archive**: go back to "📚 Mis Entradas" to browse your history
6. **Delete**: from the list or from an open entry, tap the 🗑️ icon to delete it (asks for confirmation, since it's irreversible)

## 🔧 API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/entries` | Create a new entry |
| GET | `/api/entries` | List all entries (latest 50, content truncated) |
| GET | `/api/entries/<id>` | Get a specific entry (full content) |
| DELETE | `/api/entries/<id>` | Delete an entry and its associated reflection |
| POST | `/api/entries/<id>/reflect` | Generate a reflection with Claude (creates or replaces the existing one) |
| GET | `/api/entries/<id>/reflection` | Get a saved reflection |
| GET | `/health` | Health check |

**Example: create an entry**

```bash
curl -X POST http://localhost:5001/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Today I felt overwhelmed by everything",
    "mood": "😰 Ansioso"
  }'
```

**Example: delete an entry**

```bash
curl -X DELETE http://localhost:5001/api/entries/3
# 204 No Content on success, 404 if it doesn't exist
```

## 🧠 How the reflection works

### Process

1. **Frontend sends the entry** → `POST /api/entries/<id>/reflect`
2. **Backend fetches the entry** from the database
3. **Calls Claude** with:
   - A system prompt (role instructions: humanistic psychologist)
   - A user message: the journal entry itself
4. **Claude analyzes it and returns JSON** with:
   - `reflection`: an empathetic reflection
   - `questions`: powerful, open questions
   - `patterns`: identified thinking patterns
5. **Backend saves it** (upsert via `INSERT OR REPLACE`, so you can re-generate a reflection for the same entry) and returns it to the frontend
6. **Frontend renders** the reflection visually

### System prompt

The prompt is designed to make Claude act as a humanistic psychologist:
- Genuine empathy
- Reflective questions (not advice)
- Identification of cognitive patterns
- Emotional validation

**You can tune this** by editing `SYSTEM_PROMPT` in `backend/app.py` to change tone or focus.

## 🎨 Frontend design system

The interface went through a full visual modernization pass, aimed at making the journal feel warm and considered rather than a generic demo:

- **Palette and identity**: an indigo/pink range (`--primary`, `--accent`) defined as CSS variables on `:root`, with a full **dark mode** counterpart via `prefers-color-scheme` — it adapts automatically to the user's system theme with no extra JavaScript.
- **Dual typography**: [Inter](https://fonts.google.com/specimen/Inter) for UI and interaction, and [Fraunces](https://fonts.google.com/specimen/Fraunces) (an editorial serif) for headings and the reflection text — reinforces that the reflection is a distinct, slower moment within the flow.
- **Header with a radial gradient** and a curved bottom edge (instead of a hard cut), with pill-shaped navigation floating over it.
- **Micro-interactions**: subtle lift on hover for cards and buttons, an accessible focus ring on the textarea, a loading spinner, fade-in animations on view transitions.
- **Reusable components by class convention**: primary/secondary buttons, cards, mood badges, question/pattern lists — all defined once as utilities in `App.css` and reused across views.
- **Genuinely responsive**: an entries grid using `auto-fill`/`minmax` that adapts to any width, navigation that stacks into a column on mobile.
- **No external UI library**: everything is plain CSS with variables — a deliberate choice, to keep the bundle light and the design system easy to explain and modify without depending on Tailwind/MUI/etc.

### Frontend (general decisions)
- **Minimal React**: 4 components, state via hooks (`useState`/`useEffect`), no external state manager — the app is small enough that it doesn't need one.
- **Vite**: a modern, fast build tool with instant HMR in development.
- **Native `fetch`**: no extra HTTP client; `API_BASE` centralizes the backend URL.

### Backend
- **Flask**: transparent, few abstractions, easy to reason about per request.
- **Flexible persistence**:
  - **Local development**: SQLite (file `backend/diary.db`)
  - **Production AWS**: DynamoDB (with `boto3`) for scalability and serverless
- **Full CRUD over `entries`**: create, list, read, **delete** (with a manual cascading delete of the associated reflection), and reflect.
- **Direct Claude API calls** via the official `anthropic` SDK, no agentic framework — the use case is a single call with a well-designed prompt, so adding an orchestration layer would be over-engineering.
- **Configurable CORS**: accepts `*` in development, restricted to CloudFront URL in production.
- **AWS Lambda compatible**: uses `aws-wsgi` to wrap the Flask app without rewrites — the same code runs locally and on Lambda.

### AI
- **Structured JSON**: the system prompt forces Claude to return JSON with a fixed shape, parseable predictably (with a fallback to extract the block if it comes wrapped in ```` ```json ````).
- **Single-role prompt**: "humanistic psychologist, reflective mirror" — clear, tightly scoped instructions produce consistent results.
- **No memory across entries**: each reflection is generated independently from just that entry's content (improves focus and avoids the model dragging in irrelevant context).

## 📊 Use cases

- **Emotional processing**: working through anxiety, stress, difficult emotions
- **Self-awareness**: identifying recurring thought patterns
- **Support between therapy sessions**: assisted reflection between appointments
- **Structured journaling**: combines free expression with analysis

## 🚀 Next iterations

- [ ] **Multi-turn conversations**: keep reflecting on the same entry
- [ ] **Pattern dashboard**: visualize emotional patterns over time
- [ ] **Personalized recommendations**: based on your emotional history
- [ ] **Editing entries**: not just create/delete, also edit content
- [ ] **Export**: download your entries as PDF
- [ ] **Authentication**: support for multiple users

## 🔐 Privacy

### Local development
- Entries are stored **locally in your own SQLite file** (nothing is uploaded to any server)
- Only the entry content is sent to the Claude API, and only when you ask for a reflection
- Your Anthropic API key is configured locally (environment variable, never hardcoded)

### Production on AWS
- Entries are stored in **DynamoDB (your private AWS account)**, not on third-party servers
- Only the content is sent to Claude API when you generate a reflection
- The Anthropic API key is stored in **AWS Secrets Manager** (never visible in logs or code)
- The frontend is served from **private S3 + CloudFront**, with no direct public access
- CORS is restricted to your CloudFront domain (not `*`)

### General
- Deleting an entry also deletes its associated reflection — nothing is left behind in the database
- No tracking or data collection beyond what's necessary for the app to function

## 💡 How to explain this in an interview

**Short version (2 min):**
> "Diario Reflexivo is a full-stack app where you write about your emotions
> and Claude acts as a reflective mirror, returning questions and patterns.
> Flask exposes a REST API with full CRUD over entries, React provides a
> polished UI with dark mode support, and SQLite persists everything
> locally. The value is using AI not to solve problems for you, but to
> help you understand them better."

**Detailed version (5 min):**
1. **The problem**: when we're in a difficult emotional state, we need help processing it without necessarily being with someone else in that moment.
2. **The solution**: combine journaling (processing by writing) with reflective AI (Socratic questions, not advice).
3. **The architecture**:
   - Flask backend as a REST API orchestrating the logic (entry CRUD + reflection generation)
   - React frontend with simple local state (no Redux/Context, because the app doesn't need it) and a custom design system in plain CSS
   - SQLite for local persistence, no infrastructure dependencies
   - Claude API for the "emotional intelligence" piece, with prompt engineering to force a structured JSON output
4. **The technical challenge**: designing the system prompt so Claude asks reflective (Socratic) questions instead of giving advice, and robustly parsing a natural-language response into reliable JSON.
5. **Product iteration**: starting from a working MVP, two improvements were driven by real usage: (a) a full visual modernization (typography, dark mode, micro-interactions, a CSS-variable design system) to make the app feel presentable, and (b) the ability to delete entries — an incomplete CRUD (no delete) is a real UX problem in any app handling personal data.
6. **The takeaway**: it's a small project, but it demonstrates:
   - REST API design and full CRUD principles
   - End-to-end full-stack development (backend + frontend)
   - Prompt engineering for a concrete use case, with structured output and error handling
   - UX/design judgment: a coherent, accessible, responsive design system
   - Good scope discipline: knowing when *not* to add a library or abstraction (no Tailwind, no agentic frameworks, no state manager) because the problem doesn't call for it

## 📝 License

MIT — use it and modify it however you like.

---

**Made with ❤️ to process emotions more consciously.**
