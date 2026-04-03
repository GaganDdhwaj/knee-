#!/usr/bin/env python3
"""Find and run the Flask app"""
import os
import sys
import subprocess
from pathlib import Path

# Look for app.py in common locations
search_paths = [
    os.getcwd(),
    "/vercel/share/v0-project",
    os.path.expanduser("~/v0-project"),
    os.path.expanduser("~/project"),
    "/app",
    "/workspace",
]

app_path = None
for search_path in search_paths:
    potential = Path(search_path) / "app.py"
    if potential.exists():
        app_path = potential.parent
        break

# Also try searching from current directory upwards
if not app_path:
    current = Path.cwd()
    for parent in [current] + list(current.parents):
        if (parent / "app.py").exists():
            app_path = parent
            break

if app_path:
    print(f"[v0] Found app at: {app_path}")
    os.chdir(app_path)
    
    # Install deps
    print("[v0] Installing dependencies...")
    for dep in ["Flask", "numpy", "Pillow"]:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", dep], capture_output=True)
    
    # Run app
    print(f"[v0] Starting app from {os.getcwd()}...")
    subprocess.run([sys.executable, "app.py"])
else:
    print("[v0] ERROR: Could not find app.py")
    print(f"[v0] Searched: {search_paths}")
    print(f"[v0] Current directory: {os.getcwd()}")
