import os, json
from flask import Flask, jsonify, request
from flask_cors import CORS
import anthropic
import sqlite3
from pathlib import Path

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_PATH = Path(__file__).parent / "diary.db"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY no está configurada")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        mood TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS reflections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL UNIQUE,
        reflection_text TEXT NOT NULL,
        questions TEXT,
        patterns TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries(id)
    )""")
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

SYSTEM_PROMPT = """Eres un psicólogo humanista especializado en ayudar a las personas a procesar sus emociones.
Tu rol es actuar como espejo reflexivo: ayuda a la persona a entender lo que siente, a identificar patrones,
y a descubrir sus propias respuestas.

Responde SIEMPRE en JSON con esta estructura exacta:
{"reflection": "tu reflexión empática aquí", "questions": ["pregunta 1", "pregunta 2", "pregunta 3"], "patterns": ["patrón 1", "patrón 2"]}"""

@app.route("/api/entries", methods=["POST"])
def create_entry():
    data = request.get_json()
    if not data or not data.get("content"):
        return jsonify({"error": "contenido obligatorio"}), 400
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO entries (content, mood) VALUES (?, ?)", (data.get("content"), data.get("mood")))
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()
    return jsonify({"id": entry_id, "content": data.get("content"), "mood": data.get("mood")}), 201

@app.route("/api/entries", methods=["GET"])
def list_entries():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, content, mood, created_at FROM entries ORDER BY created_at DESC LIMIT 50")
    entries = [{"id": r["id"], "content": r["content"][:200], "mood": r["mood"], "created_at": r["created_at"]} for r in cursor.fetchall()]
    conn.close()
    return jsonify(entries), 200

@app.route("/api/entries/<int:entry_id>", methods=["GET"])
def get_entry(entry_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, content, mood, created_at FROM entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "no encontrada"}), 404
    return jsonify({"id": row["id"], "content": row["content"], "mood": row["mood"]}), 200

@app.route("/api/entries/<int:entry_id>", methods=["DELETE"])
def delete_entry(entry_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM entries WHERE id = ?", (entry_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "no encontrada"}), 404
    cursor.execute("DELETE FROM reflections WHERE entry_id = ?", (entry_id,))
    cursor.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    return "", 204

@app.route("/api/entries/<int:entry_id>/reflect", methods=["POST"])
def generate_reflection(entry_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT content FROM entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "no encontrada"}), 404
    
    try:
        message = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Mi entrada de diario: {row['content']}\n\nAyúdame a procesar estas emociones."}]
        )
        
        response_text = None
        for block in message.content:
            if hasattr(block, 'text'):
                response_text = block.text
                break

        if not response_text:
            raise ValueError("No text block found in response")
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        reflection_data = json.loads(response_text)
        
    except Exception as e:
        print(f"❌ Error en reflexión: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        conn.close()
        return jsonify({"error": str(e)}), 500
    
    cursor.execute("INSERT OR REPLACE INTO reflections (entry_id, reflection_text, questions, patterns) VALUES (?, ?, ?, ?)",
        (entry_id, reflection_data.get("reflection", ""), json.dumps(reflection_data.get("questions", [])), json.dumps(reflection_data.get("patterns", []))))
    conn.commit()
    conn.close()
    return jsonify({"entry_id": entry_id, "reflection": reflection_data.get("reflection"), "questions": reflection_data.get("questions", []), "patterns": reflection_data.get("patterns", [])}), 201

@app.route("/api/entries/<int:entry_id>/reflection", methods=["GET"])
def get_reflection(entry_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT reflection_text, questions, patterns FROM reflections WHERE entry_id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "sin reflexión"}), 404
    return jsonify({"entry_id": entry_id, "reflection": row["reflection_text"], "questions": json.loads(row["questions"]), "patterns": json.loads(row["patterns"])}), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    print("📔 Inicializando Diario Reflexivo...")
    init_db()
    print("✅ BD lista")
    print("🚀 Servidor en http://localhost:5001")
    app.run(debug=True, port=5001)