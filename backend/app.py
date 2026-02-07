from flask import Flask, jsonify, request
from database import db
from models import Chat, Message
from dotenv import load_dotenv
import os

import logging
import requests
import json
# Optional providers
try:
    from google import genai
    HAS_GENAI = True
except Exception:
    HAS_GENAI = False

# Load environment variables
load_dotenv()

# Serve frontend
static_folder = os.path.join(os.path.dirname(__file__), '..', 'frontend')
app = Flask(__name__, static_folder=static_folder, static_url_path='')

# Enable CORS
try:
    from flask_cors import CORS
    CORS(app)
except Exception:
    pass

# Database config
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///chat.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Init DB
db.init_app(app)
with app.app_context():
    db.create_all()

# Logging
logging.basicConfig(level=logging.INFO)

# --------------------------------------------------
# SYSTEM INSTRUCTIONS (BETTER RESPONSE LOGIC)
# --------------------------------------------------
SYSTEM_INSTRUCTIONS = (
    "You are a friendly AI assistant like ChatGPT.\n"
    "Rules:\n"
    "- Give clean, well-spaced answers\n"
    "- Use bullet points or tables when useful\n"
    "- Do NOT use # symbols\n"
    "- Keep answers clear and readable\n"
    "- Be concise and helpful\n"
)

def build_prompt(user_message: str) -> str:
    """
    Inject system instructions before the user message
    """
    return f"{SYSTEM_INSTRUCTIONS}\n\nUser:\n{user_message}"

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/chats', methods=['GET'])
def list_chats():
    chats = Chat.query.order_by(Chat.created_at.desc()).all()
    return jsonify([c.to_dict() for c in chats])

@app.route('/chats/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({"error": "Chat not found"}), 404
    messages = [m.to_dict() for m in chat.messages.order_by(Message.created_at.asc()).all()]
    return jsonify({"messages": messages})

def generate_response(user_message: str) -> str:
    """
    Provider priority:
    1. OpenRouter
    2. Gemini (fallback)
    """
    prompt = build_prompt(user_message)

    # ---------- OPENROUTER (PRIMARY) ----------
    if os.getenv("OPENROUTER_API_KEY"):
        try:
            headers = {
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("SITE_URL", "http://localhost:5000"),
                "X-Title": os.getenv("SITE_NAME", "CGT AI Chat App")
            }
            
            payload = {
                "model": "tngtech/deepseek-r1t2-chimera:free",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 512,
                "temperature": 0.2
            }
            
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"].strip()
            else:
                app.logger.warning("OpenRouter API error: %s", response.text)
                raise Exception(f"OpenRouter returned status {response.status_code}")

        except Exception as e:
            app.logger.warning("OpenRouter failed, falling back to Gemini: %s", e)

    # ---------- GEMINI (FALLBACK) ----------
    if HAS_GENAI and os.getenv("GEMINI_API_KEY"):
        try:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

            resp = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt
            )

            text = getattr(resp, "text", None)
            if not text:
                text = resp.candidates[0].output

            return text.strip()

        except Exception as e:
            app.logger.warning("Gemini provider failed: %s", e)

    # ---------- FINAL FALLBACK ----------
    return "All AI providers are currently unavailable. Please try again later."

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json() or {}
        if "message" not in data:
            return jsonify({"error": "Missing 'message'"}), 400

        user_message = data["message"]
        chat_id = data.get("chat_id")

        chat = Chat.query.get(chat_id) if chat_id else None
        if not chat:
            chat = Chat(title=user_message[:200])
            db.session.add(chat)
            db.session.commit()

        db.session.add(Message(
            chat_id=chat.id,
            role="user",
            content=user_message
        ))
        db.session.commit()

        ai_reply = generate_response(user_message)

        db.session.add(Message(
            chat_id=chat.id,
            role="assistant",
            content=ai_reply
        ))
        db.session.commit()

        return jsonify({
            "chat_id": chat.id,
            "response": ai_reply
        })

    except Exception as e:
        app.logger.exception("Chat error")
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    debug = os.getenv("FLASK_ENV", "production") != "production"
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=debug
    )
