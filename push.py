#!/usr/bin/env python3
import subprocess
import os

# Find the project directory
project_dirs = [
    "/vercel/share/v0-project",
    os.getcwd(),
    os.path.expanduser("~/knee-"),
    os.path.expanduser("~/projects/knee-"),
]

project_dir = None
for d in project_dirs:
    if os.path.exists(os.path.join(d, ".git")):
        project_dir = d
        break

if not project_dir:
    # Try finding it via git
    try:
        result = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True)
        if result.returncode == 0:
            project_dir = result.stdout.strip()
    except:
        pass

if not project_dir:
    print("[v0] Could not find project directory")
    exit(1)

os.chdir(project_dir)
print(f"[v0] Working directory: {os.getcwd()}")

# Check git status
print("\n[v0] Git status:")
subprocess.run(["git", "status"])

# Add files
print("\n[v0] Adding modified files...")
subprocess.run(["git", "add", "-A"])

# Check diff
print("\n[v0] Checking staged changes...")
subprocess.run(["git", "diff", "--cached", "--stat"])

# Commit
print("\n[v0] Committing changes...")
commit_msg = """fix: Improve error handling and optimize for Render deployment

- Add graceful TensorFlow import fallback for lightweight deployment
- Request GEMINI_API_KEY environment variable for AI assistant
- Remove tensorflow from requirements.txt to reduce build size
- Improve error handling with fallback statistical model
- Add comprehensive deployment documentation

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"""

result = subprocess.run(["git", "commit", "-m", commit_msg], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("[v0] Commit stderr:", result.stderr)

# Push
print("\n[v0] Pushing to GitHub...")
result = subprocess.run(["git", "push", "origin", "run-and-fix"], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("[v0] Push output:", result.stderr)

print("\n[v0] ✅ Changes pushed! Visit Render to trigger deployment.")
