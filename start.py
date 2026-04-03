import sys
import subprocess

# Try to import required modules, install if missing
modules = ['flask', 'numpy', 'PIL']
for module in modules:
    try:
        __import__(module)
    except ImportError:
        print(f"[v0] Installing {module}...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', module.replace('PIL', 'Pillow')])

# Now run the app
print("[v0] Starting app...")
exec(open('app.py').read())
