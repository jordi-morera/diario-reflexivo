import os, json, uuid
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import anthropic
import boto3
from botocore.exceptions import ClientError

app = Flask(__name__)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": frontend_origin}})

ENTRIES_TABLE = os.getenv("ENTRIES_TABLE", "DiaryEntries")
REFLECTIONS_TABLE = os.getenv("REFLECTIONS_TABLE", "Reflections")
ANTHROPIC_SECRET_NAME = os.getenv("ANTHROPIC_SECRET_NAME")

dynamodb = boto3.resource("dynamodb")
entries_table = dynamodb.Table(ENTRIES_TABLE)
reflections_table = dynamodb.Table(REFLECTIONS_TABLE)
secrets_client = boto3.client("secretsmanager")

def get_anthropic_key():
    if ANTHROPIC_SECRET_NAME:
        try:
            response = secrets_client.get_secret_value(SecretId=ANTHROPIC_SECRET_NAME)
            return response.get("SecretString") or json.loads(response.get("SecretBinary", "{}")).get("ANTHROPIC_API_KEY")
        except ClientError:
            pass
    return os.getenv("ANTHROPIC_API_KEY")

ANTHROPIC_API_KEY = get_anthropic_key()
if not ANTHROPIC_API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY no está configurada")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

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
    entry_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    entries_table.put_item(Item={
        "id": entry_id,
        "content": data.get("content"),
        "mood": data.get("mood", ""),
        "created_at": now
    })
    return jsonify({"id": entry_id, "content": data.get("content"), "mood": data.get("mood")}), 201

@app.route("/api/entries", methods=["GET"])
def list_entries():
    response = entries_table.scan(Limit=50)
    items = response.get("Items", [])
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    entries = [{"id": item["id"], "content": item.get("content", "")[:200], "mood": item.get("mood", ""), "created_at": item.get("created_at", "")} for item in items]
    return jsonify(entries), 200

@app.route("/api/entries/<entry_id>", methods=["GET"])
def get_entry(entry_id):
    response = entries_table.get_item(Key={"id": entry_id})
    item = response.get("Item")
    if not item:
        return jsonify({"error": "no encontrada"}), 404
    return jsonify({"id": item["id"], "content": item.get("content"), "mood": item.get("mood")}), 200

@app.route("/api/entries/<entry_id>", methods=["DELETE"])
def delete_entry(entry_id):
    response = entries_table.get_item(Key={"id": entry_id})
    if not response.get("Item"):
        return jsonify({"error": "no encontrada"}), 404
    reflections_table.delete_item(Key={"entry_id": entry_id})
    entries_table.delete_item(Key={"id": entry_id})
    return "", 204

@app.route("/api/entries/<entry_id>/reflect", methods=["POST"])
def generate_reflection(entry_id):
    response = entries_table.get_item(Key={"id": entry_id})
    item = response.get("Item")
    if not item:
        return jsonify({"error": "no encontrada"}), 404

    try:
        message = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Mi entrada de diario: {item.get('content')}\n\nAyúdame a procesar estas emociones."}]
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
        return jsonify({"error": str(e)}), 500

    now = datetime.utcnow().isoformat()
    reflections_table.put_item(Item={
        "entry_id": entry_id,
        "reflection_text": reflection_data.get("reflection", ""),
        "questions": reflection_data.get("questions", []),
        "patterns": reflection_data.get("patterns", []),
        "created_at": now
    })
    return jsonify({"entry_id": entry_id, "reflection": reflection_data.get("reflection"), "questions": reflection_data.get("questions", []), "patterns": reflection_data.get("patterns", [])}), 201

@app.route("/api/entries/<entry_id>/reflection", methods=["GET"])
def get_reflection(entry_id):
    response = reflections_table.get_item(Key={"entry_id": entry_id})
    item = response.get("Item")
    if not item:
        return jsonify({"error": "sin reflexión"}), 404
    return jsonify({"entry_id": entry_id, "reflection": item.get("reflection_text"), "questions": item.get("questions", []), "patterns": item.get("patterns", [])}), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    print("📔 Inicializando Diario Reflexivo...")
    print("✅ DynamoDB configurado")
    print("🚀 Servidor en http://localhost:5001")
    app.run(debug=True, port=5001)