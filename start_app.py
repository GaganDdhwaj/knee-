#!/usr/bin/env python3
import subprocess
import sys
import os

# Install deps
print("[v0] Installing Flask, numpy, Pillow...")
for pkg in ["Flask", "numpy", "Pillow"]:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", pkg], capture_output=True)

print("[v0] Starting Knee Disease Identifier on port 5000...")
print("[v0] Visit http://localhost:5000\n")

# Try to find and run app.py
# First check current directory 
if os.path.exists("app.py"):
    os.system(f"{sys.executable} app.py")
# Then check parent directories
elif os.path.exists("../app.py"):
    os.chdir("..")
    os.system(f"{sys.executable} app.py")
else:
    print("[v0] ERROR: Could not find app.py")
    print(f"[v0] Current directory: {os.getcwd()}")
    print(f"[v0] Files: {os.listdir('.')[:5]}")
