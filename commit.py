#!/usr/bin/env python3
import subprocess
import os

os.chdir("/vercel/share/v0-project")

# Check git status
print("[v0] Checking git status...")
result = subprocess.run(["git", "status"], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)

# Add modified files
print("\n[v0] Adding changes...")
subprocess.run(["git", "add", "app.py", "requirements.txt", "FIXES_APPLIED.md"], check=True)

# Check what's staged
print("\n[v0] Staged changes:")
result = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True)
print(result.stdout)

# Commit
print("\n[v0] Creating commit...")
commit_msg = "fix: Improve error handling and add fallback for TensorFlow\n\n- Add graceful TensorFlow import fallback\n- Request GEMINI_API_KEY environment variable\n- Optimize dependencies for faster Render deployment\n- Add comprehensive fix documentation"
result = subprocess.run(["git", "commit", "-m", commit_msg], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)

# Show the commit
print("\n[v0] Latest commit:")
result = subprocess.run(["git", "log", "--oneline", "-1"], capture_output=True, text=True)
print(result.stdout)

print("\n[v0] Ready to push to Render!")
