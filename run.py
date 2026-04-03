#!/usr/bin/env python3
import subprocess
import sys
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Install dependencies
print("[v0] Installing dependencies...")
result = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "Flask", "numpy", "Pillow", "gunicorn"], 
                       capture_output=True, text=True)
if result.returncode != 0:
    print(f"[v0] Warning: {result.stderr}")
else:
    print("[v0] Dependencies installed successfully!")

# Run the Flask app
print(f"[v0] Starting Flask app from {script_dir}...")
os.system(f"{sys.executable} {script_dir}/app.py")
