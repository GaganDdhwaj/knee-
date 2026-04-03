#!/usr/bin/env python3
import subprocess
import sys

print("[v0] Installing Flask, numpy, Pillow...")
result = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "Flask", "numpy", "Pillow", "gunicorn"], 
                       cwd="/vercel/share/v0-project")

if result.returncode == 0:
    print("[v0] Dependencies installed!")
    print("[v0] Starting Flask app on port 5000...")
    subprocess.run([sys.executable, "/vercel/share/v0-project/app.py"], cwd="/vercel/share/v0-project")
else:
    print("[v0] Failed to install dependencies")
    sys.exit(1)
