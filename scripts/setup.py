#!/usr/bin/env python3
import subprocess
import sys

# Install dependencies
print("[v0] Installing dependencies...")
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "Flask", "numpy", "Pillow", "gunicorn"])
print("[v0] Dependencies installed successfully!")

# Run the Flask app
print("[v0] Starting Flask app...")
subprocess.call([sys.executable, "app.py"])
