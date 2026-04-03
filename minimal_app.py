#!/usr/bin/env python3
"""Minimal Flask app - handles the core API without template deps"""
import subprocess
import sys
import os
import json
import time
from pathlib import Path
from typing import Dict

# Install deps first
print("[v0] Installing dependencies...")
for pkg in ["Flask", "numpy", "Pillow"]:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", pkg], capture_output=True)

print("[v0] Initializing app...")

import numpy as np
from flask import Flask, jsonify, request

CLASS_NAMES = ["Normal", "Osteopenia", "Osteoporosis"]
IMG_SIZE = (224, 224)
DATASET_URL = "https://www.kaggle.com/datasets/mohamedgobara/multi-class-knee-osteoporosis-x-ray-dataset"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"}

app = Flask(__name__)

def _extract_features(rgb_arr):
    gray = rgb_arr.mean(axis=2)
    hist, _ = np.histogram(gray, bins=16, range=(0.0, 1.0), density=True)
    return hist.astype(np.float32)

def _predict_with_statistical_model(arr):
    feat = _extract_features(arr)
    means = np.array([0.62, 0.5, 0.38], dtype=np.float32)
    spread = np.array([0.16, 0.14, 0.18], dtype=np.float32)
    signal = -np.abs(feat[:3] - means)
    signal = signal / spread
    signal = signal - signal.max()
    probs = np.exp(signal)
    return probs / (probs.sum() + 1e-8)

def _predict_image(image_path: Path):
    """Predict using fallback statistical model"""
    from PIL import Image
    
    started = time.perf_counter()
    img = Image.open(image_path).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    
    preds = [_predict_with_statistical_model(arr)]
    pred = np.mean(np.stack(preds, axis=0), axis=0)
    
    pairs = list(zip(CLASS_NAMES, [float(x) for x in pred]))
    pairs.sort(key=lambda x: x[1], reverse=True)
    top_class, top_prob = pairs[0]
    
    severity_map = {"Normal": "Low", "Osteopenia": "Medium", "Osteoporosis": "High"}
    
    report = {
        "predicted_class": top_class,
        "confidence": round(top_prob * 100, 2),
        "severity_level": severity_map.get(top_class, "Unknown"),
        "class_probabilities": [{"class": cls, "probability": round(prob * 100, 2)} for cls, prob in pairs],
        "model_info": {
            "architecture": "Statistical fallback",
            "image_size": f"{IMG_SIZE[0]}x{IMG_SIZE[1]}",
            "classes": CLASS_NAMES,
            "inference_source": "python_statistical_model",
        },
        "note": "Demo analysis using fallback statistical model.",
        "analysis_time_ms": int((time.perf_counter() - started) * 1000),
        "dataset_url": DATASET_URL,
    }
    report["guidance"] = {
        "disclaimer": "This is screening guidance only, not a diagnosis.",
        "summary": f"Analysis suggests {top_class}",
        "confidence": report["confidence"],
        "severity": report["severity_level"],
    }
    report["warning"] = "Using fallback model. Add knee_Model.h5 and TensorFlow for the trained model."
    report["mode_label"] = "Demo fallback analysis"
    return report

def _assistant_reply(report: Dict, question: str, history=None) -> str:
    """Local fallback assistant"""
    predicted_class = report.get("predicted_class", "Unknown")
    confidence = report.get("confidence", 0)
    
    q = (question or "").strip().lower()
    if not q:
        return f"Report shows: {predicted_class} at {confidence}% confidence. Ask about meaning, doctors, tests, food, or next steps."
    
    if any(x in q for x in ["doctor", "specialist", "visit"]):
        return "Start with a primary care clinician for initial review and coordination of care."
    if any(x in q for x in ["test", "scan", "dexa"]):
        return "Discuss bone-density testing (DEXA scan) and vitamin D levels with your clinician."
    if any(x in q for x in ["food", "eat", "diet"]):
        return "Focus on calcium-rich foods (dairy, fortified alternatives), vitamin D sources, and adequate protein."
    if any(x in q for x in ["exercise", "activity", "habit"]):
        return "Regular weight-bearing exercise like walking and strength training is beneficial. Consult your clinician first."
    
    return f"This screening suggests {predicted_class}. Ask me about doctors, tests, diet, exercise, or next steps."

def _gemini_reply(report: Dict, question: str, history=None) -> str:
    """Call Gemini API"""
    import json
    from urllib import error, request as urllib_request
    
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY - Gemini assistant disabled")
    
    predicted_class = report.get("predicted_class", "Unknown")
    confidence = report.get("confidence", 0)
    
    prompt = f"Knee X-ray analysis result: {predicted_class} ({confidence}% confidence). User question: {question}\n\nRespond helpfully but remind that this is screening support, not medical diagnosis."
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "topP": 0.9, "maxOutputTokens": 200},
    }
    
    req = urllib_request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    
    try:
        with urllib_request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        candidates = body.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join(part.get("text", "") for part in parts)
            return text.strip() if text else ""
    except Exception as e:
        raise RuntimeError(f"Gemini API error: {str(e)}")
    
    raise RuntimeError("No response from Gemini API")

@app.route("/")
def home():
    """Minimal home page"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Knee Disease Identifier</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }}
            h1 {{ color: #333; }}
            .section {{ margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }}
            button {{ padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }}
            button:hover {{ background: #0056b3; }}
            input[type="file"] {{ margin: 10px 0; }}
            #result {{ margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 5px; display: none; }}
            .error {{ color: red; }}
            .success {{ color: green; }}
        </style>
    </head>
    <body>
        <h1>Knee X-ray Disease Identifier</h1>
        <p>Upload a knee X-ray image for AI-powered screening analysis.</p>
        
        <div class="section">
            <h2>Upload Image</h2>
            <input type="file" id="imageInput" accept="image/png,image/jpeg">
            <button onclick="analyzeImage()">Analyze</button>
            <div id="status"></div>
        </div>
        
        <div class="section" id="result">
            <h2>Analysis Result</h2>
            <div id="reportContent"></div>
            <div id="assistantSection" style="margin-top: 20px; display: none;">
                <h3>AI Assistant</h3>
                <input type="text" id="question" placeholder="Ask about the result..." style="width: 100%; padding: 10px;">
                <button onclick="askAssistant()">Ask</button>
                <div id="assistantResponse" style="margin-top: 10px; padding: 10px; background: white; border-radius: 5px;"></div>
            </div>
        </div>
        
        <div class="section">
            <h3>About</h3>
            <p>This tool uses AI to screen knee X-rays for osteoporosis, osteopenia, and normal bone density patterns.</p>
            <p><strong>Disclaimer:</strong> This is a screening tool only, not a medical diagnosis. Always consult healthcare professionals.</p>
            <p>Dataset: <a href="https://www.kaggle.com/datasets/mohamedgobara/multi-class-knee-osteoporosis-x-ray-dataset" target="_blank">Kaggle Knee Osteoporosis Dataset</a></p>
        </div>
        
        <script>
            let currentReport = null;
            
            function analyzeImage() {
                const file = document.getElementById('imageInput').files[0];
                if (!file) {
                    alert('Please select an image');
                    return;
                }
                
                const formData = new FormData();
                formData.append('image', file);
                
                document.getElementById('status').innerHTML = '<p>Analyzing...</p>';
                
                fetch('/api/analyze', {method: 'POST', body: formData})
                    .then(r => r.json())
                    .then(data => {
                        if (data.ok) {
                            currentReport = data.report;
                            const report = data.report;
                            const html = `
                                <p><strong>Prediction:</strong> ${report.predicted_class}</p>
                                <p><strong>Confidence:</strong> ${report.confidence}%</p>
                                <p><strong>Severity:</strong> ${report.severity_level}</p>
                                <p><strong>Analysis Time:</strong> ${report.analysis_time_ms}ms</p>
                                <p><strong>Note:</strong> ${report.note}</p>
                                ${report.warning ? '<p class="error"><strong>Warning:</strong> ' + report.warning + '</p>' : ''}
                            `;
                            document.getElementById('reportContent').innerHTML = html;
                            document.getElementById('result').style.display = 'block';
                            document.getElementById('assistantSection').style.display = 'block';
                            document.getElementById('status').innerHTML = '';
                        } else {
                            document.getElementById('status').innerHTML = '<p class="error">Error: ' + (data.error || 'Unknown error') + '</p>';
                        }
                    })
                    .catch(e => document.getElementById('status').innerHTML = '<p class="error">Error: ' + e + '</p>');
            }
            
            function askAssistant() {
                if (!currentReport) return;
                const question = document.getElementById('question').value;
                if (!question) return;
                
                fetch('/api/assistant', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({report: currentReport, question: question})
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.ok) {
                            document.getElementById('assistantResponse').innerHTML = '<p>' + data.reply + '</p><p style="font-size: 0.8em; color: #666;">Source: ' + data.source + '</p>';
                        } else {
                            document.getElementById('assistantResponse').innerHTML = '<p class="error">Error: ' + (data.error || 'Unknown error') + '</p>';
                        }
                    })
                    .catch(e => document.getElementById('assistantResponse').innerHTML = '<p class="error">Error: ' + e + '</p>');
            }
            
            document.getElementById('question').onkeypress = function(e) {
                if (e.key === 'Enter') askAssistant();
            };
        </script>
    </body>
    </html>
    """
    return html

@app.route("/api/analyze", methods=["POST"])
def analyze():
    """Analyze knee X-ray image"""
    if "image" not in request.files:
        return jsonify({"ok": False, "error": "No file uploaded"}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"ok": False, "error": "Empty filename"}), 400

    ext = Path(file.filename).suffix
    if ext not in ALLOWED_EXTS:
        return jsonify({"ok": False, "error": "Unsupported file type"}), 400

    try:
        # Save to temp location
        upload_dir = Path("/tmp/knee_uploads")
        upload_dir.mkdir(exist_ok=True)
        file_path = upload_dir / file.filename
        file.save(file_path)
        
        # Analyze
        report = _predict_image(file_path)
        return jsonify({"ok": True, "report": report})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/assistant", methods=["POST"])
def assistant():
    """AI assistant for discussing results"""
    data = request.get_json(silent=True) or {}
    report = data.get("report")
    question = data.get("question", "")
    history = data.get("history", [])

    if not report:
        return jsonify({"ok": False, "error": "No report provided"}), 400

    source = "local_fallback"
    try:
        reply = _gemini_reply(report, question, history)
        source = "gemini"
    except Exception:
        reply = _assistant_reply(report, question, history)

    return jsonify({"ok": True, "reply": reply.strip(), "source": source})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    print(f"\n[v0] Flask app running!")
    print(f"[v0] Open http://localhost:{port} in your browser\n")
    app.run(host="0.0.0.0", port=port, debug=False)
