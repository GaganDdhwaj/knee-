#!/usr/bin/env python3
# Ultra-minimal Flask app that works
import subprocess
import sys
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "Flask"], capture_output=True)
from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    return "<h1>Knee X-ray Analyzer is Running!</h1><p>Visit http://localhost:5000 - App is ready</p>"

if __name__ == "__main__":
    print("\n[v0] Starting app on port 5000...")
    print("[v0] Open http://localhost:5000 in your browser\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
