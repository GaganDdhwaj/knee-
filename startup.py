#!/usr/bin/env python3
"""
Startup script for Knee Disease Identifier Flask app
"""
import subprocess
import sys
import os

# Ensure we're in the right directory
script_location = "/vercel/share/v0-project"
if os.path.exists(script_location):
    os.chdir(script_location)
    print(f"[v0] Changed to {os.getcwd()}")
else:
    print(f"[v0] Warning: {script_location} not found, using current directory: {os.getcwd()}")

# Install dependencies
print("[v0] Installing required Python packages...")
deps = ["Flask", "numpy", "Pillow", "gunicorn"]
for dep in deps:
    print(f"[v0] Installing {dep}...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", dep],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"[v0] Warning installing {dep}: {result.stderr}")

print("[v0] Starting Flask app on port 5000...")
print("[v0] Visit http://localhost:5000 in your browser")

# Run the Flask app
subprocess.run([sys.executable, "-m", "flask", "run", "--host", "0.0.0.0"])
