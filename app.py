import os
import time
import traceback
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, render_template, request, send_from_directory


APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = APP_DIR / "knee_Model.h5"
ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"}
CLASS_NAMES = ["Normal", "Osteopenia", "Osteoporosis"]
IMG_SIZE = (224, 224)
DATASET_URL = "https://www.kaggle.com/datasets/mohamedgobara/multi-class-knee-osteoporosis-x-ray-dataset"

app = Flask(__name__)
_MODEL = None


def _build_guidance(predicted_class: str, confidence: float, source: str):
    confidence_band = (
        "very_high" if confidence >= 85 else "high" if confidence >= 70 else "moderate" if confidence >= 50 else "low"
    )

    base = {
        "disclaimer": "This is screening guidance only, not a diagnosis or treatment plan.",
        "exam_recommended": True,
        "urgent_banner": "",
        "doctor_to_visit": [],
        "tests_to_discuss": [],
        "when_to_seek_care": [
            "Get medical care promptly for sudden severe knee pain, inability to bear weight, visible deformity, or a recent fracture.",
            "Arrange clinician review if symptoms persist, worsen, or do not match the screening result.",
        ],
    }

    if predicted_class == "Normal":
        guidance = {
            "summary": "The image pattern is closer to the normal class, so the goal is maintaining bone and joint health.",
            "foods_to_eat": [
                "Calcium-rich foods such as milk, yogurt, cheese, calcium-set tofu, or fortified plant milk.",
                "Vitamin D and protein sources such as eggs, fish, fortified foods, beans, lentils, and yogurt.",
                "A balanced plate with leafy greens, fruit, whole grains, and adequate daily protein.",
            ],
            "habits": [
                "Keep regular weight-bearing exercise such as walking, stair climbing, or light resistance training.",
                "Avoid smoking and keep alcohol intake moderate.",
                "Maintain a healthy body weight and regular activity pattern.",
            ],
            "next_steps": [
                "Continue routine checkups and discuss bone health if you have strong risk factors or chronic steroid use.",
                "Focus on prevention rather than medication unless your clinician finds other risk factors.",
            ],
            "doctor_to_visit": [
                "Primary care clinician or family doctor for routine bone-health review if you have risk factors."
            ],
            "tests_to_discuss": [
                "Routine review of calcium and vitamin D intake.",
                "Bone-density testing only if your clinician feels risk factors justify it."
            ],
        }
    elif predicted_class == "Osteopenia":
        guidance = {
            "summary": "The image pattern is closer to osteopenia, so the focus is slowing bone loss and reducing progression risk.",
            "foods_to_eat": [
                "Prioritize calcium-rich foods daily, including dairy or fortified alternatives, tofu, almonds, and leafy greens.",
                "Increase vitamin D intake from fortified foods, eggs, or oily fish if those fit your diet.",
                "Support bone and muscle health with adequate protein from beans, lentils, dairy, fish, chicken, soy, or eggs.",
            ],
            "habits": [
                "Do regular weight-bearing and muscle-strengthening exercise, such as brisk walking, squats, step-ups, or resistance bands.",
                "Work on fall prevention with balance training, footwear, and home safety.",
                "Avoid smoking and limit alcohol.",
            ],
            "next_steps": [
                "Discuss bone-health review with a clinician, especially if you have fracture risk factors or worsening symptoms.",
                "Ask whether calcium or vitamin D supplementation is appropriate for you.",
            ],
            "doctor_to_visit": [
                "Primary care clinician for initial review.",
                "Endocrinologist or rheumatologist if bone loss is progressing or risk factors are complex."
            ],
            "tests_to_discuss": [
                "Bone-density scan such as a DEXA scan.",
                "Vitamin D level and other bone-health labs if your clinician recommends them."
            ],
        }
    else:
        guidance = {
            "summary": "The image pattern is closer to osteoporosis, so the result should be reviewed medically rather than managed only with lifestyle changes.",
            "foods_to_eat": [
                "Aim for consistent calcium intake from dairy or fortified alternatives, tofu, sardines with bones, or leafy greens.",
                "Include vitamin D sources such as fortified foods, eggs, and oily fish if tolerated.",
                "Keep protein intake adequate to support muscle strength and reduce frailty risk.",
            ],
            "habits": [
                "Use safe weight-bearing or strengthening exercise only within your comfort and clinician guidance if pain or fracture risk is significant.",
                "Prioritize fall prevention, supportive footwear, home hazard reduction, and balance work.",
                "Avoid smoking and keep alcohol intake low.",
            ],
            "next_steps": [
                "Arrange clinician review to discuss fracture risk, bone-density testing, and whether medication or supplements are needed.",
                "Do not rely on this screening result alone if you have pain, reduced mobility, or prior fractures.",
            ],
            "urgent_banner": "High-priority follow-up: this result warrants timely medical review. If you also have severe pain, recent injury, swelling, deformity, or cannot bear weight, seek urgent medical care immediately.",
            "doctor_to_visit": [
                "Primary care clinician for immediate coordination of care.",
                "Orthopaedic surgeon or sports-medicine orthopaedic specialist if there is trauma, deformity, inability to bear weight, or possible fracture.",
                "Endocrinologist or rheumatologist for osteoporosis management and fracture-risk reduction."
            ],
            "tests_to_discuss": [
                "Bone-density scan such as a DEXA scan.",
                "Fracture evaluation or urgent X-ray review if there has been a fall, trauma, or sudden severe pain.",
                "Vitamin D, calcium, and other bone-health labs if your clinician recommends them."
            ],
        }

    if confidence_band in {"low", "moderate"}:
        guidance["confidence_note"] = (
            "Confidence is limited, so image quality, positioning, and clinical history matter more than usual."
        )
    else:
        guidance["confidence_note"] = (
            "Confidence is relatively stronger, but the result still needs clinical interpretation."
        )

    if source != "trained_model":
        guidance["model_note"] = (
            "This report used the built-in fallback model, so treat it as demo screening output only."
        )
    else:
        guidance["model_note"] = "This report used the loaded trained model."

    guidance.update(base)
    return guidance


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
    except Exception:
        return None


def _extract_features(rgb_arr):
    gray = rgb_arr.mean(axis=2)
    hist, _ = np.histogram(gray, bins=16, range=(0.0, 1.0), density=True)
    gx = np.abs(np.diff(gray, axis=1)).mean()
    gy = np.abs(np.diff(gray, axis=0)).mean()
    return np.concatenate(
        [
            hist.astype(np.float32),
            np.array(
                [gray.mean(), gray.std(), gray.min(), gray.max(), float(gx), float(gy)],
                dtype=np.float32,
            ),
        ]
    )


def _predict_with_statistical_model(arr):
    feat = _extract_features(arr)
    means = np.array([0.62, 0.5, 0.38], dtype=np.float32)
    spread = np.array([0.16, 0.14, 0.18], dtype=np.float32)
    intensity = float(feat[16])
    texture = float((feat[20] + feat[21]) / 2.0)
    signal = np.array(
        [
            -abs(intensity - means[0]) - texture * 0.6,
            -abs(intensity - means[1]) - abs(texture - 0.12) * 0.5,
            -abs(intensity - means[2]) + texture * 0.4,
        ],
        dtype=np.float32,
    )
    signal = signal / spread
    signal = signal - signal.max()
    probs = np.exp(signal)
    return probs / (probs.sum() + 1e-8)


def _predict_image(image_path: Path):
    started = time.perf_counter()
    model = _load_model()
    from PIL import Image

    target_size = IMG_SIZE
    if model is not None and getattr(model, "input_shape", None):
        try:
            h, w = int(model.input_shape[1]), int(model.input_shape[2])
            if h > 0 and w > 0:
                target_size = (h, w)
        except Exception:
            target_size = IMG_SIZE

    img = Image.open(image_path).convert("RGB").resize(target_size)
    arr = np.array(img, dtype=np.float32) / 255.0
    views = [arr, np.fliplr(arr), np.clip(arr * 0.92, 0.0, 1.0), np.clip(arr * 1.08, 0.0, 1.0)]

    if model is not None:
        batches = np.stack(views, axis=0)
        pred = model.predict(batches, verbose=0).mean(axis=0)
        pairs = list(zip(CLASS_NAMES, [float(x) for x in pred]))
        source = "trained_model"
    else:
        preds = [_predict_with_statistical_model(v) for v in views]
        pred = np.mean(np.stack(preds, axis=0), axis=0)
        pairs = list(zip(CLASS_NAMES, [float(x) for x in pred]))
        source = "python_statistical_model"

    pairs.sort(key=lambda x: x[1], reverse=True)
    top_class, top_prob = pairs[0]
    severity_map = {"Normal": "Low", "Osteopenia": "Medium", "Osteoporosis": "High"}
    report = {
        "predicted_class": top_class,
        "confidence": round(top_prob * 100, 2),
        "severity_level": severity_map.get(top_class, "Unknown"),
        "class_probabilities": [
            {"class": cls, "probability": round(prob * 100, 2)} for cls, prob in pairs
        ],
        "model_info": {
            "architecture": "Notebook-compatible classifier",
            "image_size": f"{target_size[0]}x{target_size[1]}",
            "classes": CLASS_NAMES,
            "inference_source": source,
        },
        "note": "Screening output only. Not a medical diagnosis.",
        "analysis_time_ms": int((time.perf_counter() - started) * 1000),
        "views_used": len(views),
        "dataset_url": DATASET_URL,
    }
    report["guidance"] = _build_guidance(top_class, report["confidence"], source)
    if source == "python_statistical_model":
        report["warning"] = "Using the built-in fallback model. Add knee_Model.h5 for your trained model."
        report["mode_label"] = "Demo fallback analysis"
    else:
        report["mode_label"] = "Trained model analysis"
    return report


@app.route("/")
def home():
    return render_template("index.html", dataset_url=DATASET_URL)


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(APP_DIR / "static", "favicon.ico", mimetype="image/x-icon")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "No file uploaded. Use form-data key 'image'."}), 400

    uploaded = request.files["image"]
    if not uploaded.filename:
        return jsonify({"error": "Empty filename."}), 400

    ext = Path(uploaded.filename).suffix
    if ext not in ALLOWED_EXTS:
        return jsonify({"error": "Unsupported file type."}), 400

    upload_dir = APP_DIR / "uploads"
    upload_dir.mkdir(exist_ok=True)
    target_path = upload_dir / uploaded.filename
    uploaded.save(target_path)

    try:
        report = _predict_image(target_path)
        return jsonify({"ok": True, "report": report})
    except Exception as exc:
        return jsonify(
            {
                "ok": False,
                "error": str(exc),
                "details": traceback.format_exc().splitlines()[-1],
                "setup": {
                    "model_file_required": str(MODEL_PATH),
                    "pip_install": "python -m pip install tensorflow pillow numpy",
                    "dataset_url": DATASET_URL,
                },
            }
        ), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
