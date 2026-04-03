#!/usr/bin/env python3
"""Launch the Flask app with all dependencies"""
import subprocess
import sys
import os
import time

# First install all dependencies quietly
print("[v0] Installing dependencies...")
deps = ["Flask", "numpy", "Pillow"]
for dep in deps:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", dep], capture_output=True)

print("[v0] Loading app...")
time.sleep(1)

# Read and execute the app.py file where it is
try:
    with open("app.py", "r") as f:
        app_code = f.read()
    # Execute the app
    exec(app_code)
except FileNotFoundError:
    print("[v0] ERROR: app.py not found in current directory")
    print(f"[v0] Current dir: {os.getcwd()}")
    print(f"[v0] Files: {os.listdir('.')}")
