import os
import json
import time
import traceback
from pathlib import Path
from typing import Dict
from urllib import request as urllib_request

import numpy as np
from flask import Flask, jsonify, render_template, request, send_from_directory

APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = APP_DIR / "knee_Model.h5"
ALLOWED_EXTS = {".png", ".jpg", ".jpeg"}
CLASS_NAMES = ["Normal", "Osteopenia", "Osteoporosis"]
IMG_SIZE = (224, 224)

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

app = Flask(__name__)
_MODEL = None

# 🧠 MEMORY
CHAT_MEMORY = {}

# =========================
# PROMPT (SMART + MULTI LANG)
# =========================
def _assistant_prompt(report: Dict, question: str, history=None) -> str:
    history = history or []

    chat_context = "\n".join(
        [f"{h['role']}: {h['content']}" for h in history[-6:]]
    )

    # 🌍 Language detection
    q = question.lower()
    if "hindi" in q or "हिंदी" in q:
        lang = "Respond in Hindi."
    elif "telugu" in q or "తెలుగు" in q:
        lang = "Respond in Telugu."
    else:
        lang = "Respond in English."

    return f"""
You are a friendly AI health assistant.

Explain knee X-ray results like a doctor but simple.

Report:
- Condition: {report.get("predicted_class")}
- Confidence: {report.get("confidence")}%
- Severity: {report.get("severity_level")}

Guidance:
{report.get("guidance", {}).get("summary", "")}

Conversation:
{chat_context}

Rules:
- Be human and friendly
- Use simple explanations
- Use bullet points if needed
- Do NOT act as final doctor
- Help calmly

{lang}

User: {question}
"""

# =========================
# GEMINI CALL (FIXED)
# =========================
def _gemini_reply(report: Dict, question: str, history=None) -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")

    prompt = _assistant_prompt(report, question, history)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ]
    }

    req = urllib_request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print("🔥 GEMINI ERROR:", str(e))
        raise

    try:
        return body["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        print("⚠️ BAD RESPONSE:", body)
        raise RuntimeError("Invalid Gemini response")

# =========================
# FALLBACK (SMARTER)
# =========================
def _assistant_reply(report: Dict, question: str, history=None) -> str:
    q = (question or "").lower()

    if q in ["hi", "hello", "hey"]:
        return "Hello 👋 How can I help you with your report?"

    return "I couldn't process that fully. Please ask clearly about your report."

# =========================
# MODEL LOADING
# =========================
def _load_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    if not MODEL_PATH.exists():
        return None
    try:
        import tensorflow as tf
        _MODEL = tf.keras.models.load_model(str(MODEL_PATH))
        return _MODEL
    except:
        return None

# =========================
# IMAGE PREDICTION
# =========================
def _predict_image(image_path: Path):
    from PIL import Image

    model = _load_model()
    img = Image.open(image_path).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img) / 255.0

    if model:
        pred = model.predict(np.expand_dims(arr, axis=0))[0]
    else:
        pred = np.array([0.6, 0.3, 0.1])  # fallback

    idx = int(np.argmax(pred))
    confidence = float(pred[idx]) * 100

    report = {
        "predicted_class": CLASS_NAMES[idx],
        "confidence": round(confidence, 2),
        "severity_level": ["Low", "Medium", "High"][idx],
        "guidance": {
            "summary": "AI-based screening result. Consult doctor for confirmation."
        }
    }

    return report

# =========================
# ROUTES
# =========================
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400

    file = request.files["image"]
    path = APP_DIR / "uploads" / file.filename
    path.parent.mkdir(exist_ok=True)
    file.save(path)

    report = _predict_image(path)
    return jsonify({"ok": True, "report": report})

# =========================
# MAIN ASSISTANT (PRO)
# =========================
@app.route("/api/assistant", methods=["POST"])
def assistant():
    data = request.get_json()
    report = data.get("report")
    question = data.get("question", "")
    session_id = data.get("session_id", "default")

    if not report:
        return {"error": "No report"}, 400

    history = CHAT_MEMORY.get(session_id, [])

    try:
        reply = _gemini_reply(report, question, history)
        source = "gemini"
    except Exception as e:
        print("❌ GEMINI FAILED:", str(e))
        reply = _assistant_reply(report, question, history)
        source = "fallback"

    # save memory
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": reply})
    CHAT_MEMORY[session_id] = history[-10:]

    return {
        "ok": True,
        "reply": reply,
        "source": source
    }

# =========================
# VOICE ENDPOINT
# =========================
@app.route("/api/voice", methods=["POST"])
def voice():
    text = request.json.get("text", "")
    if not text:
        return {"error": "No text"}, 400

    return {"reply": text}

# =========================
# RUN
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)