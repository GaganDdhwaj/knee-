#!/usr/bin/env python3
"""Simple script to install deps and run app.py"""
import subprocess
import sys

print("[v0] Installing dependencies...")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "Flask", "numpy", "Pillow"], check=True)
print("[v0] Dependencies installed!")

print("[v0] Starting app on port 5000...")
print("[v0] Open http://localhost:5000 to access the app")

# Import and run the actual app
import app
# app.app.run will be called since app.py has if __name__ == "__main__"
