import subprocess
import sys
import os

cwd = os.getcwd()
print(f"[v0] Current directory: {cwd}")
print(f"[v0] Files in directory: {os.listdir(cwd)}")

# Install deps
print("[v0] Installing dependencies...")
r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "Flask", "numpy", "Pillow"])
if r.returncode == 0:
    print("[v0] Installed successfully. Starting app...")
    exec(open(os.path.join(cwd, "app.py")).read())
