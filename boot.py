#!/usr/bin/env python3
"""Boot script that handles installation and app startup"""
import subprocess
import sys
import os

# Install dependencies silently
print("[v0] Installing Flask, numpy, Pillow...")
for package in ["Flask", "numpy", "Pillow"]:
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", package],
        capture_output=True
    )
    if result.returncode != 0:
        print(f"[v0] Warning: Failed to install {package}")

print("[v0] Dependencies ready!")
print("[v0] Starting Flask app on port 5000...")
print("[v0] Visit http://localhost:5000 to access the app\n")

# Get the directory where this script is
script_dir = os.path.dirname(os.path.abspath(__file__))

# Run app.py in the script directory
subprocess.run(
    [sys.executable, os.path.join(script_dir, "app.py")],
    cwd=script_dir
)
